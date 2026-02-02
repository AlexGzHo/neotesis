1. Estabilización de Dependencias (package.json)
El uso de versiones inestables es el primer punto de fallo en entornos de producción.

[ ] Downgrade de Multer: Cambia "multer": "^2.0.2" por "multer": "^1.4.5-lts.1". La versión 2.x es una alpha inestable y su API de manejo de archivos temporales suele dar errores de permisos en contenedores Alpine.

[ ] Limpieza de Tesseract: Elimina "tesseract.js": "^7.0.0". Al usar ocrmypdf a nivel de sistema en Docker, esta librería de Node.js es redundante, aumenta el peso de la imagen y puede causar conflictos de memoria.

[ ] Actualizar Scripts: Asegúrate de que el comando build de Vite esté correctamente configurado para generar la carpeta dist que el servidor busca.

2. Optimización de Infraestructura (Dockerfile)
Tu imagen actual es demasiado pesada y reinstala herramientas innecesarias en la etapa final.

[ ] Instalación Eficiente en Etapa 2: Modifica la etapa de producción para instalar dependencias y limpiar binarios de compilación en un solo comando RUN para reducir capas.

[ ] Persistencia del PATH: Asegúrate de que el ENV PATH="/opt/venv/bin:$PATH" esté definido después de la instalación de ocrmypdf para que el sistema reconozca el comando globalmente.

[ ] Permisos de Carpeta: Añade RUN chmod -R 777 /app/uploads para evitar errores de Multer al intentar escribir archivos temporales en el sistema de archivos del contenedor.

3. Refactorización de la Lógica OCR (services/ocrService.js)
El servicio actual tiene riesgos de bloqueo y manejo de nombres de archivos frágil.

[ ] Corrección de Extensiones: Cambia outputPath.replace('.pdf', '.txt') por una implementación con el módulo path: path.join(path.parse(outputPath).dir, path.parse(outputPath).name + '.txt'). Esto evita errores si el archivo original tiene ".pdf" en medio del nombre.

[ ] Optimización de Jobs: Cambia jobs = 1 por un valor dinámico basado en los recursos del servidor (ej. Math.max(1, os.cpus().length - 1)) para acelerar el procesamiento en documentos largos.

[ ] Timeout de Tesseract: Aumenta --tesseract-timeout a 600 (10 minutos) en el array args para manejar documentos con imágenes de muy alta resolución o escaneos complejos.

4. Flujo Automático en el Backend (routes/ocr.js)
Para que sea "automático", el backend debe decidir inteligentemente cuándo actuar.

[ ] Mejorar "Smart Check": En la función checkTextWithPdfJs, si PDF.js falla al leer (error de fuentes), asume que necesita OCR en lugar de simplemente loguear el error.

[ ] Manejo de Cleanup (Garantía): Envuelve el bloque de res.download en un try/finally para asegurar que unlinkAsync se ejecute incluso si la descarga es cancelada por el usuario.

[ ] Validación de PDF Encriptados: Implementa una detección previa. ocrmypdf fallará si el PDF tiene contraseña; el backend debe atrapar este error específico y devolver un mensaje claro al frontend ("PDF protegido") en lugar de un error 500 genérico.

5. Integración y UX en el Frontend (React)
El OCR es lento; el frontend debe estar preparado para esperas largas.

[ ] Timeout de Red: En tu servicio de API de React, configura un timeout de al menos 5 minutos para la petición de OCR. El valor por defecto de muchos navegadores (2 min) cortará la conexión antes de que termine el proceso.

[ ] Estado de Progreso Real: En el componente de carga (ej. AIChat.jsx), no uses un spinner genérico. Implementa mensajes de estado: "1. Analizando texto...", "2. Aplicando OCR (esto puede tardar)...", "3. Optimizando PDF...".

[ ] Auto-Trigger: Al subir un documento en el frontend, realiza una pequeña petición HEAD o un primer intento de lectura. Si el texto extraído es vacío, dispara automáticamente la ruta /api/ocr antes de abrir el chat.

6. Configuración de Servidor (server.js)
[ ] Ajuste de Payload: Verifica que SECURITY_CONFIG.PAYLOAD.MAX_SIZE sea al menos de 50MB para permitir la subida de libros o documentos escaneados pesados.

[ ] Persistencia de Conexión: Mantén server.setTimeout(600000) para que Node.js no cierre el socket mientras ocrmypdf está trabajando intensivamente en segundo plano.