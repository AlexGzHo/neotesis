# 🛡️ Sistema de Seguridad - Neotesis Perú

Documentación completa del sistema de seguridad implementado para proteger la aplicación Neotesis Perú contra amenazas comunes y avanzadas.

## 📋 Índice

- [Visión General](#visión-general)
- [Arquitectura de Seguridad](#arquitectura-de-seguridad)
- [Componentes de Seguridad](#componentes-de-seguridad)
- [Configuración](#configuración)
- [Monitoreo y Alertas](#monitoreo-y-alertas)
- [Testing de Seguridad](#testing-de-seguridad)
- [Respuesta a Incidentes](#respuesta-a-incidentes)
- [Mantenimiento](#mantenimiento)

## 🎯 Visión General

El sistema de seguridad de Neotesis Perú está diseñado para proteger una aplicación web con las siguientes características:

- **Frontend**: Generador de citas APA, chat con IA, calculadora estadística
- **Backend**: API REST con integración a Groq AI y proxy académico
- **Infraestructura**: Railway + Cloudflare
- **Usuarios**: Estudiantes universitarios (tráfico moderado)

### Objetivos de Seguridad

- ✅ **Confidencialidad**: Proteger datos sensibles (API keys, conversaciones)
- ✅ **Integridad**: Prevenir modificación no autorizada de datos
- ✅ **Disponibilidad**: Mantener servicio operativo ante ataques
- ✅ **Cumplimiento**: Cumplir con mejores prácticas de seguridad

### Modelo de Amenazas

**Actores principales:**
- Estudiantes curiosos
- Bots automatizados
- Atacantes oportunistas
- Actores maliciosos dirigidos

**Vectores de ataque principales:**
- Inyección (SQL, NoSQL, Command)
- XSS y CSRF
- DoS y rate limiting bypass
- API key theft
- Path traversal

## 🏗️ Arquitectura de Seguridad

### Capas de Defensa

```
┌─────────────────┐
│   Cloudflare    │ ← WAF, Rate Limiting, DDoS
├─────────────────┤
│   Application   │ ← Helmet, CORS, Validation
├─────────────────┤
│   Middleware    │ ← Sanitization, Auth, Logging
├─────────────────┤
│   Business      │ ← Core application logic
│   Logic         │
└─────────────────┘
```

### Principios de Diseño

- **Defense in Depth**: Múltiples capas de protección
- **Fail-Safe Defaults**: Denegar por defecto, permitir explícitamente
- **Zero Trust**: Validar todo, confiar en nada
- **Least Privilege**: Mínimos permisos necesarios
- **Secure by Design**: Seguridad integrada desde el inicio

## 🔧 Componentes de Seguridad

### 1. Middleware de Seguridad (`middleware/`)

#### `security.js` - Headers HTTP Seguros
- **Helmet.js**: Configuración completa de headers de seguridad
- **CSP (Content Security Policy)**: Restringe fuentes de contenido
- **HSTS**: Fuerza conexiones HTTPS
- **Anti-Clickjacking**: Headers X-Frame-Options
- **MIME Sniffing Protection**: X-Content-Type-Options

#### `rateLimiter.js` - Control de Tasa
- **Rate Limiting por Endpoint**: Diferentes límites según criticidad
- **Throttling Progresivo**: Delay creciente ante abuso
- **IP Blacklisting**: Bloqueo automático de IPs sospechosas
- **Detección de Ataques**: User agents y patrones maliciosos

#### `validator.js` - Validación de Input
- **Express Validator**: Validación robusta de datos
- **Reglas Personalizadas**: Para chat, proxy y formularios
- **Sanitización Automática**: Limpieza de inputs peligrosos
- **Mensajes de Error Seguros**: Sin información sensible

#### `sanitizer.js` - Sanitización de Datos
- **DOMPurify**: Sanitización HTML avanzada
- **Validación de URLs**: Prevención de SSRF
- **Limpieza de Texto**: Remoción de caracteres peligrosos
- **Validación de Archivos**: Nombres seguros

### 2. Utilidades de Seguridad (`utils/`)

#### `logger.js` - Sistema de Logging
- **Winston Logger**: Logging estructurado y rotativo
- **Niveles Personalizados**: error, warn, info, security, debug
- **Logs de Seguridad**: Eventos específicos de ataques
- **Middleware de Request**: Logging automático de requests

#### `alerting.js` - Sistema de Alertas
- **Webhooks Múltiples**: Discord, Slack, monitoreo genérico
- **Alertas por Severidad**: LOW, MEDIUM, HIGH, CRITICAL
- **Cooldown de Alertas**: Prevención de spam
- **Alertas Predefinidas**: Para eventos comunes

### 3. Configuración Centralizada (`config/`)

#### `security.config.js` - Configuración Unificada
- **Variables de Entorno**: Validación al inicio
- **Límites Configurables**: Rate limiting, payloads, timeouts
- **Dominios Permitidos**: Lista blanca para proxy
- **Settings de Seguridad**: Centralizados y documentados

#### `cloudflare.md` - Guía de Cloudflare
- **Configuración Paso a Paso**: WAF, rate limiting, SSL
- **Reglas Personalizadas**: Para protección específica
- **Monitoreo**: Analytics y alertas
- **Mejores Prácticas**: Para mantenimiento continuo

### 4. Seguridad Frontend (`scripts.js`)

#### Sanitización de Input
- **DOMPurify**: Sanitización de mensajes de chat
- **Validación de Formularios**: Antes de envío al servidor
- **Limpieza de Citations**: Contenido generado por IA

#### Protección CSRF
- **Tokens CSRF**: Para requests POST
- **Validación Automática**: En llamadas API
- **Secure Fetch**: Wrapper seguro para fetch

#### Gestión de Sesión
- **Timeout de Sesión**: 30 minutos de inactividad
- **Limpieza Automática**: Datos sensibles al expirar
- **Monitoreo de Actividad**: Reset automático de timer

### 5. Seguridad de API

#### Endpoints Protegidos
- **`/api/chat`**: Rate limiting estricto, validación completa
- **`/api/proxy`**: Dominios permitidos, sanitización de URLs
- **Validación de Payloads**: Tamaño, estructura, contenido

#### Protección de API Keys
- **Variables de Entorno**: No hardcoded
- **Validación al Inicio**: Fail-fast si faltan
- **Logging Seguro**: Sin exposure en logs

## ⚙️ Configuración

### Variables de Entorno (.env)

```bash
# Básico
GROQ_API_KEY=your_key_here
NODE_ENV=production
ALLOWED_ORIGIN=https://neotesisperu.online

# Alertas (opcional)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
MONITORING_WEBHOOK_URL=https://your-monitor.com/webhook

# Configuración
DISABLE_QUOTA=false
LOG_LEVEL=info
```

### Configuración de Cloudflare

Ver `config/cloudflare.md` para instrucciones detalladas.

### Verificación de Configuración

```bash
# Validar configuración
node -e "require('./config/security.config.js')"

# Verificar dependencias
npm audit

# Test básico
npm test
```

## 📊 Monitoreo y Alertas

### Logs de Seguridad

Los logs se almacenan en `logs/` con rotación automática:

- `security.log`: Eventos de seguridad
- `error.log`: Errores de aplicación
- `combined.log`: Todos los logs

### Alertas Configurables

**Severidades:**
- **LOW**: Eventos informativos
- **MEDIUM**: Actividad sospechosa
- **HIGH**: Intentos de ataque
- **CRITICAL**: Brechas de seguridad

**Canales:**
- **Discord**: Alertas críticas con embeds
- **Slack**: Notificaciones generales
- **Monitoring**: Integración con sistemas externos

### Dashboard de Monitoreo

```javascript
// Ejemplo de métricas a monitorear
const metrics = {
  requestsBlocked: 0,
  attacksDetected: 0,
  rateLimitHits: 0,
  validationFailures: 0,
  averageResponseTime: 0
};
```

## 🧪 Testing de Seguridad

Ver `SECURITY_TESTING.md` para casos de prueba completos.

### Testing Automatizado

```bash
# Ejecutar tests de seguridad
npm run test:security

# Testing de penetración básico
npm run test:penetration

# Validación de configuración
npm run validate:config
```

### Checklist de Seguridad

#### Pre-deployment
- [ ] Configuración validada
- [ ] Tests de seguridad pasan
- [ ] Dependencias auditadas
- [ ] Secrets rotados

#### Post-deployment
- [ ] Logs funcionando
- [ ] Alertas configuradas
- [ ] Monitoreo activo
- [ ] Backup de configuración

## 🚨 Respuesta a Incidentes

### Procedimiento de Respuesta

1. **Detección**: Alertas automáticas o monitoreo manual
2. **Evaluación**: Severidad y alcance del incidente
3. **Contención**: Bloquear IPs, ajustar reglas
4. **Erradicación**: Remover causa raíz
5. **Recuperación**: Restaurar servicios
6. **Lección**: Documentar y mejorar

### Contactos de Emergencia

- **Security Team**: security@neotesisperu.online
- **Infrastructure**: infra@neotesisperu.online
- **Legal**: legal@neotesisperu.online

### Runbook de Incidentes

Ver `docs/incident-response.md` para procedimientos detallados.

## 🔄 Mantenimiento

### Actualizaciones de Seguridad

```bash
# Actualizar dependencias
npm audit fix

# Verificar vulnerabilidades
npm audit

# Actualizar configuración
git pull origin main
```

### Revisiones Periódicas

- **Diaria**: Logs de seguridad
- **Semanal**: Tests de seguridad
- **Mensual**: Auditoría completa
- **Trimestral**: Revisión de arquitectura

### Capacitación

- **Equipo técnico**: Mejores prácticas de seguridad
- **Usuarios**: Conciencia de seguridad
- **Administradores**: Procedimientos de respuesta

## 📈 Métricas y KPIs

### Métricas de Seguridad

- **Disponibilidad**: 99.9% uptime
- **Tasa de Bloqueo**: < 0.1% de requests legítimos bloqueados
- **Tiempo de Respuesta**: < 5 minutos para incidentes críticos
- **Cobertura de Tests**: > 95% de casos de ataque

### Reportes

- **Semanal**: Resumen de eventos de seguridad
- **Mensual**: Análisis de tendencias
- **Anual**: Revisión completa de seguridad

## 📚 Referencias

### Estándares y Frameworks

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)
- [ISO 27001](https://www.iso.org/standard/54534.html)

### Herramientas

- [OWASP ZAP](https://www.zaproxy.org/)
- [Burp Suite](https://portswigger.net/burp)
- [Nikto](https://cirt.net/Nikto2)

### Recursos Adicionales

- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Cloudflare Security](https://www.cloudflare.com/security/)

---

## 📞 Soporte

Para preguntas sobre seguridad o reportar vulnerabilidades:

- **Email**: security@neotesisperu.online
- **Issues**: [GitHub Security](https://github.com/neotesis-peru/security/issues)
- **Docs**: [Wiki de Seguridad](https://github.com/neotesis-peru/security/wiki)

**Última actualización**: Enero 2025
**Versión**: 1.0
**Autor**: Neotesis Perú Security Team