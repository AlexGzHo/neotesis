const { securityLogger } = require('../utils/logger');
const { alertPresets } = require('../utils/alerting');

const errorHandler = (err, req, res, next) => {
    // If headers sent, delegate to default handler
    if (res.headersSent) {
        return next(err);
    }

    const clientIP = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.ip || 'unknown';
    const status = err.status || 500;
    const message = err.message || 'Error interno del servidor';

    // Log the error
    securityLogger.error('Global Error Handler', err, {
        ip: clientIP,
        path: req.path,
        method: req.method,
        status: status
    });

    // Special handling for known error types
    if (message === 'GROQ_API_KEY_MISSING') {
        alertPresets.apiError(req.path, err);
        return res.status(500).json({
            error: 'Error de configuración del servidor. Contacta al administrador.'
        });
    }

    // Hide sensitive details in production
    const isDev = process.env.NODE_ENV === 'development';

    res.status(status).json({
        error: isDev ? message : 'Ha ocurrido un error inesperado.',
        details: isDev ? err.stack : undefined
    });
};

module.exports = errorHandler;
