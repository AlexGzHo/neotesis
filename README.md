# Neotesis Perú 🎓

Plataforma académica integral con generador de citas APA, chat PDF con IA y calculadoras estadísticas para estudiantes universitarios peruanos.

![Neotesis Hero](hero.png)

## 🌟 Características Principales

### 📚 Generación de Citas
- **Generador APA 7ma Edición**: Crea referencias bibliográficas precisas para libros, artículos y páginas web
- **Auto-Cita Inteligente**: Genera citas automáticamente desde URLs o DOIs
  - Soporte para repositorios peruanos (UCV, UPAO, UNMSM, etc.)
  - Compatible con bases de datos científicas (ScienceDirect, CrossRef, etc.)
  - Detección automática de metadatos
- **Cita en Lote**: Procesa hasta 20 URLs simultáneamente

### 🤖 Chat PDF con IA
- **Análisis Inteligente**: Usa Llama 3.3 de Groq para responder preguntas sobre tus documentos
- **Referencias Automáticas**: Cada respuesta incluye las páginas exactas del PDF de donde se extrajo la información
- **Navegación Integrada**: Haz clic en las referencias para ir directamente a la página del documento
- **Contexto Persistente**: Cada chat mantiene su propio PDF asociado
- **Gestión de Chats**: Crea, renombra y elimina chats fácilmente

### 👤 Sistema de Usuarios
- **Autenticación Segura**: Registro y login con JWT
- **Historial de Chats**: Guarda y accede a todos tus chats anteriores
- **Sincronización**: Accede a tus chats desde cualquier dispositivo

### 🎨 Interfaz Moderna
- **Notificaciones Elegantes**: Sistema de toasts para feedback visual
- **Modales Personalizados**: Confirmaciones y prompts con diseño premium
- **Responsive Design**: Optimizado para móvil y desktop
- **Menú de Opciones**: Gestiona tus chats con un menú intuitivo

### 📊 Herramientas Estadísticas
- **Calculadora de Muestra**: Determina el tamaño de muestra para investigaciones cuantitativas

## 🏗️ Arquitectura Moderna (React + Vite + Docker)

```mermaid
graph TB
    A[Cliente] -->|Browsing| B[Railway Container (Docker)]
    style B fill:#e0f2fe
    
    subgraph "Docker Container (Port 8080)"
        C[Express Backend] -->|Serves| D[React Frontend (dist/)]
        C -->|API Routes| D
        D -->|Fetch API| C
    end

    C -->|PostgreSQL Protocol| E[Railway Database]
    F[Groq API] -->|Llama 3| C
    
    style E fill:#dbeafe
    style F fill:#fef3c7
```

El proyecto ha sido migrado a una arquitectura **Fullstack con Docker**:

1.  **Frontend**: React 18 + Vite (SPA). Se compila a archivos estáticos (`dist/`) durante el build.
2.  **Backend**: Node.js + Express. Sirve tanto la API REST como los archivos estáticos del frontend.
3.  **Deployment**: Un único contenedor Docker que contiene todo.

### Seguridad
✅ **Autenticación JWT**: Tokens seguros con expiración de 7 días  
✅ **Protección CSRF & Headers**: Helmet config, rate limiting por IP  
✅ **Sanitización Nativa**: React protege contra XSS, DOMPurify sanitiza HTML  
✅ **Proxy Seguro**: El backend maneja todas las peticiones externas (Groq, Repositorios) para ocultar las API Keys

## 🚀 Deployment en Railway (Método Recomendado)

Gracias al nuevo `Dockerfile`, el despliegue es automático y robusto.

### Paso 1: Variables de Entorno
En tu proyecto de Railway, configura estas variables:
- `GROQ_API_KEY`: Tu API key de Groq AI
- `NODE_ENV`: `production`

### Paso 2: Conectar el Repositorio
1.  En Railway, selecciona "Deploy from GitHub".
2.  Elige este repositorio.
3.  Railway detectará automáticamente el `Dockerfile`.
4.  ¡Listo! El build tomará unos minutos porque Railway construirá primero el frontend y luego el backend.

---

## 💻 Desarrollo Local con Docker (Opción Fácil)

Si tienes Docker instalado, puedes levantar todo el entorno con un solo comando, sin instalar Node.js ni configurar bases de datos manualmente.

```bash
# 1. Crear archivo .env
echo "GROQ_API_KEY=tu_key_aqui" > .env

# 2. Levantar todo (App + Base de Datos)
docker-compose up --build
```
La app estará disponible en `http://localhost:8080`.

---

## 💻 Desarrollo Local Manual (Para editar código)

Si quieres modificar el código, corre el frontend y backend por separado para tener Hot Reload (HMR).

### 1. Instalar dependencias
```bash
npm install
```

### 2. Iniciar Modo Desarrollo (Terminal 1)
Inicia el backend (Express) y el frontend (Vite) simultáneamente:
```bash
npm run dev:all
# O manualmente en dos terminales:
# Terminal A: npm run dev:backend
# Terminal B: npm run dev:frontend
```

- **Frontend (UI)**: `http://localhost:5173` (Usar este para desarrollar)
- **Backend (API)**: `http://localhost:8080`

### Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia solo el Frontend (Vite) |
| `npm start` | Inicia el Backend en producción (sirve `dist/`) |
| `npm run build` | Compila el Frontend a la carpeta `dist/` |
| `npm run dev:backend` | Inicia el Backend en modo watch |

## 🔧 Troubleshooting

### "Error: ECONNREFUSED" en el Login
Asegúrate de que el backend esté corriendo (`npm run dev:backend` o `node server.js`). El frontend necesita que el backend esté activo en el puerto 8080.

### Cambios en React no se ven en el puerto 8080
El puerto 8080 sirve la versión *compilada* (`dist`). Si haces cambios en React, debes correr `npm run build` para actualizarlos allí, o simplemente usar el puerto 5173 para el desarrollo diario.
