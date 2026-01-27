# Guía de Configuración de Cloudflare para Neotesis Perú

Esta guía proporciona instrucciones paso a paso para configurar Cloudflare y proteger tu aplicación desplegada en Railway.

## 📋 Requisitos Previos

- Cuenta activa en Cloudflare
- Dominio registrado (neotesisperu.online)
- Aplicación desplegada en Railway
- Acceso administrativo a Cloudflare

## 🚀 Configuración Inicial

### 1. Agregar Sitio a Cloudflare

1. Inicia sesión en [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Haz clic en "Add a Site"
3. Ingresa tu dominio: `neotesisperu.online`
4. Selecciona el plan gratuito (suficiente para esta aplicación)
5. Cloudflare escaneará tus registros DNS
6. Actualiza los nameservers en tu registrador de dominio

### 2. Configurar DNS

En la sección DNS de Cloudflare:

1. Agrega un registro CNAME:
   - **Type**: CNAME
   - **Name**: @
   - **Target**: `neotesis-peru.up.railway.app`
   - **Proxy status**: Proxied (naranja)

2. Agrega un registro CNAME para www (opcional):
   - **Type**: CNAME
   - **Name**: www
   - **Target**: `neotesis-peru.up.railway.app`
   - **Proxy status**: Proxied

## 🛡️ Configuración de Seguridad

### 3. Web Application Firewall (WAF)

1. Ve a **Security** > **WAF**
2. Asegúrate de que WAF esté **Enabled**
3. Configura las reglas:

#### Reglas Personalizadas

Crea las siguientes reglas de firewall:

**Bloquear SQL Injection:**
```
(http.request.uri.path contains "api/") and (http.request.method eq "POST") and (http.request.body contains "union" or http.request.body contains "select" or http.request.body contains "drop" or http.request.body contains "delete")
```
- **Action**: Block
- **Sensitivity**: High

**Bloquear XSS Attempts:**
```
(http.request.uri.path contains "api/") and (http.request.method eq "POST") and (http.request.body contains "<script" or http.request.body contains "javascript:" or http.request.body contains "onload=")
```
- **Action**: Block
- **Sensitivity**: High

**Rate Limiting por IP:**
```
(http.request.uri.path contains "api/chat") and (http.request.method eq "POST")
```
- **Action**: Rate Limiting
- **Requests**: 50
- **Period**: 1 hour
- **Action when exceeded**: Block for 1 hour

### 4. Rate Limiting

1. Ve a **Security** > **Rate limiting**
2. Crea reglas de rate limiting:

**API Endpoints:**
- **URL Pattern**: `*neotesisperu.online/api/*`
- **Requests**: 100
- **Period**: 1 minute
- **Action**: Block
- **Duration**: 10 minutes

**Chat API específico:**
- **URL Pattern**: `*neotesisperu.online/api/chat`
- **Requests**: 30
- **Period**: 1 hour
- **Action**: Block
- **Duration**: 1 hour

### 5. Bot Fight Mode

1. Ve a **Security** > **Bots**
2. Activa **Bot Fight Mode**
3. Configura **Super Bot Fight Mode** si tienes el plan Pro

### 6. DDoS Protection

1. Ve a **Security** > **DDoS**
2. Asegúrate de que esté activado (viene por defecto)
3. Configura reglas personalizadas si es necesario

## 🔒 SSL/TLS Configuration

### 7. Configurar SSL

1. Ve a **SSL/TLS** > **Overview**
2. Selecciona **Full (strict)** mode
3. Asegúrate de que tu certificado SSL de Railway esté configurado

### 8. Edge Certificates

1. Ve a **SSL/TLS** > **Edge Certificates**
2. Activa:
   - Always Use HTTPS
   - Automatic HTTPS Rewrites
   - Opportunistic Encryption

## 🎯 Page Rules (Legacy - Considerar Rules)

### 9. Configurar Page Rules

Si usas Page Rules (legacy), crea las siguientes reglas:

**Protección de API endpoints:**
- **URL**: `*neotesisperu.online/api/*`
- **Settings**:
  - Security Level: High
  - Cache Level: Bypass
  - Browser Integrity Check: On

**Protección de archivos estáticos:**
- **URL**: `*neotesisperu.online/*.js`
- **Settings**:
  - Security Level: Medium
  - Cache Level: Standard

## 📊 Monitoreo y Analytics

### 10. Configurar Analytics

1. Ve a **Analytics** > **Traffic**
2. Revisa métricas de seguridad en **Security** > **Events**

### 11. Alertas de Seguridad

1. Ve a **Notifications**
2. Configura alertas para:
   - WAF attacks
   - Rate limiting triggered
   - DDoS attacks
   - SSL certificate expiration

## 🔧 Configuración Avanzada

### 12. Custom Rules (Si tienes plan Pro/Paid)

Crea reglas personalizadas en **Rules** > **Custom Rules**:

**Bloquear user agents sospechosos:**
```
(http.user_agent contains "sqlmap") or (http.user_agent contains "nmap") or (http.user_agent contains "nikto")
```
- **Action**: Block

**Limitar payload size:**
```
(http.request.body.size > 10485760)
```
- **Action**: Block

### 13. Workers (Opcional)

Si necesitas lógica personalizada, puedes crear Cloudflare Workers para:

- Validación adicional de requests
- Modificación de headers
- Logging personalizado

## ✅ Verificación

### 14. Probar la Configuración

1. **SSL Labs Test**: https://www.ssllabs.com/ssltest/
2. **Security Headers Test**: https://securityheaders.com/
3. **WAF Test**: Intenta requests maliciosos para verificar bloqueo
4. **Rate Limiting Test**: Excede los límites para verificar funcionamiento

### 15. Monitoreo Continuo

- Revisa regularmente los logs de seguridad en Cloudflare
- Configura alertas por email/Slack para eventos críticos
- Actualiza las reglas según nuevas amenazas detectadas

## 🚨 Respuesta a Incidentes

### Si detectas un ataque:

1. Revisa los logs en **Security** > **Events**
2. Bloquea IPs específicas si es necesario
3. Ajusta reglas de WAF/rate limiting
4. Contacta a Cloudflare support si es un ataque masivo

## 📚 Recursos Adicionales

- [Cloudflare Learning Center](https://www.cloudflare.com/learning/)
- [Cloudflare Security](https://www.cloudflare.com/security/)
- [OWASP Cheat Sheet](https://cheatsheetseries.owasp.org/)

## ⚠️ Notas Importantes

- Las configuraciones pueden tardar hasta 24 horas en propagarse
- Prueba todas las funcionalidades después de cambios
- Mantén backups de tu configuración
- Revisa regularmente por nuevas amenazas y actualizaciones

---

**Última actualización**: Enero 2025
**Versión**: 1.0
**Autor**: Neotesis Perú Security Team