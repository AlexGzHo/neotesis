/**
 * utils/alerting.js
 * Sistema de alertas y notificaciones para Neotesis Perú
 *
 * Envía notificaciones webhook ante ataques detectados o eventos críticos.
 * Compatible con servicios como Discord, Slack, o sistemas de monitoreo.
 */

const fetch = require('node-fetch');
const { securityLogger } = require('./logger');

/**
 * Configuración de webhooks
 * En producción, estas URLs deberían estar en variables de entorno
 */
const WEBHOOK_CONFIG = {
  // Discord webhook para alertas críticas
  discord: {
    url: process.env.DISCORD_WEBHOOK_URL,
    enabled: !!process.env.DISCORD_WEBHOOK_URL
  },

  // Slack webhook para alertas generales
  slack: {
    url: process.env.SLACK_WEBHOOK_URL,
    enabled: !!process.env.SLACK_WEBHOOK_URL
  },

  // Webhook genérico para sistemas de monitoreo
  monitoring: {
    url: process.env.MONITORING_WEBHOOK_URL,
    enabled: !!process.env.MONITORING_WEBHOOK_URL
  }
};

/**
 * Niveles de severidad para alertas
 */
const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * Tipos de alertas
 */
const ALERT_TYPES = {
  ATTACK_ATTEMPT: 'attack_attempt',
  IP_BLACKLISTED: 'ip_blacklisted',
  RATE_LIMIT_ABUSE: 'rate_limit_abuse',
  VALIDATION_FAILURE: 'validation_failure',
  API_ERROR: 'api_error',
  SYSTEM_ERROR: 'system_error',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity'
};

/**
 * Cola de alertas para evitar spam
 */
const alertQueue = new Map();
const ALERT_COOLDOWN = 5 * 60 * 1000; // 5 minutos entre alertas similares

/**
 * Verifica si una alerta puede ser enviada (cooldown)
 */
function canSendAlert(alertType, identifier) {
  const key = `${alertType}_${identifier}`;
  const lastSent = alertQueue.get(key);

  if (!lastSent) return true;

  return (Date.now() - lastSent) > ALERT_COOLDOWN;
}

/**
 * Marca una alerta como enviada
 */
function markAlertSent(alertType, identifier) {
  const key = `${alertType}_${identifier}`;
  alertQueue.set(key, Date.now());
}

/**
 * Envía alerta a Discord
 */
async function sendDiscordAlert(alert) {
  if (!WEBHOOK_CONFIG.discord.enabled) return;

  const embed = {
    title: `🚨 Alerta de Seguridad - ${alert.type.toUpperCase()}`,
    description: alert.message,
    color: getSeverityColor(alert.severity),
    fields: [
      {
        name: 'Severidad',
        value: alert.severity.toUpperCase(),
        inline: true
      },
      {
        name: 'Timestamp',
        value: new Date().toISOString(),
        inline: true
      }
    ],
    footer: {
      text: 'Neotesis Perú Security System'
    }
  };

  // Agregar campos adicionales si existen
  if (alert.details) {
    Object.entries(alert.details).forEach(([key, value]) => {
      if (key !== 'stack' && key !== 'error') {
        embed.fields.push({
          name: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
          value: String(value).substring(0, 100), // Limitar longitud
          inline: true
        });
      }
    });
  }

  try {
    const response = await fetch(WEBHOOK_CONFIG.discord.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        embeds: [embed]
      })
    });

    if (!response.ok) {
      console.error('Error sending Discord alert:', response.status);
    }
  } catch (error) {
    console.error('Failed to send Discord alert:', error);
  }
}

/**
 * Envía alerta a Slack
 */
async function sendSlackAlert(alert) {
  if (!WEBHOOK_CONFIG.slack.enabled) return;

  const message = {
    text: `🚨 *Alerta de Seguridad - ${alert.type.toUpperCase()}*`,
    attachments: [
      {
        color: getSeverityColor(alert.severity),
        fields: [
          {
            title: 'Mensaje',
            value: alert.message,
            short: false
          },
          {
            title: 'Severidad',
            value: alert.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Timestamp',
            value: new Date().toISOString(),
            short: true
          }
        ]
      }
    ]
  };

  // Agregar detalles adicionales
  if (alert.details) {
    const detailFields = Object.entries(alert.details)
      .filter(([key]) => !['stack', 'error'].includes(key))
      .map(([key, value]) => ({
        title: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
        value: String(value).substring(0, 100),
        short: true
      }));

    message.attachments[0].fields.push(...detailFields);
  }

  try {
    const response = await fetch(WEBHOOK_CONFIG.slack.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    });

    if (!response.ok) {
      console.error('Error sending Slack alert:', response.status);
    }
  } catch (error) {
    console.error('Failed to send Slack alert:', error);
  }
}

