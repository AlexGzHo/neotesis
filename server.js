const express = require('express');
const fetch = require('node-fetch');
const path = require('path');
const cors = require('cors');

// Importar módulos de seguridad
const { SECURITY_CONFIG } = require('./config/security.config');
const { helmetConfig, additionalSecurityHeaders } = require('./middleware/security');
const {
  generalLimiter,
  strictLimiter,
  proxyLimiter,
  speedLimiter,
  blacklistMiddleware,
  attackDetectionMiddleware
} = require('./middleware/rateLimiter');
const {
  chatValidationRules,
  proxyValidationRules,
  handleValidationErrors,
  sanitizeInput
} = require('./middleware/validator');
const { sanitizeMiddleware } = require('./middleware/sanitizer');
const { securityLogger, requestLogger } = require('./utils/logger');
const { alertPresets } = require('./utils/alerting');
const { connectDB } = require('./config/database');
const { User, Chat, Message } = require('./models');
const { authMiddleware, JWT_SECRET, requireAuth, optionalAuth } = require('./middleware/auth');
const authRoutes = require('./routes/auth');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
// CONFIGURACIÓN DE LA APLICACIÓN
// ============================================================================

// Configuración de Groq API
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const PRIMARY_MODEL = SECURITY_CONFIG.AI_MODELS.PRIMARY;
const SECONDARY_MODEL = SECURITY_CONFIG.AI_MODELS.SECONDARY;
const MAX_CONTEXT_LENGTH = SECURITY_CONFIG.VALIDATION.PDF_MAX_CONTEXT_LENGTH;

// Rate limiting legacy (reemplazado por middleware avanzado)
// Mantener compatibilidad con código existente
const MAX_REQUESTS_PER_IP = SECURITY_CONFIG.QUOTAS.MAX_REQUESTS_PER_DAY;
const RATE_LIMIT_WINDOW = SECURITY_CONFIG.QUOTAS.QUOTA_RESET_TIME_MS;

// Almacenamiento legacy para cuotas de usuario (frontend)
// El rate limiting avanzado está en middleware/rateLimiter.js
const requestLog = new Map();

/**
 * Limpia entradas antiguas del log de requests
 */
function cleanupOldEntries() {
  const now = Date.now();
  for (const [ip, data] of requestLog.entries()) {
    if (now - data.firstRequest >= RATE_LIMIT_WINDOW) {
      requestLog.delete(ip);
    }
  }
}

/**
 * Genera un título para el chat basado en el primer mensaje
 */
function generateChatTitle(firstMessage) {
  if (!firstMessage || typeof firstMessage !== 'string') {
    return 'Nuevo Chat';
  }

  // Tomar las primeras 50 caracteres y limpiar
  const title = firstMessage
    .substring(0, 50)
    .trim()
    .replace(/\s+/g, ' ');

  return title.length < firstMessage.length ? title + '...' : title;
}

/**
 * Verifica si una IP ha excedido el rate limit
 */
function checkRateLimit(ip) {
  cleanupOldEntries();

  const now = Date.now();
  const ipData = requestLog.get(ip);

  if (!ipData) {
    requestLog.set(ip, {
      count: 1,
      firstRequest: now
    });
    return {
      allowed: true,
      remaining: MAX_REQUESTS_PER_IP - 1,
      resetTime: now + RATE_LIMIT_WINDOW
    };
  }

  if (now - ipData.firstRequest >= RATE_LIMIT_WINDOW) {
    requestLog.set(ip, {
      count: 1,
      firstRequest: now
    });
    return {
      allowed: true,
      remaining: MAX_REQUESTS_PER_IP - 1,
      resetTime: now + RATE_LIMIT_WINDOW
    };
  }

  if (ipData.count >= MAX_REQUESTS_PER_IP) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: ipData.firstRequest + RATE_LIMIT_WINDOW
    };
  }

  ipData.count++;
  requestLog.set(ip, ipData);

  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_IP - ipData.count,
    resetTime: ipData.firstRequest + RATE_LIMIT_WINDOW
  };
}


