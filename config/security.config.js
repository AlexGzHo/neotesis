/**
 * config/security.config.js
 * Configuración centralizada de seguridad para Neotesis Perú
 *
 * Todas las configuraciones de seguridad se centralizan aquí para facilitar
 * el mantenimiento y la actualización.
 */

require('dotenv').config();

/**
 * Configuración general de seguridad
 */
const SECURITY_CONFIG = {
  // Entorno
  NODE_ENV: process.env.NODE_ENV || 'development',

  // Puerto del servidor
  PORT: process.env.PORT || 8080,

  // Dominio permitido para CORS
  ALLOWED_ORIGIN: process.env.ALLOWED_ORIGIN || ['http://localhost:8080', 'http://localhost:5173'],

  // API Key de Groq (con validación)
  GROQ_API_KEY: process.env.GROQ_API_KEY,

  // Configuración de rate limiting
  RATE_LIMIT: {
    // Límite general por IP (15 minutos)
    GENERAL_WINDOW_MS: 15 * 60 * 1000, // 15 minutos
    GENERAL_MAX_REQUESTS: 100,

    // Límite para chat API (1 hora)
    CHAT_WINDOW_MS: 60 * 60 * 1000, // 1 hora
    CHAT_MAX_REQUESTS: 50,

    // Límite para proxy API (1 hora)
    PROXY_WINDOW_MS: 60 * 60 * 1000, // 1 hora
    PROXY_MAX_REQUESTS: 20,

    // Configuración de throttling
    THROTTLE_DELAY_AFTER: 10,
    THROTTLE_DELAY_MS: 500,
    THROTTLE_MAX_DELAY_MS: 5000
  },

  // Configuración de blacklist
  BLACKLIST: {
    // Tiempo de blacklist (24 horas)
    DURATION_MS: 24 * 60 * 60 * 1000,

    // Umbral para auto-blacklist (10 actividades sospechosas en 1 hora)
    AUTO_BLACKLIST_THRESHOLD: 10,
    AUTO_BLACKLIST_WINDOW_MS: 60 * 60 * 1000
  },

  // Configuración de validación
  VALIDATION: {
    // Límites de mensajes de chat
    CHAT_MIN_MESSAGES: 1,
    CHAT_MAX_MESSAGES: 50,
    CHAT_MAX_MESSAGE_LENGTH: 10000,

    // Límite de contexto PDF
    PDF_MAX_CONTEXT_LENGTH: 12000,

    // Límites de URLs
    URL_MAX_LENGTH: 2048,

    // Profundidad máxima de objetos JSON
    MAX_OBJECT_DEPTH: 10
  },

  // Configuración de sanitización
  SANITIZATION: {
    // Patrones peligrosos a remover
    DANGEROUS_PATTERNS: [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+="[^"]*"/gi,
      /&#/g
    ],

    // Tags HTML permitidos en diferentes contextos
    ALLOWED_HTML_TAGS: {
      CHAT: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'blockquote'],
      CITATION: ['i', 'b', 'em', 'strong']
    }
  },

  // Configuración de logging
  LOGGING: {
    // Nivel mínimo de logging
    LEVEL: process.env.LOG_LEVEL || 'info',

    // Directorio de logs
    LOG_DIR: process.cwd() + '/logs',

    // Tamaño máximo de archivos de log
    MAX_LOG_SIZE: 10 * 1024 * 1024, // 10MB

    // Número máximo de archivos de log
    MAX_LOG_FILES: 5
  },

  // Configuración de alertas
  ALERTING: {
    // URLs de webhooks (deben estar en variables de entorno)
    WEBHOOKS: {
      DISCORD: process.env.DISCORD_WEBHOOK_URL,
      SLACK: process.env.SLACK_WEBHOOK_URL,
      MONITORING: process.env.MONITORING_WEBHOOK_URL
    },

    // Cooldown entre alertas similares (5 minutos)
    ALERT_COOLDOWN_MS: 5 * 60 * 1000
  },

  // Configuración de payloads
  PAYLOAD: {
    // Límite de tamaño de payload (10MB)
    MAX_SIZE: '10mb',

    // Timeout de requests
    REQUEST_TIMEOUT_MS: 10000,

    // Tamaño máximo de respuesta del proxy
    MAX_RESPONSE_SIZE: 5 * 1024 * 1024 // 5MB
  },

  // Configuración de proxy
  PROXY: {
    // Dominios permitidos para proxy
    ALLOWED_DOMAINS: [
      'api.crossref.org',
      'doi.org',
      'dx.doi.org',
      'repositorio.ucv.edu.pe',
      'repositorio.upao.edu.pe',
      'repositorio.utp.edu.pe',
      'repositorio.usil.edu.pe',
      'repositorio.upc.edu.pe',
      'repositorio.unmsm.edu.pe',
      'alicia.concytec.gob.pe',
      'sciencedirect.com',
      'www.sciencedirect.com',
      'scholar.google.com',
      'pubmed.ncbi.nlm.nih.gov',
      'arxiv.org',
      'researchgate.net',
      'jstor.org',
      'springer.com',
      'wiley.com',
      'elsevier.com',
      'scielo.org',
      'redalyc.org'
    ],

    // User-Agent para requests de proxy
    USER_AGENT: 'Mozilla/5.0 (compatible; NeotesisBot/1.0; +https://neotesisperu.online; Academic Citation Tool)',

    // Headers adicionales para proxy
    HEADERS: {
      'Accept': 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
      'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      'Accept-Encoding': 'gzip, deflate',
      'Cache-Control': 'no-cache'
    }
  },

  // Configuración de cuotas de usuario (frontend)
  QUOTAS: {
    MAX_REQUESTS_PER_DAY: 3,
    MAX_TOKENS_PER_DAY: 100000,
    QUOTA_RESET_TIME_MS: 24 * 60 * 60 * 1000, // 24 horas
    DISABLE_QUOTA: process.env.DISABLE_QUOTA === 'true'
  },

  // Configuración de modelos de IA
  AI_MODELS: {
    PRIMARY: 'llama-3.1-8b-instant',
    SECONDARY: 'llama-3.3-70b-versatile',
    TEMPERATURE: 0.7,
    MAX_TOKENS: 2048
  }
};