/**
 * Envía alerta a sistema de monitoreo genérico
 */
async function sendMonitoringAlert(alert) {
  if (!WEBHOOK_CONFIG.monitoring.enabled) return;

  const payload = {
    alert_type: alert.type,
    severity: alert.severity,
    message: alert.message,
    timestamp: new Date().toISOString(),
    source: 'neotesis-security',
    details: alert.details || {}
  };

  try {
    const response = await fetch(WEBHOOK_CONFIG.monitoring.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': process.env.MONITORING_API_KEY || ''
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      console.error('Error sending monitoring alert:', response.status);
    }
  } catch (error) {
    console.error('Failed to send monitoring alert:', error);
  }
}

/**
 * Obtiene el color correspondiente a la severidad
 */
function getSeverityColor(severity) {
  switch (severity) {
    case SEVERITY_LEVELS.LOW: return 0x00ff00; // Verde
    case SEVERITY_LEVELS.MEDIUM: return 0xffff00; // Amarillo
    case SEVERITY_LEVELS.HIGH: return 0xffa500; // Naranja
    case SEVERITY_LEVELS.CRITICAL: return 0xff0000; // Rojo
    default: return 0x000000; // Negro
  }
}

/**
 * Envía una alerta a todos los servicios configurados
 */
async function sendAlert(type, severity, message, details = {}, identifier = '') {
  // Verificar cooldown
  if (!canSendAlert(type, identifier)) {
    securityLogger.info('Alert suppressed due to cooldown', { type, identifier });
    return;
  }

  const alert = {
    type,
    severity,
    message,
    details,
    timestamp: new Date().toISOString()
  };

  // Loggear la alerta localmente
  securityLogger.warn(`ALERT_SENT: ${type}`, alert);

  // Enviar a todos los servicios configurados
  const promises = [
    sendDiscordAlert(alert),
    sendSlackAlert(alert),
    sendMonitoringAlert(alert)
  ];

  await Promise.allSettled(promises);

  // Marcar como enviada
  markAlertSent(type, identifier);
}

/**
 * Alertas predefinidas para eventos comunes
 */
const alertPresets = {
  /**
   * Alerta por intento de ataque
   */
  attackAttempt: (attackType, ip, details) => {
    sendAlert(
      ALERT_TYPES.ATTACK_ATTEMPT,
      SEVERITY_LEVELS.HIGH,
      `Intento de ataque detectado: ${attackType}`,
      { ip, attackType, ...details },
      `${attackType}_${ip}`
    );
  },

  /**
   * Alerta por IP blacklisteada
   */
  ipBlacklisted: (ip, reason) => {
    sendAlert(
      ALERT_TYPES.IP_BLACKLISTED,
      SEVERITY_LEVELS.CRITICAL,
      `IP blacklisteada automáticamente: ${ip}`,
      { ip, reason },
      ip
    );
  },

  /**
   * Alerta por abuso de rate limiting
   */
  rateLimitAbuse: (ip, endpoint) => {
    sendAlert(
      ALERT_TYPES.RATE_LIMIT_ABUSE,
      SEVERITY_LEVELS.MEDIUM,
      `Abuso de rate limiting detectado`,
      { ip, endpoint },
      `${ip}_${endpoint}`
    );
  },

  /**
   * Alerta por error de API
   */
  apiError: (endpoint, error) => {
    sendAlert(
      ALERT_TYPES.API_ERROR,
      SEVERITY_LEVELS.HIGH,
      `Error crítico en API: ${endpoint}`,
      { endpoint, error: error.message },
      endpoint
    );
  },

  /**
   * Alerta por actividad sospechosa
   */
  suspiciousActivity: (activity, ip, details) => {
    sendAlert(
      ALERT_TYPES.SUSPICIOUS_ACTIVITY,
      SEVERITY_LEVELS.MEDIUM,
      `Actividad sospechosa detectada: ${activity}`,
      { ip, activity, ...details },
      `${activity}_${ip}`
    );
  }
};

module.exports = {
  sendAlert,
  alertPresets,
  SEVERITY_LEVELS,
  ALERT_TYPES,
  WEBHOOK_CONFIG
};