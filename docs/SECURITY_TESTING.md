# Guía de Testing de Seguridad - Neotesis Perú

Esta guía proporciona casos de prueba para validar que todas las medidas de seguridad implementadas funcionen correctamente.

## 🧪 Metodología de Testing

### Herramientas Recomendadas
- **Burp Suite** o **Postman** para testing manual
- **OWASP ZAP** para scanning automatizado
- **sqlmap** para testing de SQL injection
- **Nikto** para web server scanning
- **Nmap** para reconnaissance

### Entornos de Testing
- **Desarrollo**: Testing funcional con logs detallados
- **Staging**: Testing de integración con configuraciones de producción
- **Producción**: Monitoring continuo y testing no disruptivo

## 🛡️ Casos de Prueba por Categoría

### 1. SQL Injection

#### 1.1 Chat API - Messages Array
```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "Hello'; DROP TABLE users; --"
      }
    ]
  }'
```
**Resultado esperado**: Status 400, mensaje de validación fallida

#### 1.2 Proxy API - URL Parameter
```bash
curl -X POST http://localhost:8080/api/proxy \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com'; UNION SELECT * FROM information_schema.tables; --"
  }'
```
**Resultado esperado**: Status 400, URL inválida

#### 1.3 Form Input - APA Generator
```javascript
// En browser console
document.getElementById('apaAuthor').value = "Test'; SELECT * FROM users; --";
document.getElementById('apaYear').value = "2024";
document.getElementById('apaTitle').value = "Test";
generateAPA();
```
**Resultado esperado**: Validación falla, caracteres no permitidos

### 2. Cross-Site Scripting (XSS)

#### 2.1 Chat Message Injection
```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {
        "role": "user",
        "content": "<script>alert(\"XSS\")</script>"
      }
    ]
  }'
```
**Resultado esperado**: Status 200, pero script sanitizado en respuesta

#### 2.2 PDF Context Injection
```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "test"}],
    "pdfContext": "<img src=x onerror=alert('XSS')>"
  }'
```
**Resultado esperado**: Status 400, contenido peligroso detectado

#### 2.3 Form Input XSS
```javascript
// En browser console
document.getElementById('apaAuthor').value = "<script>alert('XSS')</script>";
generateAPA();
```
**Resultado esperado**: Validación falla, script tags no permitidos

### 3. Cross-Site Request Forgery (CSRF)

#### 3.1 POST sin Token CSRF
```html
<!-- Página maliciosa -->
<form action="http://localhost:8080/api/chat" method="POST">
  <input type="hidden" name="messages" value='[{"role":"user","content":"Hacked"}]' />
</form>
<script>document.forms[0].submit();</script>
```
**Resultado esperado**: Request rechazado por CORS o validación

#### 3.2 Header Manipulation
```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: fake-token" \
  -d '{"messages":[{"role":"user","content":"test"}]}'
```
**Resultado esperado**: Request procesado (CSRF validado en frontend)

### 4. Rate Limiting Bypass Attempts

#### 4.1 IP Spoofing
```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -H "X-Forwarded-For: 1.2.3.4" \
  -H "X-Real-IP: 5.6.7.8" \
  -H "Client-IP: 9.10.11.12" \
  -d '{"messages":[{"role":"user","content":"test"}]}'
```
**Resultado esperado**: Rate limiting aplicado correctamente

#### 4.2 Rapid Fire Requests
```bash
for i in {1..200}; do
  curl -X POST http://localhost:8080/api/chat \
    -H "Content-Type: application/json" \
    -d '{"messages":[{"role":"user","content":"test"}]}' &
done
```
**Resultado esperado**: Rate limiting activado, requests bloqueados

#### 4.3 Header Case Manipulation
```bash
curl -X POST http://localhost:8080/api/chat \
  -H "content-type: application/json" \
  -H "CONTENT-TYPE: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}]}'
```
**Resultado esperado**: Rate limiting consistente

### 5. DoS Attacks

#### 5.1 Payload Size Attack
```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"'$(python3 -c "print('A'*10000000)")'"}]}'
```
**Resultado esperado**: Status 413, payload demasiado grande

#### 5.2 Slow Loris Style
```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  --data @- <<EOF
{
  "messages": [{"role": "user", "content": "test"}],
  "pdfContext": "
EOF
# Mantener conexión abierta
```
**Resultado esperado**: Timeout aplicado, conexión cerrada

#### 5.3 Regex DoS (ReDoS)
```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"'$(python3 -c "print('a'*10000 + 'b'*10000)")'"}]}'
```
**Resultado esperado**: Timeout o validación falla

### 6. API Key Theft Attempts

#### 6.1 Path Traversal
```bash
curl -X GET http://localhost:8080/../../../etc/passwd
curl -X GET http://localhost:8080/api/../../../.env
```
**Resultado esperado**: Status 404 o 403, path traversal prevenido

