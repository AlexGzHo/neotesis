/**
 * middleware/sanitizer.js
 * Sanitización avanzada de inputs para prevenir XSS e inyecciones
 *
 * Utiliza DOMPurify para sanitización de HTML y funciones personalizadas
 * para otros tipos de sanitización.
 */

const DOMPurify = require('dompurify');
const { JSDOM } = require('jsdom');

// Configurar DOMPurify con JSDOM
const window = new JSDOM('').window;
const DOMPurifyInstance = DOMPurify(window);

/**
 * Configuración de DOMPurify para contenido de chat
 */
const chatSanitizeConfig = {
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br', 'ul', 'ol', 'li', 'blockquote'],
  ALLOWED_ATTR: [],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
  FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover', 'style']
};

/**
 * Configuración de DOMPurify para contenido de citas APA
 */
const citationSanitizeConfig = {
  ALLOWED_TAGS: ['i', 'b', 'em', 'strong'],
  ALLOWED_ATTR: ['href'],
  ALLOW_DATA_ATTR: false,
  FORBID_TAGS: ['script', 'style', 'iframe'],
  FORBID_ATTR: ['onclick', 'onload', 'onerror']
};

/**
 * Sanitiza contenido de texto plano para prevenir inyecciones
 */
function sanitizeText(text) {
  if (typeof text !== 'string') return text;

  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: URLs
    .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
    .replace(/&#/g, '') // Remove HTML entities
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/&/g, '&')
    .replace(/"/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .trim();
}

/**
 * Sanitiza contenido HTML permitido
 */
function sanitizeHTML(html, config = chatSanitizeConfig) {
  if (typeof html !== 'string') return html;

  return DOMPurifyInstance.sanitize(html, config);
}

/**
 * Sanitiza URLs para prevenir ataques
 */
function sanitizeURL(url) {
  if (typeof url !== 'string') return url;

  try {
    const urlObj = new URL(url);

    // Solo permitir HTTP/HTTPS
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Protocolo no permitido');
    }

    // Remover credenciales
    urlObj.username = '';
    urlObj.password = '';

    // Remover fragmentos potencialmente peligrosos
    urlObj.hash = '';

    return urlObj.toString();
  } catch (e) {
    throw new Error('URL inválida');
  }
}

/**
 * Sanitiza nombres de archivos
 */
function sanitizeFilename(filename) {
  if (typeof filename !== 'string') return filename;

  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Solo caracteres seguros
    .replace(/\.+/g, '.') // Evitar múltiples puntos
    .replace(/^[\.-]+/, '') // No empezar con punto o guión
    .substring(0, 255); // Limitar longitud
}

/**
 * Sanitiza contenido JSON
 */
function sanitizeJSON(data) {
  if (typeof data === 'string') {
    // Intentar parsear y sanitizar
    try {
      const parsed = JSON.parse(data);
      return sanitizeObject(parsed);
    } catch (e) {
      return sanitizeText(data);
    }
  } else if (typeof data === 'object' && data !== null) {
    return sanitizeObject(data);
  }
  return data;
}

/**
 * Sanitiza objetos recursivamente
 */
function sanitizeObject(obj, depth = 0) {
  // Prevenir recursión infinita
  if (depth > 10) {
    throw new Error('Objeto demasiado profundo');
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item, depth + 1));
  } else if (typeof obj === 'object' && obj !== null) {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitizar keys
      const cleanKey = sanitizeText(key);
      sanitized[cleanKey] = sanitizeObject(value, depth + 1);
    }
    return sanitized;
  } else if (typeof obj === 'string') {
    return sanitizeText(obj);
  }

  return obj;
}

/**
 * Sanitiza queries de base de datos (si se implementa en el futuro)
 */
function sanitizeSQL(value) {
  if (typeof value !== 'string') return value;

  // Remover caracteres peligrosos para SQL
  return value
    .replace(/['";\\]/g, '') // Remover comillas y punto y coma
    .replace(/--/g, '') // Remover comentarios
    .replace(/\/\*.*?\*\//g, '') // Remover comentarios multilinea
    .trim();
}

/**
 * Middleware de sanitización general
 */
const sanitizeMiddleware = (req, res, next) => {
  try {
    // Sanitizar body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitizar query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    // Sanitizar route parameters
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }

    // Sanitizar headers específicos
    if (req.headers['user-agent']) {
      req.headers['user-agent'] = sanitizeText(req.headers['user-agent']);
    }

    next();
  } catch (error) {
    console.error('Error en sanitización:', error);
    return res.status(400).json({
      error: 'Error de sanitización',
      message: 'Los datos proporcionados contienen contenido no válido.'
    });
  }
};

/**
 * Sanitiza contenido para respuestas de chat
 */
function sanitizeChatResponse(response) {
  if (typeof response !== 'string') return response;

  // Permitir algunos tags HTML básicos pero sanitizar
  return sanitizeHTML(response, chatSanitizeConfig);
}

/**
 * Sanitiza citas APA
 */
function sanitizeCitation(citation) {
  if (typeof citation !== 'string') return citation;

  return sanitizeHTML(citation, citationSanitizeConfig);
}

module.exports = {
  sanitizeText,
  sanitizeHTML,
  sanitizeURL,
  sanitizeFilename,
  sanitizeJSON,
  sanitizeObject,
  sanitizeSQL,
  sanitizeMiddleware,
  sanitizeChatResponse,
  sanitizeCitation,
  chatSanitizeConfig,
  citationSanitizeConfig
};