// ============================================================================
// API ROUTES CON SEGURIDAD
// ============================================================================

// NEW V2 Auth Routes (Simplified)
app.use('/api/v2/auth', require('./routes/auth_v2'));

// Chat API route con validación, rate limiting estricto Y autenticación OPCIONAL
app.post('/api/chat',
  optionalAuth, // Opcional: permite usuarios anónimos
  strictLimiter, // Rate limiting estricto para chat
  chatValidationRules, // Validación de inputs
  handleValidationErrors, // Manejo de errores de validación
  async (req, res) => {
    const startTime = Date.now();
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.headers['client-ip'] ||
      req.ip ||
      'unknown';

    // ✅ AGREGAR: Verificar si hay usuario autenticado
    const isAuthenticated = req.user && req.user.id;
    const chatId = req.body.chatId || req.body.currentChatId;

    try {
      securityLogger.info('Chat request started', {
        ip: clientIP,
        userAgent: req.headers['user-agent'],
        messageCount: req.body.messages?.length,
        authenticated: !!isAuthenticated,
        chatId: chatId || 'new'
      });

      const body = req.body;

      // Validar API key (ya validada en config, pero double-check)
      const apiKey = SECURITY_CONFIG.GROQ_API_KEY;
      if (!apiKey) {
        securityLogger.error('GROQ_API_KEY missing', {}, {
          ip: clientIP,
          endpoint: '/api/chat'
        });
        alertPresets.apiError('/api/chat', new Error('GROQ_API_KEY not configured'));
        return res.status(500).json({
          error: 'Error de configuración del servidor. Contacta al administrador.'
        });
      }

      const messages = [];

      if (body.pdfContext && body.pdfContext.trim().length > 0) {
        securityLogger.info('Using PDF context for prompt', {
          chatId: chatId || 'new',
          contextPreview: body.pdfContext.substring(0, 100).replace(/\n/g, ' ') + '...'
        });
        messages.push({
          role: 'system',
          content: `-Eres un asistente académico experto que responde ÚNICAMENTE con información extraída del PDF cargado.

Reglas estrictas:
- No describas la estructura del documento.
- No menciones índices, secciones, figuras ni organización del PDF.
- No digas "el documento", "el PDF", "este material".
- Responde directamente al contenido como si fuera conocimiento propio.
- Ve directo al tema sin introducciones generales.
- Prioriza definiciones claras, explicaciones concretas y conceptos clave.
- Si el usuario hace una pregunta, responde solo lo que se pregunta.

Estilo de respuesta:
- Directo
- Conciso
- Enfocado en el contenido
- Sin lenguaje meta o descriptivo del archivo

Contexto del PDF:
${body.pdfContext}`
        });
      } else {
        messages.push({
          role: 'system',
          content: 'Eres un asistente académico de Neotesis Perú. Ayuda a los estudiantes con sus consultas académicas de manera clara y precisa.'
        });
      }

      messages.push(...body.messages);

      // Función auxiliar para intentar la API con un modelo
      async function tryGroqAPI(model) {
        return await fetch(GROQ_API_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: messages,
            temperature: 0.7,
            max_tokens: 2048
          })
        });
      }

      securityLogger.info('Sending request to Groq API', {
        ip: clientIP,
        messageCount: messages.length,
        model: PRIMARY_MODEL
      });

      let groqResponse = await tryGroqAPI(PRIMARY_MODEL);
      securityLogger.info('Groq API response (primary)', {
        ip: clientIP,
        status: groqResponse.status,
        model: PRIMARY_MODEL
      });

      if (groqResponse.status === 429) {
        securityLogger.warn('Primary model rate limited, trying secondary', {
          ip: clientIP,
          primaryModel: PRIMARY_MODEL
        });
        groqResponse = await tryGroqAPI(SECONDARY_MODEL);
        securityLogger.info('Groq API response (secondary)', {
          ip: clientIP,
          status: groqResponse.status,
          model: SECONDARY_MODEL
        });
      }
      if (!groqResponse.ok) {
        const errorText = await groqResponse.text();
        const error = new Error(`Groq API error: ${groqResponse.status}`);

        securityLogger.apiError('/api/chat', error, {
          ip: clientIP,
          status: groqResponse.status,
          response: errorText.substring(0, 500) // Limitar log
        });

        if (groqResponse.status === 401) {
          alertPresets.apiError('/api/chat', error);
          return res.status(500).json({
            error: 'Error de autenticación con el servicio de IA. Contacta al administrador.'
          });
        }

        if (groqResponse.status === 429) {
          return res.status(503).json({
            error: 'El servicio de IA está temporalmente sobrecargado. Intenta de nuevo en unos minutos.'
          });
        }

        alertPresets.apiError('/api/chat', error);
        return res.status(500).json({
          error: 'Error al comunicarse con el servicio de IA. Intenta de nuevo.'
        });
      }

      const groqData = await groqResponse.json();

      // Verificar que la respuesta tenga la estructura esperada
      if (!groqData.choices || !Array.isArray(groqData.choices) || groqData.choices.length === 0) {
        securityLogger.error('Invalid Groq API response structure', {}, {
          ip: clientIP,
          response: JSON.stringify(groqData).substring(0, 500)
        });
        return res.status(500).json({
          error: 'Respuesta inválida del servicio de IA',
          message: groqData.error || 'La API no devolvió una respuesta válida'
        });
      }

      // ✅ AGREGAR: Guardado condicional a base de datos
      let savedChatId = null;

      if (isAuthenticated) {
        try {
          let chat;

          if (chatId) {
            // Chat existente - verificar que pertenece al usuario
            chat = await Chat.findOne({
              where: {
                id: chatId,
                user_id: req.user.id
              }
            });

            if (!chat) {
              securityLogger.warn('Chat not found or unauthorized', {
                chatId,
                userId: req.user.id,
                ip: clientIP
              });
            } else {
              // Actualizar pdf_content y metadata si se proporciona
              if (body.pdfContext !== undefined) {
                await chat.update({
                  pdf_content: body.pdfContext,
                  pdf_pages: body.pdf_pages ? JSON.stringify(body.pdf_pages) : chat.pdf_pages,
                  total_pages: body.total_pages || chat.total_pages
                });
                securityLogger.info('Chat PDF content and metadata updated', {
                  chatId,
                  userId: req.user.id,
                  hasPdf: !!body.pdfContext,
                  hasPages: !!body.pdf_pages
                });
              }
            }
          } else {
            // Crear nuevo chat
            chat = await Chat.create({
              user_id: req.user.id,
              title: generateChatTitle(body.messages?.[0]?.content),
              pdf_content: body.pdfContext || null,
              pdf_pages: body.pdf_pages ? JSON.stringify(body.pdf_pages) : null,
              total_pages: body.total_pages || null
            });

            securityLogger.info('New chat created', {
              chatId: chat.id,
              userId: req.user.id,
              hasPdf: !!body.pdfContext
            });
          }

          // Guardar mensajes si hay un chat válido
          if (chat) {
            // Guardar mensaje del usuario
            await Message.create({
              chat_id: chat.id,
              role: 'user',
              content: body.messages[body.messages.length - 1]?.content
            });

            // Guardar respuesta de la IA
            await Message.create({
              chat_id: chat.id,
              role: 'assistant',
              content: groqData.choices[0].message.content,
              tokens_used: groqData.usage?.total_tokens || 0
            });

            // Actualizar timestamp del chat
            await chat.update({ updatedAt: new Date() });

            savedChatId = chat.id;
            securityLogger.info('Messages saved', {
              chatId: chat.id,
              messageCount: 2
            });
          }
        } catch (dbError) {
          // NO fallar la respuesta si hay error de DB
          securityLogger.error('Error saving chat to database', dbError, {
            userId: req.user.id,
            chatId: chatId,
            ip: clientIP
          });
          // Continuar y devolver la respuesta de la IA
        }
      } else {
        // Usuario anónimo - no guardar
        securityLogger.info('Anonymous chat - not saving to database', {
          ip: clientIP
        });
      }

      // Log de éxito y métricas
      const duration = Date.now() - startTime;
      securityLogger.successfulRequest('/api/chat', duration, {
        ip: clientIP,
        tokensUsed: groqData.usage?.total_tokens || 0,
        saved: !!isAuthenticated
      });

      // Headers de rate limiting (legacy para compatibilidad)
      res.set({
        'X-RateLimit-Limit': MAX_REQUESTS_PER_IP.toString(),
        'X-RateLimit-Remaining': (MAX_REQUESTS_PER_IP - 1).toString(), // Simplificado
        'X-RateLimit-Reset': (Date.now() + RATE_LIMIT_WINDOW).toString()
      });

      // ✅ MODIFICAR: Responder incluyendo chatId y saved
      res.json({
        ...groqData,
        chatId: savedChatId,
        saved: !!isAuthenticated
      });

    } catch (error) {
      const duration = Date.now() - startTime;
      securityLogger.apiError('/api/chat', error, {
        ip: clientIP,
        duration,
        userAgent: req.headers['user-agent']
      });

      // No exponer detalles sensibles del error
      res.status(500).json({
        error: 'Error interno del servidor. Intenta de nuevo más tarde.',
        message: process.env.NODE_ENV === 'development' ? error.message : 'Servicio temporalmente no disponible'
      });
    }
  });

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
  async (req, res) => {
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
      const duration = Date.now() - startTime;
      securityLogger.apiError('/api/proxy', error, {
        ip: clientIP,
        url: sanitizedUrl,
        duration
      });

      if (error.message.includes('Timeout')) {
        return res.status(504).json({
          error: 'Timeout',
          message: 'La solicitud tardó demasiado tiempo. El sitio web puede estar lento o no disponible.'
        });
      }

      if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
        return res.status(503).json({
          error: 'Sitio no disponible',
          message: 'No se pudo conectar con el sitio web. Verifica que la URL sea correcta.'
        });
      }

      res.status(500).json({
        error: 'Error interno del servidor',
        message: error.message
      });
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

