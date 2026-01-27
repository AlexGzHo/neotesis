/**
 * utils/logger.js
 * Sistema de logging de seguridad para Neotesis Perú
 *
 * Registra eventos de seguridad, ataques, y actividad sospechosa.
 * Compatible con Railway y entornos de producción.
 */

const winston = require('winston');
const path = require('path');

// Configuración de niveles de log personalizados
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    security: 3,
    debug: 4
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    security: 'magenta',
    debug: 'blue'
  }
};

// Formato personalizado para logs de seguridad
const securityFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const logEntry = {
      timestamp,
      level,
      message,
      ...meta
    };

    // En desarrollo, incluir stack traces
    if (process.env.NODE_ENV !== 'production' && meta.stack) {
      logEntry.stack = meta.stack;
    }

    return JSON.stringify(logEntry, null, process.env.NODE_ENV === 'production' ? 0 : 2);
  })
);

// Transportes de log
const transports = [];

// Log a consola en desarrollo
if (process.env.NODE_ENV !== 'production') {
  transports.push(
    new winston.transports.Console({
      level: 'debug',
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 2)}` : '';
          return `${timestamp} ${level}: ${message}${metaStr}`;
        })
      )
    })
  );
}

// Log a archivo en producción
transports.push(
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'security.log'),
    level: 'security',
    format: securityFormat,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    tailable: true
  }),
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'error.log'),
    level: 'error',
    format: securityFormat,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    tailable: true
  }),
  new winston.transports.File({
    filename: path.join(process.cwd(), 'logs', 'combined.log'),
    level: 'info',
    format: securityFormat,
    maxsize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    tailable: true
  })
);

// Crear el logger
const logger = winston.createLogger({
  levels: customLevels.levels,
  level: 'security', // Nivel mínimo para loggear
  format: securityFormat,
  transports,
  exitOnError: false
});

// Agregar colores
winston.addColors(customLevels.colors);

/**
 * Logger específico para eventos de seguridad
 */
const securityLogger = {
  /**
   * Registra un intento de ataque
   */
  attackAttempt: (attackType, details) => {
    logger.security('SECURITY_ATTACK_ATTEMPT', {
      attackType,
      ...details,
      severity: 'high'
    });
  },

  /**
   * Registra actividad sospechosa
   */
  suspiciousActivity: (activity, details) => {
    logger.security('SECURITY_SUSPICIOUS_ACTIVITY', {
      activity,
      ...details,
      severity: 'medium'
    });
  },

  /**
   * Registra rate limiting excedido
   */
  rateLimitExceeded: (ip, endpoint, details) => {
    logger.security('SECURITY_RATE_LIMIT_EXCEEDED', {
      ip,
      endpoint,
      ...details,
      severity: 'low'
    });
  },

  /**
   * Registra validación fallida
   */
  validationFailed: (endpoint, errors, details) => {
    logger.warn('VALIDATION_FAILED', {
      endpoint,
      errors,
      ...details,
      severity: 'low'
    });
  },

  /**
   * Registra acceso no autorizado
   */
  unauthorizedAccess: (ip, endpoint, details) => {
    logger.security('SECURITY_UNAUTHORIZED_ACCESS', {
      ip,
      endpoint,
      ...details,
      severity: 'high'
    });
  },

  /**
   * Registra IP blacklisteada
   */
  ipBlacklisted: (ip, reason, details) => {
    logger.security('SECURITY_IP_BLACKLISTED', {
      ip,
      reason,
      ...details,
      severity: 'high'
    });
  },

  /**
   * Registra error de API
   */
  apiError: (endpoint, error, details) => {
    logger.error('API_ERROR', {
      endpoint,
      error: error.message,
      stack: error.stack,
      ...details
    });
  },

  /**
   * Registra request exitoso
   */
  successfulRequest: (endpoint, duration, details) => {
    logger.info('REQUEST_SUCCESS', {
      endpoint,
      duration,
      ...details
    });
  },

  /**
   * Registra sanitización aplicada
   */
  sanitizationApplied: (field, originalLength, sanitizedLength, details) => {
    logger.info('SANITIZATION_APPLIED', {
      field,
      originalLength,
      sanitizedLength,
      ...details
    });
  },

  /**
   * Log genérico de información
   */
  info: (message, details) => {
    logger.info(message, details);
  },

  /**
   * Log genérico de warning
   */
  warn: (message, details) => {
    logger.warn(message, details);
  },

  /**
   * Log genérico de error
   */
  error: (message, error, details) => {
    logger.error(message, {
      error: error.message,
      stack: error.stack,
      ...details
    });
  }
};

/**
 * Middleware para logging automático de requests
 */
const requestLogger = (req, res, next) => {
  const start = Date.now();
  const ip = req.headers['x-forwarded-for']?.split(',')[0] ||
             req.headers['x-real-ip'] ||
             req.ip ||
             'unknown';

  // Log del request inicial
  logger.info('REQUEST_START', {
    method: req.method,
    url: req.url,
    ip,
    userAgent: req.headers['user-agent'],
    timestamp: new Date().toISOString()
  });

  // Interceptar la respuesta para loggear el resultado
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    const logData = {
      method: req.method,
      url: req.url,
      ip,
      statusCode,
      duration,
      responseSize: data ? data.length : 0,
      timestamp: new Date().toISOString()
    };

    if (statusCode >= 400) {
      logger.warn('REQUEST_ERROR', logData);
    } else {
      logger.info('REQUEST_SUCCESS', logData);
    }

    originalSend.call(this, data);
  };

  next();
};

module.exports = {
  logger,
  securityLogger,
  requestLogger
};