/**
 * Validación de configuración crítica al inicio
 */
function validateConfig() {
  const errors = [];

  // Validar API key de Groq
  if (!SECURITY_CONFIG.GROQ_API_KEY) {
    errors.push('GROQ_API_KEY no está configurada en las variables de entorno');
  }

  // Validar dominio permitido
  if (!SECURITY_CONFIG.ALLOWED_ORIGIN) {
    errors.push('ALLOWED_ORIGIN no está configurada');
  }

  // Validar límites de rate limiting
  if (SECURITY_CONFIG.RATE_LIMIT.GENERAL_MAX_REQUESTS < 1) {
    errors.push('GENERAL_MAX_REQUESTS debe ser mayor a 0');
  }

  if (SECURITY_CONFIG.RATE_LIMIT.CHAT_MAX_REQUESTS < 1) {
    errors.push('CHAT_MAX_REQUESTS debe ser mayor a 0');
  }

  if (errors.length > 0) {
    console.error('Errores de configuración crítica:');
    errors.forEach(error => console.error(`- ${error}`));
    process.exit(1);
  }

  console.log('✅ Configuración de seguridad validada correctamente');
}

/**
 * Función para obtener configuración anidada
 */
function getConfig(path) {
  return path.split('.').reduce((obj, key) => obj && obj[key], SECURITY_CONFIG);
}

/**
 * Función para verificar si una feature está habilitada
 */
function isEnabled(feature) {
  switch (feature) {
    case 'logging':
      return SECURITY_CONFIG.LOGGING.LEVEL !== 'off';
    case 'alerting':
      return Object.values(SECURITY_CONFIG.ALERTING.WEBHOOKS).some(url => url);
    case 'rate_limiting':
      return true; // Siempre habilitado
    case 'validation':
      return true; // Siempre habilitado
    case 'sanitization':
      return true; // Siempre habilitado
    default:
      return false;
  }
}

// Validar configuración al cargar el módulo
validateConfig();

module.exports = {
  SECURITY_CONFIG,
  validateConfig,
  getConfig,
  isEnabled
};