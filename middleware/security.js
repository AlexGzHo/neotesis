/**
 * middleware/security.js
 * Configuración de seguridad con Helmet para Neotesis Perú
 *
 * Este módulo configura Helmet con políticas de seguridad estrictas para prevenir
 * ataques comunes como XSS, clickjacking, MIME sniffing, etc.
 */

const helmet = require('helmet');

/**
 * Configuración de Content Security Policy (CSP)
 * Previene XSS al restringir las fuentes de contenido
 */
const cspConfig = {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: [
      "'self'",
      "'unsafe-inline'", // Necesario para scripts inline en el frontend
      "https://cdnjs.cloudflare.com", // Para PDF.js y otras librerías
      "https://cdn.jsdelivr.net", // Para posibles dependencias externas
      "https://static.cloudflareinsights.com" // Para Cloudflare beacon
    ],
    scriptSrcAttr: [
      "'unsafe-inline'" // Para event handlers onclick
    ],
    styleSrc: [
      "'self'",
      "'unsafe-inline'", // Para estilos inline
      "https://fonts.googleapis.com", // Para Google Fonts
      "https://cdnjs.cloudflare.com"
    ],
    fontSrc: [
      "'self'",
      "https://fonts.gstatic.com", // Para Google Fonts
      "https://cdnjs.cloudflare.com"
    ],
    imgSrc: [
      "'self'",
      "data:", // Para imágenes base64 (PDF thumbnails)
      "https:", // Para imágenes externas seguras
      "blob:" // Para PDFs procesados
    ],
    connectSrc: [
      "'self'",
      "https://api.groq.com", // Para llamadas a la API de Groq
      "https://api.crossref.org", // Para DOI lookups
      "https://alicia.concytec.gob.pe", // Para búsquedas académicas
      "https://repositorio.ucv.edu.pe", // Repositorios académicos
      "https://repositorio.upao.edu.pe",
      "https://repositorio.utp.edu.pe",
      "https://repositorio.usil.edu.pe",
      "https://repositorio.upc.edu.pe",
      "https://repositorio.unmsm.edu.pe",
      "https://sciencedirect.com",
      "https://www.sciencedirect.com",
      "https://scholar.google.com",
      "https://pubmed.ncbi.nlm.nih.gov",
      "https://arxiv.org",
      "https://researchgate.net",
      "https://jstor.org",
      "https://springer.com",
      "https://wiley.com",
      "https://elsevier.com",
      "https://scielo.org",
      "https://redalyc.org",
      "https://cdnjs.cloudflare.com" // Para DOMPurify y otras librerías
    ],
    frameSrc: ["'none'"], // Previene clickjacking
    objectSrc: ["'none'"], // Previene plugins inseguros
    baseUri: ["'self'"],
    formAction: ["'self'"],
    upgradeInsecureRequests: [], // Fuerza HTTPS
  },
  reportOnly: false // En producción, cambiar a true para monitoreo
};

/**
 * Configuración completa de Helmet
 * Incluye todas las políticas de seguridad recomendadas
 */
const helmetConfig = helmet({
  contentSecurityPolicy: cspConfig,
  hsts: {
    maxAge: 31536000, // 1 año
    includeSubDomains: true,
    preload: true
  },
  noSniff: true, // Previene MIME sniffing
  xssFilter: true, // Filtro XSS adicional
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  frameguard: { action: "deny" }, // Anti-clickjacking
  dnsPrefetchControl: { allow: false },
  ieNoOpen: true,
  hidePoweredBy: true, // Oculta header X-Powered-By
  permittedCrossDomainPolicies: { permittedPolicies: "none" }
});

/**
 * Middleware adicional para headers de seguridad personalizados
 */
const additionalSecurityHeaders = (req, res, next) => {
  // Header para prevenir clickjacking adicional
  res.setHeader('X-Frame-Options', 'DENY');

  // Header para controlar referencias
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Header para prevenir MIME sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Header para prevenir ataques de inyección
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Header para controlar características del navegador
  res.setHeader('Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=(), usb=()'
  );

  // Header personalizado para identificar requests legítimos
  res.setHeader('X-Neotesis-Security', 'enabled');

  next();
};

module.exports = {
  helmetConfig,
  additionalSecurityHeaders,
  cspConfig
};