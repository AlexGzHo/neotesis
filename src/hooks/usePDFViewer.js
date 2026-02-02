import { useState, useCallback } from 'react';
import { pdfjs } from 'react-pdf';

// Helper to set worker (CDN to match PDFViewer and ensure version compatibility)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const usePDFViewer = () => {
  const [pdfDocument, setPdfDocument] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0); // Zoom level
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pdfTextContent, setPdfTextContent] = useState([]); // Cache text per page

  // Extract text helper
  const extractAllText = useCallback(async (doc) => {
    let isMounted = true;

    // Initialize array with empty placeholders to maintain order
    setPdfTextContent(new Array(doc.numPages).fill(null));

    for (let i = 1; i <= doc.numPages; i++) {
      if (!isMounted) break;

      try {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        let pageData = { page: i, text: '', words: [], isOCR: false };

        const hasNativeText = content.items.length > 0;

        if (hasNativeText) {
          const strings = content.items.map(item => item.str).join(' ');
          pageData.text = strings;
        } else {
          console.log(`Page ${i} has no native text. Backend OCR recommended.`);
          pageData.text = "[Documento sin texto. Use la opción de Optimizar PDF]";
        }

        if (!isMounted) break;

        setPdfTextContent(prev => {
          const newContent = [...prev];
          newContent[i - 1] = pageData;
          return newContent;
        });

      } catch (e) {
        console.error(`Error extracting text from page ${i}`, e);
      }
    }

    return () => { isMounted = false; };
  }, []);

  // Load PDF
  const loadPDF = useCallback(async (pdfData) => {
    try {
      setIsLoading(true);
      setError(null);
      setPdfTextContent([]);

      const loadingTask = pdfjs.getDocument(pdfData);
      const doc = await loadingTask.promise;

      setPdfDocument(doc);
      setTotalPages(doc.numPages);

      // Extract text from all pages
      extractAllText(doc);

    } catch (err) {
      console.error("Error loading PDF:", err);
      setError("Error al cargar el archivo PDF.");
    } finally {
      setIsLoading(false);
    }
  }, [extractAllText]);

  // Controls
  const zoomIn = () => setScale(s => {
    const newScale = Math.min(s + 0.1, 3.0);
    return Math.round(newScale * 10) / 10;
  });
  const zoomOut = () => setScale(s => {
    const newScale = Math.max(s - 0.1, 0.5);
    return Math.round(newScale * 10) / 10;
  });

  return {
    pdfDocument,
    totalPages,
    scale,
    setScale,
    isLoading,
    error,
    pdfTextContent,
    loadPDF,
    zoomIn,
    zoomOut
  };
};
