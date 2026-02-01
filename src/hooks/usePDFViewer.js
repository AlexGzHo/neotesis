import { useState, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Helper to set worker.
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export const usePDFViewer = () => {
  const [pdfDocument, setPdfDocument] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.0); // Zoom level
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pdfTextContent, setPdfTextContent] = useState([]); // Cache text per page

  // Load PDF
  const loadPDF = useCallback(async (pdfData) => {
    try {
      setIsLoading(true);
      setError(null);
      setPdfTextContent([]);

      // Cleanup previous doc if any
      if (pdfDocument) {
        // pdfDocument.destroy(); // Optional: destroy if supported/needed
      }

      const loadingTask = pdfjsLib.getDocument(pdfData);
      const doc = await loadingTask.promise;

      setPdfDocument(doc);
      setTotalPages(doc.numPages);

      // Extract text from all pages for AI context
      extractAllText(doc);

    } catch (err) {
      console.error("Error loading PDF:", err);
      setError("Error al cargar el archivo PDF.");
    } finally {
      setIsLoading(false);
    }
  }, []);

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

  // Controls
  const zoomIn = () => setScale(s => Math.min(s + 0.2, 3.0));
  const zoomOut = () => setScale(s => Math.max(s - 0.2, 0.5));

  return {
    pdfDocument,
    totalPages,
    scale,
    isLoading,
    error,
    pdfTextContent,
    loadPDF,
    zoomIn,
    zoomOut
  };
};
