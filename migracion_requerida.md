Necesito que migres completamente mi proyecto Neotesis Perú de HTML/CSS/JS vanilla a React + Vite con arquitectura moderna y PDF.js nativo.
🎯 Objetivo Principal
Crear una SPA React profesional manteniendo:

✅ Toda la funcionalidad actual (generador APA, chat IA, calculadora, PDF)
✅ El diseño visual exacto (styles.css como base)
✅ El backend Express sin cambios
✅ Todas las medidas de seguridad implementadas
✅ PDF.js nativo con pdfjs-dist para renderizado optimizado

📦 Stack Tecnológico
json{
  "frontend": {
    "framework": "React 18.2",
    "bundler": "Vite 5.0",
    "routing": "React Router DOM 6.20",
    "pdf": "pdfjs-dist 3.11.174",
    "sanitization": "DOMPurify 3.0.8"
  },
  "backend": {
    "mantener": "server.js + middleware + config + utils (SIN CAMBIOS)"
  }
}
```

## 🏗️ Arquitectura de Carpetas
```
neotesis-react/
├── public/
│   ├── hero.png
│   └── pdf.worker.js (copiar de node_modules/pdfjs-dist/build/)
│
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.jsx          // Navegación principal
│   │   │   ├── Footer.jsx          // Footer
│   │   │   └── MainLayout.jsx      // Layout wrapper
│   │   │
│   │   ├── landing/
│   │   │   ├── HeroSection.jsx     // Sección hero
│   │   │   ├── TrustBar.jsx        // Logos universidades
│   │   │   ├── ToolsGrid.jsx       // Grid de herramientas
│   │   │   └── LandingPage.jsx     // Page completa
│   │   │
│   │   ├── citation/
│   │   │   ├── CitationTools.jsx   // Container con tabs
│   │   │   ├── SingleCitation.jsx  // Auto-cita individual
│   │   │   ├── BatchCitation.jsx   // Cita en lote
│   │   │   ├── ManualAPA.jsx       // Generador manual
│   │   │   └── ResultBox.jsx       // Componente de resultado
│   │   │
│   │   ├── calculator/
│   │   │   └── SampleCalculator.jsx // Calculadora de muestra
│   │   │
│   │   ├── pdf/
│   │   │   ├── PDFChat.jsx         // Container principal
│   │   │   ├── PDFViewer.jsx       // ⭐ CRÍTICO: Visor con canvas
│   │   │   ├── ChatPanel.jsx       // Panel de mensajes
│   │   │   ├── QuotaMonitor.jsx    // Monitor de cuotas
│   │   │   └── MessageBubble.jsx   // Bubble individual
│   │   │
│   │   └── common/
│   │       ├── Button.jsx          // Botón reutilizable
│   │       ├── Input.jsx           // Input reutilizable
│   │       ├── LoadingSpinner.jsx  // Spinner
│   │       └── ErrorBoundary.jsx   // Error boundary
│   │
│   ├── hooks/
│   │   ├── usePDFViewer.js        // ⭐ CRÍTICO: Lógica PDF.js
│   │   ├── useQuota.js            // Gestión de cuotas
│   │   ├── useCitation.js         // Lógica de citación
│   │   ├── useChat.js             // Lógica de chat IA
│   │   ├── useSecureFetch.js      // Fetch con sanitización
│   │   └── useSession.js          // Timeout de sesión
│   │
│   ├── services/
│   │   ├── api.js                 // API calls centralizadas
│   │   ├── pdfService.js          // Servicios PDF
│   │   └── citationService.js     // Servicios de citación
│   │
│   ├── utils/
│   │   ├── sanitization.js        // Funciones sanitización
│   │   ├── security.js            // CSRF, validación
│   │   ├── citation.js            // Formateo APA
│   │   └── constants.js           // Constantes globales
│   │
│   ├── styles/
│   │   ├── global.css             // Migración de styles.css
│   │   └── variables.css          // CSS variables
│   │
│   ├── App.jsx                    // App principal con Router
│   ├── main.jsx                   // Entry point
│   └── config.js                  // Configuración frontend
│
├── server.js                      // ⚠️ BACKEND SIN CAMBIOS
├── middleware/                    // ⚠️ SIN CAMBIOS
├── config/                        // ⚠️ SIN CAMBIOS
├── utils/                         // ⚠️ SIN CAMBIOS (backend)
├── package.json                   // Backend dependencies
├── vite.config.js                 // Config de Vite
└── .env.example
🔑 Componentes y Hooks Críticos
1. Hook: usePDFViewer.js
Responsabilidades:

Cargar PDF con pdfjsLib.getDocument()
Mantener estado: pdfDocument, currentPage, totalPages, zoom
Renderizar páginas en canvas usando page.render()
Extraer texto con page.getTextContent()
Navegación: nextPage(), prevPage(), goToPage(n)
Zoom: zoomIn(), zoomOut(), setZoom(value)
Retornar: canvasRef, estados, funciones de control, pdfTextByPage[]

Configuración obligatoria:
javascriptpdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';
2. Componente: PDFViewer.jsx
Estructura:

Header con botón de upload + status
Canvas (ref desde usePDFViewer)
Placeholder cuando no hay PDF
Navegación: prev/next/zoom controls
Usar <canvas ref={canvasRef} /> para renderizado

3. Hook: useQuota.js
Responsabilidades:

