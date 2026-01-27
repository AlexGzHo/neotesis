# API de Autenticación - Neotesis Perú

## Descripción General

Este documento describe los endpoints de autenticación disponibles en la API de Neotesis Perú. Todos los endpoints están bajo el prefijo `/api/auth`.

---

## Endpoints Disponibles

### 1. Registro de Usuario

**POST** `/api/auth/register`

Registra un nuevo usuario en el sistema.

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña_segura_123",
  "name": "Juan Pérez"
}
```

**Validaciones:**
- `email`: Debe ser un correo electrónico válido
- `password`: Mínimo 8 caracteres
- `name`: Entre 2 y 100 caracteres

**Respuesta Exitosa (201):**
```json
{
  "success": true,
  "message": "Usuario registrado exitosamente",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-del-usuario",
    "email": "usuario@ejemplo.com",
    "name": "Juan Pérez"
  }
}
```

**Errores:**
- `400`: Datos inválidos o usuario ya existe
- `500`: Error del servidor

---

### 2. Inicio de Sesión

**POST** `/api/auth/login`

Inicia sesión y devuelve un token JWT.

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "usuario@ejemplo.com",
  "password": "contraseña_segura_123"
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "message": "Inicio de sesión exitoso",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid-del-usuario",
    "email": "usuario@ejemplo.com",
    "name": "Juan Pérez",
    "role": "user"
  }
}
```

**Errores:**
- `400`: Datos inválidos
- `401`: Credenciales incorrectas
- `500`: Error del servidor

---

### 3. Obtener Usuario Actual

**GET** `/api/auth/me`

Obtiene la información del usuario autenticado actual. Requiere autenticación.

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Respuesta Exitosa (200):**
```json
{
  "user": {
    "id": "uuid-del-usuario",
    "email": "usuario@ejemplo.com",
    "name": "Juan Pérez",
    "role": "user"
  },
  "quota": {
    "requests_used": 5,
    "tokens_used": 15000,
    "reset_date": "2025-01-28T10:30:00.000Z"
  }
}
```

**Errores:**
- `401`: Token no proporcionado o inválido
- `500`: Error del servidor

---

## Uso en el Frontend

### Registro
```javascript
async function register(email, password, name) {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name })
  });
  
  const data = await response.json();
  
  if (data.success) {
    localStorage.setItem('auth_token', data.token);
    return data.user;
  }
  
  throw new Error(data.message || 'Error en el registro');
}
```

### Inicio de Sesión
```javascript
async function login(email, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (data.success) {
    localStorage.setItem('auth_token', data.token);
    return data.user;
  }
  
  throw new Error(data.message || 'Credenciales inválidas');
}
```

### Obtener Usuario Actual
```javascript
async function getCurrentUser() {
  const token = localStorage.getItem('auth_token');
  
  if (!token) {
    return null;
  }
  
  const response = await fetch('/api/auth/me', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  const data = await response.json();
  return data.user;
}
```

### Uso en Requests Protegidos
```javascript
async function sendChatMessage(messages) {
  const token = localStorage.getItem('auth_token');
  
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ messages })
  });
  
  return response.json();
}
```

### Cerrar Sesión
```javascript
function logout() {
  localStorage.removeItem('auth_token');
  // Redirigir a la página principal
  window.location.href = '/';
}
```

---

## Verificar Estado de Autenticación

### GET /api/v4/user

Este endpoint permite verificar si el usuario está autenticado sin requerir un token (autenticación opcional).

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (opcional)
```

**Respuesta Autenticado (200):**
```json
{
  "authenticated": true,
  "user": {
    "id": "uuid-del-usuario",
    "email": "usuario@ejemplo.com",
    "name": "Juan Pérez",
    "role": "user"
  }
}
```

**Respuesta No Autenticado (200):**
```json
{
  "authenticated": false,
  "user": null
}
```

---

## Notas de Seguridad

1. **Tokens JWT**: Los tokens expiran en 7 días
2. **Contraseñas**: Se almacenan usando bcrypt con 10 rounds de sal
3. **CORS**: Solo se permite el origen configurado en `ALLOWED_ORIGIN`
4. **Rate Limiting**: Los endpoints tienen límites de tasa para prevenir ataques

---

## Variables de Entorno Requeridas

Asegúrate de configurar las siguientes variables:

```bash
JWT_SECRET=tu_secret_seguro_minimo_32_caracteres
DATABASE_URL=postgresql://user:password@host:port/database
```
