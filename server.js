const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const cors = require('cors');

// Importar módulos de seguridad
const { SECURITY_CONFIG } = require('./config/security.config');
const { helmetConfig, additionalSecurityHeaders } = require('./middleware/security');
const {
  generalLimiter,
  proxyLimiter,
  speedLimiter,
  blacklistMiddleware,
  attackDetectionMiddleware
} = require('./middleware/rateLimiter');
const {
  proxyValidationRules,
  handleValidationErrors
} = require('./middleware/validator');
const { sanitizeMiddleware } = require('./middleware/sanitizer');
const { securityLogger, requestLogger } = require('./utils/logger');
const { connectDB } = require('./config/database');
const { optionalAuth } = require('./middleware/auth');
const errorHandler = require('./middleware/errorHandler');

// Rutas
const chatRoutes = require('./routes/chat');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = SECURITY_CONFIG.PORT;

// Trust proxy for Railway (handles X-Forwarded-For header)
app.set('trust proxy', 1);

// ============================================================================
// CONFIGURACIÓN DE SEGURIDAD - MIDDLEWARE
// ============================================================================

// Logging de requests (primero para capturar todo)
app.use(requestLogger);

// Headers de seguridad con Helmet
app.use(helmetConfig);
app.use(additionalSecurityHeaders);

// Configuración CORS segura
const corsOptions = {
  origin: '*', // Permite cualquier origen por ahora
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Parsing de JSON con límites de seguridad
app.use(express.json({
  limit: SECURITY_CONFIG.PAYLOAD.MAX_SIZE
}));

// Servir archivos estáticos (Production build)
app.use(express.static(path.join(__dirname, 'dist')));

// Middleware de blacklist (verificar IPs bloqueadas)
app.use(blacklistMiddleware);

// Detección de ataques
app.use(attackDetectionMiddleware);

// Sanitización general de inputs
app.use(sanitizeMiddleware);

// Rate limiting general
app.use(generalLimiter);

// Throttling para prevenir ataques de fuerza bruta
app.use(speedLimiter);

// ============================================================================
// API ROUTES
// ============================================================================

// Auth Routes
app.use('/api/v2/auth', require('./routes/auth_v2'));
app.use('/api/auth', authRoutes);

// Feature Routes
app.use('/api/ocr', require('./routes/ocr'));
app.use('/api', chatRoutes); // Mounts /chat, /chats, etc.

// Configuración para proxy (usando configuración centralizada)
const REQUEST_TIMEOUT = SECURITY_CONFIG.PAYLOAD.REQUEST_TIMEOUT_MS;
const MAX_RESPONSE_SIZE = SECURITY_CONFIG.PAYLOAD.MAX_RESPONSE_SIZE;
const ALLOWED_DOMAINS = SECURITY_CONFIG.PROXY.ALLOWED_DOMAINS;

function isAllowedDomain(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    return ALLOWED_DOMAINS.some(domain => {
      return hostname === domain || hostname.endsWith('.' + domain);
    });
  } catch (e) {
    return false;
  }
}

function sanitizeUrl(url) {
  try {
    const urlObj = new URL(url);
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Protocolo no permitido');
    }
    return urlObj.toString();
  } catch (e) {
    throw new Error('URL inválida');
  }
}

async function fetchWithTimeout(url, options = {}, timeout = REQUEST_TIMEOUT) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Timeout: La solicitud tardó demasiado tiempo');
    }
    throw error;
  }
}

