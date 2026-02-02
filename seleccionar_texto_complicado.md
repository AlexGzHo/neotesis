Aquí tienes la lista de tareas detallada para implementar la capa de texto híbrida (seleccionable sobre imágenes).

1. Preparación
[ ] Instalar Tesseract.js: Ejecutar npm install tesseract.js en la terminal.

2. Modificar el Hook (src/hooks/usePDFViewer.js)
[ ] Importar Tesseract: Asegurarse de tener import Tesseract from 'tesseract.js';.

[ ] Actualizar performOCR:

[ ] Configurar scale: 2.0 para el viewport (crucial para coincidir con la UI).

[ ] Cambiar el retorno de la función para que devuelva un objeto: { text: data.text, words: data.words }.

[ ] Actualizar extractAllText:

[ ] Modificar la lógica de almacenamiento para guardar la estructura completa.

[ ] El objeto de cada página debe tener la forma: { page: i, text: string, words: array, isOCR: boolean }.

[ ] Asegurar que el setPdfTextContent maneje correctamente la actualización progresiva sin borrar datos previos.

3. Actualizar el Visor (src/components/pdf/PDFViewer.jsx)
[ ] Localizar el loop de renderizado: Buscar donde se hace el .map para generar los componentes <PDFPage />.

[ ] Pasar la prop ocrData:

[ ] Buscar los datos de la página actual en pdfTextContent.

[ ] Añadir la prop: ocrData={pageData?.isOCR ? pageData.words : null} al componente PDFPage.

4. Actualizar la Página (src/components/pdf/PDFPage.jsx)
[ ] Definir Constante: Crear const RENDER_SCALE = 2.0; (debe ser igual al usado en el hook).

[ ] Recibir Prop: Añadir ocrData a los argumentos del componente.

[ ] Crear función renderOCRLayer:

[ ] Debe recibir words y container.

[ ] Iterar sobre cada palabra.

[ ] Crear un span por palabra.

[ ] Asignar estilos críticos: position: absolute, color: transparent, cursor: text.

[ ] Mapear las coordenadas (bbox) a los estilos top, left, width, height.

[ ] Integrar en useEffect:

[ ] Dentro de la lógica de renderizado, añadir un condicional else if (ocrData && ocrData.length > 0).

[ ] Llamar a renderOCRLayer en ese bloque.

[ ] Añadir ocrData al array de dependencias del useEffect.