Leer/escribir localStorage: neotesis_quota
Estado: { count, firstUsed }
Calcular: isAvailable, remaining, percentUsed, timeRemaining
Funciones: incrementQuota(), resetQuota()
Auto-reset después de 24h
Countdown interval para UI

4. Hook: useChat.js
Responsabilidades:

Mantener historial de mensajes: history[]
Estado: loading, error
Función: sendMessage(content) que llama a /api/chat
Integrar con useQuota para verificar disponibilidad
Sanitizar inputs/outputs con DOMPurify
Parsear referencias del PDF en respuestas IA

5. Hook: useCitation.js
Responsabilidades:

Migrar toda la lógica de unifiedExtractMetadata()
Estados: loading, error, result
Funciones:

fetchSingleCitation(url)
fetchBatchCitations(urls[])
generateManualAPA(metadata)


Llamar a /api/proxy para scraping
Formatear según APA 7ma edición

6. Service: api.js
Estructura:
javascriptexport const api = {
  chat: {
    sendMessage: (messages, pdfContext) => fetch('/api/chat', ...)
  },
  proxy: {
    fetchURL: (url) => fetch('/api/proxy', ...)
  },
  // Todos los endpoints centralizados
}
7. App.jsx con React Router
Rutas:
javascript<Routes>
  <Route path="/" element={<LandingPage />} />
  <Route path="/citation-tools" element={<CitationTools />} />
  <Route path="/sample-calculator" element={<SampleCalculator />} />
  <Route path="/ai-chat" element={<PDFChat />} />
</Routes>
8. Componente: QuotaMonitor.jsx
Props: { quota, isAvailable, remaining, percentUsed, timeRemaining }

Barra de progreso
Status badge (activo/inactivo)
Countdown cuando está bloqueado
Estilos del diseño actual

9. Hook: useSecureFetch.js
Responsabilidades:

Wrapper de fetch con:

CSRF token
Headers de seguridad
Sanitización automática
Error handling
Timeout de sesión



10. vite.config.js
Configuración:

Plugin React
Alias: @, @components, @hooks, @utils, @services
Proxy: /api → http://localhost:8080
Build: chunks separados para pdfjs-dist y vendors
optimizeDeps: { include: ['pdfjs-dist'] }

📝 Pasos de Implementación
Fase 1: Setup Inicial

Crear proyecto Vite con template React
Instalar dependencias: react-router-dom, pdfjs-dist, dompurify
Copiar pdf.worker.js a public/
Configurar vite.config.js con proxy y aliases
Migrar styles.css → src/styles/global.css

Fase 2: Estructura Base

Crear estructura de carpetas completa
Implementar MainLayout.jsx con Header + Footer
Configurar React Router en App.jsx
Crear páginas vacías (LandingPage, CitationTools, etc.)

Fase 3: Hooks Críticos

Implementar usePDFViewer.js con toda la lógica PDF.js
Implementar useQuota.js con localStorage y countdown
Implementar useChat.js integrando PDF context
Implementar useCitation.js migrando lógica de citación
Implementar useSecureFetch.js con validaciones

Fase 4: Componentes PDF (Crítico)

PDFViewer.jsx usando usePDFViewer hook
ChatPanel.jsx con mensajes y input
QuotaMonitor.jsx con barra y countdown
PDFChat.jsx integrando todos los anteriores

Fase 5: Componentes Restantes

Landing: HeroSection, TrustBar, ToolsGrid
Citation: SingleCitation, BatchCitation, ManualAPA
Calculator: SampleCalculator
Common: Button, Input, LoadingSpinner

Fase 6: Servicios y Utils

api.js con todos los endpoints
sanitization.js con funciones de limpieza
security.js con CSRF y validación
citation.js con formateo APA

Fase 7: Integration

Conectar todos los componentes con hooks
Testear flujos completos
Verificar responsive design
Validar seguridad (sanitización, CSRF, etc.)

Fase 8: Backend Integration

Actualizar server.js para servir build de React en producción:

javascriptif (NODE_ENV === 'production') {
  app.use(express.static('dist'));
  app.get('*', (req, res) => res.sendFile('dist/index.html'));
}

Mantener todas las rutas API sin cambios
Configurar scripts en package.json:

json{
  "scripts": {
    "dev:frontend": "vite",
    "dev:backend": "node server.js",
    "build": "vite build",
    "start": "node server.js"
  }
}
⚠️ Requisitos Críticos

PDF.js Worker: DEBE configurarse con GlobalWorkerOptions.workerSrc
Canvas Rendering: Usar refs y renderizar en useEffect
Cuotas: Sistema idéntico al actual (localStorage + backend rate limiting)
Sanitización: DOMPurify en TODOS los inputs/outputs
Seguridad: Mantener TODAS las validaciones del backend
Responsive: Diseño mobile-first preservado
Error Boundaries: Envolver componentes críticos
Loading States: Spinners en todas las operaciones async

🎯 Entregables
Proporciona código completo para:

✅ usePDFViewer.js - Hook completo con PDF.js
✅ PDFViewer.jsx - Componente con canvas
✅ useQuota.js - Hook de cuotas
✅ useChat.js - Hook de chat IA
✅ useCitation.js - Hook de citación
✅ App.jsx - Router principal
✅ vite.config.js - Configuración Vite
✅ api.js - Servicio API
✅ PDFChat.jsx - Página completa de chat
✅ package.json - Dependencies frontend

Migra manteniendo:

✅ Diseño visual exacto
✅ Funcionalidad completa
✅ Seguridad robusta
✅ Backend sin cambios