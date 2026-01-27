/**
 * middleware/validator.js
 * Validación estricta de inputs usando express-validator
 *
 * Define reglas de validación para todos los endpoints de la API.
 * Incluye sanitización y validación de tipos de datos.
 */

const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware para manejar errores de validación
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Log del intento de validación fallida
    console.warn('Validation failed:', {
      ip: req.headers['x-forwarded-for']?.split(',')[0] || req.ip,
      endpoint: req.path,
      method: req.method,
      errors: errors.array(),
      body: req.body,
      query: req.query,
      params: req.params
    });

    return res.status(400).json({
      error: 'Datos de entrada inválidos',
      message: 'Los datos proporcionados no cumplen con los requisitos de validación.',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

/**
 * Reglas de validación para el endpoint de chat
 */
const chatValidationRules = [
  body('messages')
    .isArray({ min: 1, max: 50 })
    .withMessage('Messages debe ser un array con 1-50 elementos'),

  body('messages.*.role')
    .isIn(['user', 'assistant', 'system'])
    .withMessage('Cada mensaje debe tener un role válido: user, assistant, o system'),

  body('messages.*.content')
    .trim()
    .isLength({ min: 1, max: 10000 })
    .withMessage('El contenido del mensaje debe tener entre 1 y 10000 caracteres')
    .matches(/^[^<>&'"]*$/)
    .withMessage('El contenido del mensaje contiene caracteres no permitidos'),

  body('pdfContext')
    .optional()
    .trim()
    .isLength({ max: 12000 })
    .withMessage('El contexto PDF no puede exceder 12000 caracteres')
    .matches(/^[^<>&'"]*$/)
    .withMessage('El contexto PDF contiene caracteres no permitidos')
];

/**
 * Reglas de validación para el endpoint de proxy
 */
const proxyValidationRules = [
  body('url')
    .trim()
    .isLength({ min: 1, max: 2048 })
    .withMessage('La URL debe tener entre 1 y 2048 caracteres')
    .isURL({
      protocols: ['http', 'https'],
      require_protocol: true,
      disallow_auth: true
    })
    .withMessage('Debe proporcionar una URL HTTP/HTTPS válida sin credenciales'),

  body('type')
    .optional()
    .isIn(['single', 'batch'])
    .withMessage('El tipo debe ser "single" o "batch"')
];

/**
 * Reglas de validación para formularios del frontend (si se implementan)
 */
const formValidationRules = {
  apaGenerator: [
    body('author')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('El autor debe tener entre 1 y 200 caracteres')
      .matches(/^[a-zA-ZÀ-ÿ\s.,'-]+$/)
      .withMessage('El nombre del autor contiene caracteres no válidos'),

    body('year')
      .isInt({ min: 1000, max: new Date().getFullYear() + 1 })
      .withMessage('El año debe ser un número válido'),

    body('title')
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('El título debe tener entre 1 y 500 caracteres'),

    body('publisher')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('La editorial debe tener entre 1 y 200 caracteres'),

    body('journal')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('El nombre de la revista debe tener entre 1 y 200 caracteres'),

    body('url')
      .optional()
      .trim()
      .isLength({ min: 1, max: 2048 })
      .withMessage('La URL debe tener entre 1 y 2048 caracteres')
      .isURL({
        protocols: ['http', 'https'],
        require_protocol: true
      })
      .withMessage('Debe proporcionar una URL válida')
  ],

  sampleCalculator: [
    body('popSize')
      .optional()
      .isInt({ min: 1, max: 100000000 })
      .withMessage('El tamaño de población debe ser un número positivo'),

    body('confidence')
      .isFloat({ min: 1.645, max: 2.576 })
      .withMessage('El nivel de confianza debe estar entre 90% (1.645) y 99.9% (2.576)'),

    body('errorMargin')
      .isFloat({ min: 0.01, max: 0.20 })
      .withMessage('El margen de error debe estar entre 1% y 20%'),

    body('probability')
      .isFloat({ min: 0.3, max: 0.7 })
      .withMessage('La probabilidad debe estar entre 30% y 70%')
  ],

  citationUrl: [
    body('webUrl')
      .trim()
      .isLength({ min: 1, max: 2048 })
      .withMessage('La URL debe tener entre 1 y 2048 caracteres')
      .isURL({
        protocols: ['http', 'https'],
        require_protocol: true
      })
      .withMessage('Debe proporcionar una URL válida')
  ]
};

/**
 * Validación adicional para contenido peligroso
 */
const securityValidationRules = [
  // Prevenir inyección de comandos
  body('*').custom((value, { req }) => {
    if (typeof value === 'string') {
      const dangerousPatterns = [
        /;\s*(rm|del|format|shutdown|reboot)/i,
        /`\s*(rm|del|format)/i,
        /\$\(.*\)/,
        /\{\{.*\}\}/,
        /<%.*%>/,
        /php|asp|jsp/i
      ];

      if (dangerousPatterns.some(pattern => pattern.test(value))) {
        throw new Error('Contenido potencialmente peligroso detectado');
      }
    }
    return true;
  }),

  // Limitar profundidad de objetos anidados
  body('*').custom((value) => {
    const checkDepth = (obj, depth = 0) => {
      if (depth > 10) {
        throw new Error('Estructura de datos demasiado profunda');
      }
      if (typeof obj === 'object' && obj !== null) {
        for (const key in obj) {
          checkDepth(obj[key], depth + 1);
        }
      }
    };

    checkDepth(value);
    return true;
  })
];

/**
 * Sanitización de inputs
 */
const sanitizeInput = (req, res, next) => {
  // Función recursiva para sanitizar objetos
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove scripts
        .replace(/<[^>]*>/g, '') // Remove HTML tags
        .replace(/javascript:/gi, '') // Remove javascript: URLs
        .replace(/on\w+="[^"]*"/gi, '') // Remove event handlers
        .trim();
    } else if (Array.isArray(obj)) {
      return obj.map(sanitize);
    } else if (typeof obj === 'object' && obj !== null) {
      const sanitized = {};
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          sanitized[key] = sanitize(obj[key]);
        }
      }
      return sanitized;
    }
    return obj;
  };

  // Sanitizar body, query, y params
  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);

  next();
};

module.exports = {
  handleValidationErrors,
  chatValidationRules,
  proxyValidationRules,
  formValidationRules,
  securityValidationRules,
  sanitizeInput
};