# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [2.0.0] - 2026-01-29

### 🎉 Añadido

#### Sistema de Autenticación
- Sistema completo de autenticación con JWT
- Registro de usuarios con validación de email y contraseña
- Login con tokens seguros
- Persistencia de sesión con localStorage
- Middleware de autenticación en el backend
- Protección de rutas API con tokens Bearer

#### Gestión de Chats
- Menú de opciones del chat (tres puntos)
- Función de renombrar chat con modal personalizado
- Función de eliminar chat con confirmación
- Historial de chats en sidebar
- Creación automática de chats al enviar primer mensaje
- Asociación de PDFs con chats específicos
- Carga de contexto PDF al cambiar entre chats

#### Sistema de Notificaciones
- Toast notifications modernas y elegantes
- Tipos de notificaciones: success, error, info, warning
- Animaciones suaves de entrada y salida
- Auto-dismiss después de 5 segundos
- Posicionamiento responsive (top-right en desktop, bottom en móvil)
- Reemplazo completo de `alert()` nativo

#### Modales de Confirmación
- Modal de confirmación personalizado
- Diseño premium con iconos y animaciones
- Botón rojo de acción para operaciones destructivas
- Cierre con ESC o clic fuera del modal
- Promise-based para fácil integración

#### Referencias PDF Mejoradas
- Extracción automática de referencias de páginas
- Botones clicables para navegar a páginas específicas
- Visualización consistente en todos los mensajes (nuevos y cargados)
- Algoritmo heurístico de fallback para identificar páginas relevantes
- Indicadores visuales de línea aproximada en el documento

#### Mejoras de UI/UX
- Diseño responsive optimizado para móvil
- Navegación principal mejorada con hover effects
- Sidebar de historial con overlay en móvil
- Botón de compartir chat
- Indicadores de estado (guardado/no guardado)
- Animaciones y transiciones suaves
- Iconos Material Icons y Font Awesome

### 🔧 Cambiado

- Migración de Netlify Functions a Express.js en Railway
- Refactorización del sistema de mensajes para usar `renderAIMessageWithReferences()`
- Mejora del sistema de rate limiting con almacenamiento en base de datos
- Optimización del manejo de sesiones y timeouts
- Actualización de estilos CSS para mayor consistencia

### 🐛 Corregido

- Referencias PDF que solo aparecían en el primer mensaje
- Navegación a páginas PDF que no funcionaba en mensajes cargados
- Problema de contexto PDF al cambiar entre chats
- Alertas nativas que bloqueaban la interfaz
- Problemas de responsive en móvil
- Errores de validación en formularios

### 🔐 Seguridad

- Implementación de bcrypt para hash de contraseñas
- Tokens JWT con expiración de 7 días
- Validación y sanitización de todas las entradas
- Protección CSRF con tokens
- Headers de seguridad (CSP, X-Frame-Options)
- Rate limiting por IP en endpoints críticos

## [1.0.0] - 2026-01-27

### 🎉 Añadido

#### Características Iniciales
- Generador de citas APA 7ma edición
- Auto-cita desde URLs y DOIs
- Soporte para repositorios peruanos (UCV, UPAO, UNMSM, etc.)
- Calculadora de muestra estadística
- Chat PDF con IA (Llama 3.3 via Groq)
- Visor de PDF integrado con navegación
- Sistema de cuotas (3 consultas/24h)

#### Infraestructura
- Servidor Express.js
- Base de datos PostgreSQL con Sequelize
- Deployment en Railway
- Variables de entorno seguras
- Logging con Winston

### 🔧 Cambiado

- Migración de arquitectura serverless a servidor tradicional
- Implementación de base de datos relacional

---

## Tipos de Cambios

- `🎉 Añadido` para nuevas características
- `🔧 Cambiado` para cambios en funcionalidad existente
- `🗑️ Deprecado` para características que serán removidas
- `🐛 Corregido` para corrección de bugs
- `🔐 Seguridad` para mejoras de seguridad
- `🚀 Rendimiento` para mejoras de rendimiento