// ============================================================================
// RUTAS DE AUTENTICACIÓN
// ============================================================================

app.use('/api/auth', authRoutes);

// ============================================================================
// RUTAS DE CHAT (PROTEGIDAS)
// ============================================================================

app.get('/api/chats', authMiddleware, async (req, res) => {
  try {
    // ✅ Verificar autenticación
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'No autenticado',
        message: 'Debes iniciar sesión para ver tus chats guardados'
      });
    }

    const chats = await Chat.findAll({
      where: { user_id: req.user.id || req.user.userId },
      // Sequelize default timestamp field is updatedAt (not updated_at)
      order: [['updatedAt', 'DESC']],
      limit: 50,
      attributes: ['id', 'title', 'updatedAt', 'pdf_content', 'total_pages']
    });
    res.json({ chats });
  } catch (error) {
    securityLogger.error('Error getting chats', error, {
      userId: req.user?.id || req.user?.userId,
      ip: req.ip
    });
    res.status(500).json({ error: 'Error al obtener chats', message: error.message });
  }
});

app.post('/api/chats', authMiddleware, async (req, res) => {
  try {
    // ✅ Verificar autenticación
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'No autenticado',
        message: 'Debes iniciar sesión para guardar chats'
      });
    }

    const { title, initialMessage, pdf_content, pdf_pages, total_pages } = req.body;
    const chat = await Chat.create({
      user_id: req.user.id || req.user.userId,
      title: title || 'Nuevo Chat',
      pdf_content: pdf_content || null,
      pdf_pages: pdf_pages ? JSON.stringify(pdf_pages) : null,
      total_pages: total_pages || null
    });

    if (initialMessage) {
      await Message.create({
        chat_id: chat.id,
        role: 'user',
        content: initialMessage
      });
    }

    securityLogger.info('Chat created via API', {
      chatId: chat.id,
      userId: req.user.id || req.user.userId
    });

    res.status(201).json({ chat });
  } catch (error) {
    securityLogger.error('Error creating chat', error, {
      userId: req.user?.id || req.user?.userId,
      ip: req.ip,
      body: req.body
    });
    res.status(500).json({ error: 'Error al crear chat', message: error.message });
  }
});

