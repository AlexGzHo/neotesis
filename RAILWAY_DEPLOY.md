# Guía de Despliegue en Railway 🚀

Tu proyecto ya está 100% configurado para Railway. Sigue estos pasos exactos:

## 1. Subir a GitHub
Asegúrate de que todo tu código (incluyendo el nuevo `railway.json`) esté subido a tu repositorio.

## 2. Crear Proyecto en Railway
1. Ve a [Railway.app](https://railway.app) -> **New Project** -> **Deploy from GitHub repo**.
2. Selecciona tu repositorio `neotesis`.

## 3. Añadir Base de Datos (PostgreSQL)
1. En tu proyecto de Railway, haz clic derecho en el panel vacío -> **New Service** -> **Database** -> **PostgreSQL**.
2. Railway creará automáticamente la variable `DATABASE_URL` y la conectará a tu app.

## 4. Configurar Variables de Entorno (IMPORTANTE)
Ve a la pestaña **Variables** de tu servicio (el servidor) y añade estas:

| Variable | Valor |
|----------|-------|
| `NODE_ENV` | `production` |
| `GROQ_API_KEY` | *(Tu llave de Groq)* |
| `JWT_SECRET` | *(Inventa una contraseña larga y segura)* |
| `ALLOWED_ORIGIN` | `https://<TU-DOMINIO-RAILWAY>.up.railway.app` (Una vez tengas el dominio) |

> **Nota:** Railway asigna el `PORT` automáticamente. No necesitas ponerlo.

## 5. Verificar Logs
Una vez se despliegue, ve a la pestaña **Logs**. Deberías ver:
```
✅ Conectado a la base de datos PostgreSQL
✅ Modelos sincronizados
🚀 Neotesis Perú Server corriendo en puerto XXXX
```

¡Listo! Tu aplicación estará en vivo.
