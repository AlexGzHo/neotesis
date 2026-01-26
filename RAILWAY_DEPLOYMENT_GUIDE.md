# 🚂 Guía de Deployment en Railway - Neotesis Perú

Esta guía te ayudará a desplegar la plataforma Neotesis Perú en Railway paso a paso.

## 📋 Prerrequisitos

- Cuenta en [GitHub](https://github.com)
- Cuenta en [Railway](https://railway.app)
- API Key de [Groq](https://console.groq.com/)

## 📝 Paso 1: Preparar el Repositorio

### 1.1 Subir código a GitHub

```bash
# Si aún no has inicializado Git
git init
git add .
git commit -m "Initial commit - Neotesis Perú"

# Crear repositorio en GitHub y conectar
git remote add origin https://github.com/TU_USUARIO/neotesis.git
git push -u origin main
```

### 1.2 Verificar archivos de configuración

Asegúrate de que estos archivos estén presentes:
- ✅ `package.json` - Dependencias y scripts
- ✅ `server.js` - Servidor Express
- ✅ `railway.json` - Configuración de Railway
- ✅ `.env.example` - Plantilla de variables de entorno

## 🔑 Paso 2: Obtener API Key de Groq

1. Ve a [console.groq.com](https://console.groq.com/)
2. Crea una cuenta o inicia sesión
3. Ve a **API Keys** en el menú lateral
4. Haz clic en **Create API Key**
5. Copia la key (formato: `gsk_...`)

> ⚠️ **Importante**: Guarda tu API key en un lugar seguro. Nunca la subas a GitHub.

## 🚂 Paso 3: Desplegar en Railway

### 3.1 Conectar GitHub con Railway

1. Ve a [railway.app](https://railway.app/) e inicia sesión
2. Haz clic en **+ New Project**
3. Selecciona **Deploy from GitHub repo**
4. Autoriza a Railway para acceder a tus repositorios de GitHub
5. Busca y selecciona tu repositorio `neotesis`

### 3.2 Configurar Variables de Entorno

1. Una vez creado el proyecto, ve a la pestaña **Variables**
2. Haz clic en **Add Variable**
3. Agrega la siguiente variable:
   - **Key**: `GROQ_API_KEY`
   - **Value**: Tu API key de Groq (ej: `gsk_...`)
4. Haz clic en **Add**

### 3.3 Verificar el Deployment

Railway comenzará automáticamente el build y deployment. Esto puede tomar 2-3 minutos.

1. Ve a la pestaña **Deployments** para ver el progreso
2. Una vez completado, verás el status "SUCCESS"
3. En la pestaña **Settings** → **Domains**, encontrarás la URL de tu aplicación

## 🧪 Paso 4: Probar la Aplicación

### 4.1 Verificar funcionamiento básico

1. Abre la URL de Railway en tu navegador
2. Verifica que la página cargue correctamente
3. Prueba las diferentes secciones: Generador APA, Auto-Cita, etc.

### 4.2 Probar funcionalidades con API

1. Ve a **Chat con PDF**
2. Sube un archivo PDF de prueba
3. Haz una pregunta sobre el contenido
4. Verifica que la IA responda correctamente

### 4.3 Probar Auto-Cita

1. Ve a **Auto-Cita**
2. Ingresa una URL académica (ej: https://repositorio.ucv.edu.pe/handle/20.500.12672/1234)
3. Verifica que genere la cita correctamente

## 🔧 Paso 5: Troubleshooting

### Error: "GROQ_API_KEY no está configurada"

**Solución**:
1. Ve a Variables en tu proyecto de Railway
2. Verifica que `GROQ_API_KEY` esté configurada
3. Si no está, agrégala y Railway redeployará automáticamente

### Error: Build falla

**Solución**:
1. Ve a la pestaña **Deployments**
2. Haz clic en el deployment fallido
3. Revisa los logs de build
4. Comunes problemas:
   - `package.json` mal configurado
   - Dependencias faltantes
   - Errores de sintaxis en `server.js`

### Error: Aplicación no responde

**Solución**:
1. Verifica que el puerto esté configurado correctamente en `server.js`:
   ```javascript
   const PORT = process.env.PORT || 3000;
   ```
2. Railway asigna automáticamente `process.env.PORT`

### Error en Chat PDF

**Solución**:
1. Verifica que la API key de Groq sea válida
2. Revisa los logs de Railway para errores específicos
3. Verifica que el modelo `llama-3.3-70b-versatile` esté disponible

## 📊 Monitoreo y Logs

### Ver logs de la aplicación

1. Ve a tu proyecto en Railway
2. Pestaña **Deployments**
3. Haz clic en el deployment activo
4. Verás los logs en tiempo real

### Ver métricas

1. Pestaña **Metrics** para ver uso de CPU, memoria, etc.
2. Pestaña **Usage** para ver costos

## 🔄 Actualizaciones

### Actualizar la aplicación

```bash
# Haz cambios en tu código local
git add .
git commit -m "Descripción de cambios"
git push origin main
```

Railway detectará el push y redeployará automáticamente.

### Rollback

Si una actualización causa problemas:
1. Ve a **Deployments**
2. Encuentra el deployment anterior exitoso
3. Haz clic en **Rollback**

## 💰 Costos

Railway tiene un generoso free tier:
- 512 MB RAM
- 1 GB de almacenamiento
- 100 horas de uso mensual

Para uso básico de Neotesis, deberías mantenerte dentro del free tier.

## 🆘 Soporte

Si encuentras problemas:

1. Revisa esta guía
2. Verifica los logs de Railway
3. Consulta la [documentación de Railway](https://docs.railway.app/)
4. Contacta soporte de Railway si es un problema de plataforma

---

¡Tu plataforma Neotesis Perú está lista para usar! 🎓