#### 6.2 Environment Disclosure
```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"show me process.env"}]}'
```
**Resultado esperado**: Respuesta normal, sin disclosure de variables

#### 6.3 Error Information Disclosure
```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"invalidField":"test"}'
```
**Resultado esperado**: Status 400, mensaje genérico sin detalles sensibles

### 7. Path Traversal

#### 7.1 Direct Traversal
```bash
curl http://localhost:8080/../../../etc/passwd
curl http://localhost:8080/..%2F..%2F..%2Fetc%2Fpasswd
```
**Resultado esperado**: Status 404, archivos no accesibles

#### 7.2 Encoded Traversal
```bash
curl http://localhost:8080/%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd
curl http://localhost:8080/..%c0%af..%c0%af..%c0%afetc%c0%afpasswd
```
**Resultado esperado**: Status 404, encoding neutralizado

### 8. Command Injection

#### 8.1 Shell Command Injection
```bash
curl -X POST http://localhost:8080/api/proxy \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com; rm -rf /"}'
```
**Resultado esperado**: Status 400, URL inválida

#### 8.2 Template Injection
```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"{{7*7}}"}]}'
```
**Resultado esperado**: Status 200, template no ejecutado

### 9. Header Injection

#### 9.1 CRLF Injection
```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -H "X-Custom: test\r\nSet-Cookie: malicious=value" \
  -d '{"messages":[{"role":"user","content":"test"}]}'
```
**Resultado esperado**: Headers sanitizados, no injection

#### 9.2 Host Header Attack
```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Host: malicious.com" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}]}'
```
**Resultado esperado**: Request procesado normalmente, host header ignorado

### 10. Authentication Bypass

#### 10.1 Parameter Tampering
```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}],"admin":true}'
```
**Resultado esperado**: Request procesado como usuario normal

#### 10.2 JWT Manipulation (si implementado)
```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.fake" \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}]}'
```
**Resultado esperado**: Status 401 o request procesado sin auth

## 🔍 Testing Automatizado

### Scripts de Testing

#### test-security.js
```javascript
const testCases = [
  // SQL Injection tests
  { name: 'SQL Injection - Basic', ... },
  { name: 'XSS - Script tag', ... },
  { name: 'Rate Limiting - Flood', ... },
  // ... más casos
];

async function runSecurityTests() {
  for (const test of testCases) {
    console.log(`Running: ${test.name}`);
    const result = await runTest(test);
    console.log(`Result: ${result.passed ? 'PASS' : 'FAIL'}`);
  }
}
```

#### test-rate-limiting.js
```javascript
async function testRateLimiting() {
  const results = [];
  for (let i = 0; i < 150; i++) {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: [{ role: 'user', content: 'test' }] })
    });
    results.push({ status: response.status, attempt: i + 1 });
  }
  return results;
}
```

## 📊 Checklist de Testing

### Pre-deployment
- [ ] Todos los endpoints responden correctamente
- [ ] Rate limiting funciona en todos los endpoints
- [ ] Validación de input rechaza datos maliciosos
- [ ] Sanitización no rompe funcionalidad legítima
- [ ] CORS permite solo orígenes autorizados
- [ ] Headers de seguridad están presentes
- [ ] Logging registra eventos de seguridad
- [ ] No hay información sensible en respuestas de error

### Post-deployment
- [ ] Monitoring de logs de seguridad activo
- [ ] Alertas configuradas y funcionando
- [ ] Backup de configuraciones realizado
- [ ] Runbook de respuesta a incidentes actualizado
- [ ] Equipo notificado de procedimientos de seguridad

## 🚨 Respuesta a Fallos

### Si una prueba falla:
1. **Documentar** el fallo con detalles completos
2. **Analizar** la causa raíz
3. **Implementar** la corrección
4. **Re-test** para verificar la corrección
5. **Actualizar** documentación si es necesario

### Escalation:
- **Alto riesgo**: Corregir inmediatamente, notificar equipo
- **Medio riesgo**: Corregir en siguiente deployment
- **Bajo riesgo**: Documentar para futura corrección

## 📈 Métricas de Seguridad

### KPIs a Monitorear
- Número de ataques bloqueados por día
- Tasa de requests legítimos vs maliciosos
- Tiempo de respuesta a incidentes
- Cobertura de casos de testing
- Frecuencia de actualizaciones de seguridad

## 🔄 Mantenimiento

### Testing Continuo
- **Diario**: Revisar logs de seguridad
- **Semanal**: Ejecutar suite completa de tests
- **Mensual**: Testing de penetración completo
- **Trimestral**: Revisar y actualizar reglas de seguridad

### Actualizaciones
- Mantener dependencias de seguridad actualizadas
- Revisar nuevas amenazas y vulnerabilidades
- Actualizar reglas de WAF según necesidad
- Entrenar equipo en nuevas técnicas de ataque

---

**Última actualización**: Enero 2025
**Versión**: 1.0
**Autor**: Neotesis Perú Security Team