app.get('/api/chats/:id', authMiddleware, async (req, res) => {
  try {
    // ✅ Verificar autenticación
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'No autenticado',
        message: 'Debes iniciar sesión para ver este chat'
      });
    }

    const chat = await Chat.findOne({
      where: { id: req.params.id, user_id: req.user.id || req.user.userId },
      include: [{ model: Message }],
      // Ensure deterministic ordering of messages
      order: [[Message, 'createdAt', 'ASC']],
      attributes: ['id', 'title', 'updatedAt', 'pdf_content', 'pdf_pages', 'total_pages']
    });

    if (!chat) return res.status(404).json({ error: 'Chat no encontrado' });

    res.json({ chat });
  } catch (error) {
    securityLogger.error('Error getting chat', error, {
      chatId: req.params.id,
      userId: req.user?.id || req.user?.userId,
      ip: req.ip
    });
    res.status(500).json({ error: 'Error al obtener chat' });
  }
});

app.post('/api/chats/:id/messages', authMiddleware, async (req, res) => {
  try {
    // ✅ Verificar autenticación
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'No autenticado',
        message: 'Debes iniciar sesión para enviar mensajes'
      });
    }

    const { role, content } = req.body;
    const chat = await Chat.findOne({
      where: { id: req.params.id, user_id: req.user.id || req.user.userId }
    });

    if (!chat) return res.status(404).json({ error: 'Chat no encontrado' });

    const message = await Message.create({
      chat_id: chat.id,
      role,
      content
    });

    // Update chat timestamp
    await chat.update({ updatedAt: new Date() });

    securityLogger.info('Message saved to existing chat', {
      chatId: chat.id,
      messageId: message.id,
      userId: req.user.id || req.user.userId
    });

    res.status(201).json({ message });
  } catch (error) {
    securityLogger.error('Error saving message', error, {
      chatId: req.params.id,
      userId: req.user?.id || req.user?.userId,
      ip: req.ip
    });
    res.status(500).json({ error: 'Error al guardar mensaje: ' + error.message });
  }
});