// Proxy API route con validación y rate limiting
app.post('/api/proxy',
  proxyLimiter, // Rate limiting específico para proxy
  proxyValidationRules, // Validación de URLs
  handleValidationErrors, // Manejo de errores de validación
  async (req, res, next) => {
    const startTime = Date.now();
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.headers['client-ip'] ||
      req.ip ||
      'unknown';

    try {
      securityLogger.info('Proxy request started', {
        ip: clientIP,
        url: req.body.url?.substring(0, 100), // Log solo el inicio de la URL
        userAgent: req.headers['user-agent']
      });

      const body = req.body;

      let sanitizedUrl;
      try {
        sanitizedUrl = sanitizeUrl(body.url);
      } catch (e) {
        securityLogger.validationFailed('/api/proxy', ['Invalid URL format'], {
          ip: clientIP,
          url: body.url?.substring(0, 100)
        });
        return res.status(400).json({ error: e.message });
      }

      if (!isAllowedDomain(sanitizedUrl)) {
        securityLogger.unauthorizedAccess(clientIP, '/api/proxy', {
          reason: 'Domain not allowed',
          url: sanitizedUrl
        });
        return res.status(403).json({
          error: 'Dominio no permitido',
          message: 'Solo se permiten solicitudes a repositorios académicos y bases de datos científicas autorizadas'
        });
      }

      const response = await fetchWithTimeout(sanitizedUrl, {
        headers: SECURITY_CONFIG.PROXY.HEADERS
      });

      if (!response.ok) {
        securityLogger.warn('Proxy request failed', {
          ip: clientIP,
          url: sanitizedUrl,
          status: response.status
        });

        if (response.status === 404) {
          return res.status(404).json({
            error: 'Recurso no encontrado',
            message: 'La URL solicitada no existe o no está disponible'
          });
        }

        if (response.status === 403 || response.status === 401) {
          return res.status(403).json({
            error: 'Acceso denegado',
            message: 'El sitio web requiere autenticación o tiene protección anti-scraping'
          });
        }

        return res.status(response.status).json({
          error: `Error HTTP ${response.status}`,
          message: 'No se pudo obtener el contenido del sitio web'
        });
      }

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      if (text.length > MAX_RESPONSE_SIZE) {
        return res.status(413).json({
          error: 'Contenido demasiado grande',
          message: 'El documento excede el tamaño máximo permitido'
        });
      }

      let responseData;
      if (contentType.includes('application/json')) {
        try {
          responseData = {
            type: 'json',
            content: JSON.parse(text)
          };
        } catch (e) {
          responseData = {
            type: 'text',
            content: text
          };
        }
      } else {
        responseData = {
          type: contentType.includes('xml') ? 'xml' : 'html',
          content: text
        };
      }

      // Log de éxito
      const duration = Date.now() - startTime;
      securityLogger.successfulRequest('/api/proxy', duration, {
        ip: clientIP,
        url: sanitizedUrl,
        size: text.length
      });

      res.set('Cache-Control', 'public, max-age=3600');
      res.json({
        success: true,
        url: sanitizedUrl,
        data: responseData,
        contentType: contentType,
        size: text.length
      });

    } catch (error) {
      next(error);
    }
  });

// Endpoint para información de usuario (con autenticación opcional)
app.get('/api/v4/user', optionalAuth, (req, res) => {
  if (req.user) {
    res.json({
      authenticated: true,
      user: {
        id: req.user.id,
        email: req.user.email,
        name: req.user.name,
        role: req.user.role
      }
    });
  } else {
    res.json({
      authenticated: false,
      user: null
    });
  }
});

// SPA Fallback: redirigir todas las rutas al index.html del build
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// GLOBAL ERROR HANDLER
app.use(errorHandler);

/**
 * INICIO DEL SERVIDOR CON LOGGING DE SEGURIDAD
 */
const server = app.listen(PORT, async () => {
  await connectDB(); // Connect to Database on start

  securityLogger.info('Server started', {
    port: PORT,
    environment: SECURITY_CONFIG.NODE_ENV,
    allowedOrigin: SECURITY_CONFIG.ALLOWED_ORIGIN
  });
  console.log(`🚀 Neotesis Perú Server corriendo en puerto ${PORT}`);
  console.log(`🔒 Seguridad activada - Modo: ${SECURITY_CONFIG.NODE_ENV}`);
  console.log(`🌐 CORS permitido: ${SECURITY_CONFIG.ALLOWED_ORIGIN}`);
});

// Increase timeout to 10 minutes for long OCR jobs
server.setTimeout(600000);

// Graceful shutdown
process.on('SIGTERM', () => {
  securityLogger.info('Server shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  securityLogger.info('Server interrupted');
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  securityLogger.error('Uncaught exception', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  securityLogger.error('Unhandled rejection', { reason, promise });
  process.exit(1);
});
