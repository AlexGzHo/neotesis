import { useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Helper to set worker. Note: vite configuration manualChunks handles the split
// But we need to point to the worker file.
// In development/production with vite, we usually serve it from public/
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.js';

export const usePDFViewer = () => {
  const [pdfDocument, setPdfDocument] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0); // Zoom level
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pdfTextContent, setPdfTextContent] = useState([]); // Cache text per page

  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);

  // Load PDF
  const loadPDF = useCallback(async (pdfData) => {
    try {
      setIsLoading(true);
      setError(null);
      setPdfTextContent([]);
      
      // Cleanup previous doc if any
      if (pdfDocument) {
         // handle cleanup if needed
      }

      const loadingTask = pdfjsLib.getDocument(pdfData);
      const doc = await loadingTask.promise;
      
      setPdfDocument(doc);
      setTotalPages(doc.numPages);
      setCurrentPage(1);
      
      // Extract text from all pages for AI context (optional, can be lazy)
      extractAllText(doc);
      
    } catch (err) {
      console.error("Error loading PDF:", err);
      setError("Error al cargar el archivo PDF.");
    } finally {
      setIsLoading(false);
    }
  }, []); // Remove pdfDocument dependency to avoid loop if not handled carefully

  // Extract text helper
  const extractAllText = async (doc) => {
    let texts = [];
    for (let i = 1; i <= doc.numPages; i++) {
        try {
            const page = await doc.getPage(i);
            const content = await page.getTextContent();
            const strings = content.items.map(item => item.str).join(' ');
            texts.push({ page: i, text: strings });
        } catch (e) {
            console.error(`Error extracting text from page ${i}`, e);
        }
    }
    setPdfTextContent(texts);
  };

  // Render Page
  const renderPage = useCallback(async (pageNumber) => {
    if (!pdfDocument || !canvasRef.current) return;

    try {
      if (renderTaskRef.current) {
        await renderTaskRef.current.cancel();
      }

      const page = await pdfDocument.getPage(pageNumber);
      const viewport = page.getViewport({ scale });
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      canvas.height = viewport.height;
      canvas.width = viewport.width;

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;

      await renderTask.promise;
    } catch (err) {
      if (err.name !== 'RenderingCancelledException') {
        console.error("Render error:", err);
      }
    }
  }, [pdfDocument, scale]);

  // Effect to render when page/scale changes
  useEffect(() => {
    if(pdfDocument) {
        renderPage(currentPage);
    }
  }, [pdfDocument, currentPage, scale, renderPage]);

  // Controls
  const nextPage = () => setCurrentPage(p => Math.min(p + 1, totalPages));
  const prevPage = () => setCurrentPage(p => Math.max(p - 1, 1));
  const goToPage = (n) => setCurrentPage(Math.min(Math.max(1, n), totalPages));
  const zoomIn = () => setScale(s => Math.min(s + 0.2, 3.0));
  const zoomOut = () => setScale(s => Math.max(s - 0.2, 0.5));

  return {
    pdfDocument,
    currentPage,
    totalPages,
    scale,
    isLoading,
    error,
    pdfTextContent,
    canvasRef,
    loadPDF,
    nextPage,
    prevPage,
    goToPage,
    zoomIn,
    zoomOut
  };
};