// DELETE chat by ID
app.delete('/api/chats/:id', authMiddleware, async (req, res) => {
  try {
    // ✅ Verificar autenticación
    if (!req.user || !req.user.id) {
      return res.status(401).json({
        error: 'No autenticado',
        message: 'Debes iniciar sesión para eliminar chats'
      });
    }

    const chat = await Chat.findOne({
      where: { id: req.params.id, user_id: req.user.id || req.user.userId }
    });

    if (!chat) {
      return res.status(404).json({ error: 'Chat no encontrado' });
    }

    // Delete all messages first
    await Message.destroy({ where: { chat_id: chat.id } });

    // Delete the chat
    await chat.destroy();

    securityLogger.info('Chat deleted', {
      chatId: req.params.id,
      userId: req.user.id || req.user.userId
    });

    res.status(200).json({ message: 'Chat eliminado correctamente' });
  } catch (error) {
    securityLogger.error('Error deleting chat', error, {
      chatId: req.params.id,
      userId: req.user?.id || req.user?.userId,
      ip: req.ip
    });
    res.status(500).json({ error: 'Error al eliminar chat' });
  }
});

// SPA Fallback: redirigir todas las rutas al index.html del build
// Esto permite que React Router maneje el ruteo del lado del cliente
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

/**
 * INICIO DEL SERVIDOR CON LOGGING DE SEGURIDAD
 */
app.listen(PORT, async () => {
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
