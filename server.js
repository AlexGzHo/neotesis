const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname)));

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Configuración para chat
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const PRIMARY_MODEL = 'llama-3.1-8b-instant';
const SECONDARY_MODEL = 'llama-3.3-70b-versatile';
const MAX_CONTEXT_LENGTH = 12000;
const MAX_REQUESTS_PER_IP = 3;
const RATE_LIMIT_WINDOW = 24 * 60 * 60 * 1000; // 24 horas en ms

// Almacenamiento en memoria para rate limiting
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

/**
 * Valida el input del usuario
 */
function validateChatInput(body) {
  if (!body.messages || !Array.isArray(body.messages)) {
    return {
      valid: false,
      error: 'El campo "messages" es requerido y debe ser un array'
    };
  }

  if (body.messages.length === 0) {
    return {
      valid: false,
      error: 'El array de mensajes no puede estar vacío'
    };
  }

  for (const msg of body.messages) {
    if (!msg.role || !msg.content) {
      return {
        valid: false,
        error: 'Cada mensaje debe tener "role" y "content"'
      };
    }
    if (!['user', 'assistant', 'system'].includes(msg.role)) {
      return {
        valid: false,
        error: 'El role debe ser "user", "assistant" o "system"'
      };
    }
  }

  const pdfContext = body.pdfContext || '';
  if (pdfContext.length > MAX_CONTEXT_LENGTH) {
    return {
      valid: false,
      error: `El contexto PDF excede el límite de ${MAX_CONTEXT_LENGTH} caracteres`
    };
  }

  return { valid: true };
}

// Chat API route
app.post('/api/chat', async (req, res) => {
  try {
    const body = req.body;

    const validation = validateChatInput(body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    const clientIP = req.headers['x-forwarded-for']?.split(',')[0].trim() ||
      req.headers['client-ip'] ||
      req.ip ||
      'unknown';

    if (process.env.DISABLE_RATE_LIMIT !== 'true') {
      const rateLimitStatus = checkRateLimit(clientIP);

      if (!rateLimitStatus.allowed) {
      const resetDate = new Date(rateLimitStatus.resetTime);
      res.set({
        'X-RateLimit-Limit': MAX_REQUESTS_PER_IP.toString(),
        'X-RateLimit-Remaining': '0',
        'X-RateLimit-Reset': rateLimitStatus.resetTime.toString(),
        'Retry-After': Math.ceil((rateLimitStatus.resetTime - Date.now()) / 1000).toString()
      });
      return res.status(429).json({
        error: 'Has excedido el límite de consultas diarias',
        limit: MAX_REQUESTS_PER_IP,
        resetTime: resetDate.toISOString(),
        message: 'El servicio se restablecerá en las próximas 24 horas desde tu primera consulta'
      });
    }
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      console.error('GROQ_API_KEY no está configurada en las variables de entorno');
      return res.status(500).json({
        error: 'Error de configuración del servidor. Contacta al administrador.'
      });
    }
    console.log('GROQ_API_KEY encontrada, longitud:', apiKey.length);

    const messages = [];

  if (body.pdfContext && body.pdfContext.trim().length > 0) {
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

    console.log('Enviando solicitud a Groq API con', messages.length, 'mensajes');
    let groqResponse = await tryGroqAPI(PRIMARY_MODEL);
    console.log('Respuesta de Groq API (primary) status:', groqResponse.status);

    if (groqResponse.status === 429) {
      console.log('Modelo primario limitado por tasa, intentando modelo secundario');
      groqResponse = await tryGroqAPI(SECONDARY_MODEL);
      console.log('Respuesta de Groq API (secondary) status:', groqResponse.status);
    }
    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Error de Groq API:', groqResponse.status, errorText);

      if (groqResponse.status === 401) {
        return res.status(500).json({
          error: 'Error de autenticación con el servicio de IA. Contacta al administrador.'
        });
      }

      if (groqResponse.status === 429) {
        return res.status(503).json({
          error: 'El servicio de IA está temporalmente sobrecargado. Intenta de nuevo en unos minutos.'
        });
      }

      return res.status(500).json({
        error: 'Error al comunicarse con el servicio de IA. Intenta de nuevo.'
      });
    }

    const groqData = await groqResponse.json();

    // Verificar que la respuesta tenga la estructura esperada
    if (!groqData.choices || !Array.isArray(groqData.choices) || groqData.choices.length === 0) {
      console.error('Respuesta de Groq API inválida:', groqData);
      return res.status(500).json({
        error: 'Respuesta inválida del servicio de IA',
        message: groqData.error || 'La API no devolvió una respuesta válida'
      });
    }

    res.set({
      'X-RateLimit-Limit': MAX_REQUESTS_PER_IP.toString(),
      'X-RateLimit-Remaining': rateLimitStatus.remaining.toString(),
      'X-RateLimit-Reset': rateLimitStatus.resetTime.toString()
    });

    res.json(groqData);

  } catch (error) {
    console.error('Error en chat API:', error);
    res.status(500).json({
      error: 'Error interno del servidor. Intenta de nuevo más tarde.',
      message: error.message
    });
  }
});

// Configuración para proxy
const REQUEST_TIMEOUT = 10000;
const MAX_RESPONSE_SIZE = 5 * 1024 * 1024;

const ALLOWED_DOMAINS = [
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
];

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

function validateProxyInput(body) {
  if (!body.url || typeof body.url !== 'string') {
    return {
      valid: false,
      error: 'El campo "url" es requerido y debe ser un string'
    };
  }

  if (body.url.length > 2048) {
    return {
      valid: false,
      error: 'La URL es demasiado larga'
    };
  }

  if (body.type && !['single', 'batch'].includes(body.type)) {
    return {
      valid: false,
      error: 'El campo "type" debe ser "single" o "batch"'
    };
  }

  return { valid: true };
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

// Proxy API route
app.post('/api/proxy', async (req, res) => {
  try {
    const body = req.body;

    const validation = validateProxyInput(body);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    let sanitizedUrl;
    try {
      sanitizedUrl = sanitizeUrl(body.url);
    } catch (e) {
      return res.status(400).json({ error: e.message });
    }

    if (!isAllowedDomain(sanitizedUrl)) {
      return res.status(403).json({
        error: 'Dominio no permitido',
        message: 'Solo se permiten solicitudes a repositorios académicos y bases de datos científicas autorizadas'
      });
    }

    const response = await fetchWithTimeout(sanitizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NeotesisBot/1.0; +https://neotesis-peru.up.railway.app; Academic Citation Tool)',
        'Accept': 'text/html,application/xhtml+xml,application/xml,application/json;q=0.9,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate',
        'Cache-Control': 'no-cache'
      }
    });

    if (!response.ok) {
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

    res.set('Cache-Control', 'public, max-age=3600');
    res.json({
      success: true,
      url: sanitizedUrl,
      data: responseData,
      contentType: contentType,
      size: text.length
    });

  } catch (error) {
    console.error('Error en proxy API:', error);

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

// Endpoint para información de usuario (sin autenticación)
app.get('/api/v4/user', (req, res) => {
  res.status(200).json({
    authenticated: false,
    user: null
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
