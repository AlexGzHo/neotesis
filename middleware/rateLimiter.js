/**
 * middleware/rateLimiter.js
 * Sistema avanzado de rate limiting para Neotesis Perú
 *
 * Implementa límites de rate por IP con diferentes políticas según el endpoint.
 * Incluye throttling progresivo y blacklisting automático.
 */

const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');

// Almacenamiento en memoria para rate limiting (en producción usar Redis)
const rateLimitStore = new Map();
const blacklistedIPs = new Set();
const suspiciousActivity = new Map();

/**
 * Limpia entradas antiguas del store de rate limiting
 */
function cleanupOldEntries() {
  const now = Date.now();
  const maxAge = 24 * 60 * 60 * 1000; // 24 horas

  for (const [key, data] of rateLimitStore.entries()) {
    if (now - data.lastRequest > maxAge) {
      rateLimitStore.delete(key);
    }
  }

  // Limpiar actividad sospechosa después de 1 hora
  for (const [ip, data] of suspiciousActivity.entries()) {
    if (now - data.lastActivity > 60 * 60 * 1000) {
      suspiciousActivity.delete(ip);
    }
  }
}

// Ejecutar limpieza cada 30 minutos
setInterval(cleanupOldEntries, 30 * 60 * 1000);

/**
 * Verifica si una IP está blacklisteada
 */
function isBlacklisted(ip) {
  return blacklistedIPs.has(ip);
}

/**
 * Agrega una IP a la blacklist temporalmente
 */
function blacklistIP(ip, reason) {
  blacklistedIPs.add(ip);
  console.log(`IP ${ip} blacklisted: ${reason}`);

  // Remover de blacklist después de 24 horas
  setTimeout(() => {
    blacklistedIPs.delete(ip);
    console.log(`IP ${ip} removed from blacklist`);
  }, 24 * 60 * 60 * 1000);
}

/**
 * Registra actividad sospechosa
 */
function logSuspiciousActivity(ip, activity) {
  const now = Date.now();
  const data = suspiciousActivity.get(ip) || { count: 0, lastActivity: now, activities: [] };

  data.count++;
  data.lastActivity = now;
  data.activities.push({ activity, timestamp: now });

  // Si hay más de 10 actividades sospechosas en 1 hora, blacklist
  if (data.count >= 10) {
    blacklistIP(ip, `Multiple suspicious activities: ${data.activities.map(a => a.activity).join(', ')}`);
    suspiciousActivity.delete(ip);
  } else {
    suspiciousActivity.set(ip, data);
  }
}

/**
 * Rate limiter general para todas las rutas
 * Límite bajo para prevenir abuso general
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: {
    error: 'Demasiadas solicitudes',
    message: 'Has excedido el límite de solicitudes. Intenta de nuevo en 15 minutos.',
    retryAfter: 15 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isBlacklisted(getClientIP(req)),
  handler: (req, res) => {
    const ip = getClientIP(req);
    logSuspiciousActivity(ip, 'rate_limit_exceeded_general');
    res.status(429).json({
      error: 'Demasiadas solicitudes',
      message: 'Has excedido el límite de solicitudes. Intenta de nuevo en 15 minutos.',
      retryAfter: 15 * 60
    });
  }
});

/**
 * Rate limiter estricto para endpoints críticos (chat API)
 */
const strictLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 50, // máximo 50 requests por hora para chat
  message: {
    error: 'Límite de chat excedido',
    message: 'Has alcanzado el límite de consultas de IA por hora. Intenta de nuevo en 1 hora.',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isBlacklisted(getClientIP(req)),
  handler: (req, res) => {
    const ip = getClientIP(req);
    logSuspiciousActivity(ip, 'rate_limit_exceeded_chat');
    res.status(429).json({
      error: 'Límite de chat excedido',
      message: 'Has alcanzado el límite de consultas de IA por hora. Intenta de nuevo en 1 hora.',
      retryAfter: 60 * 60
    });
  }
});

/**
 * Rate limiter para proxy requests (más restrictivo)
 */
const proxyLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20, // máximo 20 requests de proxy por hora
  message: {
    error: 'Límite de proxy excedido',
    message: 'Has alcanzado el límite de solicitudes de proxy por hora. Intenta de nuevo en 1 hora.',
    retryAfter: 60 * 60
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => isBlacklisted(getClientIP(req)),
  handler: (req, res) => {
    const ip = getClientIP(req);
    logSuspiciousActivity(ip, 'rate_limit_exceeded_proxy');
    res.status(429).json({
      error: 'Límite de proxy excedido',
      message: 'Has alcanzado el límite de solicitudes de proxy por hora. Intenta de nuevo en 1 hora.',
      retryAfter: 60 * 60
    });
  }
});

/**
 * Throttling progresivo para requests rápidas
 * Agrega delay creciente para prevenir ataques de fuerza bruta
 */
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutos
  delayAfter: 10, // después de 10 requests
  delayMs: () => 500, // delay inicial de 500ms
  maxDelayMs: 5000, // delay máximo de 5 segundos
  skipFailedRequests: false,
  skipSuccessfulRequests: false
});

/**
 * Obtiene la IP real del cliente considerando proxies
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         req.headers['client-ip'] ||
         req.ip ||
         'unknown';
}

/**
 * Middleware para verificar blacklist
 */
const blacklistMiddleware = (req, res, next) => {
  const ip = getClientIP(req);

  if (isBlacklisted(ip)) {
    logSuspiciousActivity(ip, 'blacklisted_ip_attempt');
    return res.status(403).json({
      error: 'Acceso denegado',
      message: 'Tu IP ha sido bloqueada temporalmente debido a actividad sospechosa.'
    });
  }

  next();
};

/**
 * Middleware para detectar y prevenir ataques comunes
 */
const attackDetectionMiddleware = (req, res, next) => {
  const ip = getClientIP(req);
  const userAgent = req.headers['user-agent'] || '';
  const url = req.url;

  // Detectar user agents sospechosos
  const suspiciousUA = [
    'sqlmap',
    'nmap',
    'nikto',
    'dirbuster',
    'gobuster',
    'masscan',
    'zmap'
  ];

  if (suspiciousUA.some(tool => userAgent.toLowerCase().includes(tool))) {
    logSuspiciousActivity(ip, `suspicious_user_agent: ${userAgent}`);
  }

  // Detectar URLs con payloads comunes de ataque
  const attackPatterns = [
    /(\.\.|%2e%2e)/i, // directory traversal
    /(<script|javascript:|on\w+=)/i, // XSS básico
    /(union.*select|select.*from.*information_schema)/i, // SQL injection
    /(eval\(|exec\(|system\()/i // code injection
  ];

  if (attackPatterns.some(pattern => pattern.test(url))) {
    logSuspiciousActivity(ip, `suspicious_url_pattern: ${url}`);
  }

  next();
};

module.exports = {
  generalLimiter,
  strictLimiter,
  proxyLimiter,
  speedLimiter,
  blacklistMiddleware,
  attackDetectionMiddleware,
  isBlacklisted,
  blacklistIP,
  logSuspiciousActivity,
  getClientIP
};