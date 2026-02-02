import { useState, useCallback } from 'react';
import { pdfjs } from 'react-pdf';
import Tesseract from 'tesseract.js';

// Helper to set worker (CDN to match PDFViewer and ensure version compatibility)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

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

      const loadingTask = pdfjs.getDocument(pdfData);
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

  // Helper for OCR
  const performOCR = async (page) => {
    try {
      const viewport = page.getViewport({ scale: 2.0 }); // High quality for OCR
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      await page.render({ canvasContext: context, viewport: viewport }).promise;

      // Extract raw image data (faster/sharper for Tesseract than base64)
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

      const { data } = await Tesseract.recognize(
        imageData,
        'eng+spa', // English and Spanish support
        { logger: m => console.log(m) }
      );

      return { text: data.text, words: data.words };
    } catch (error) {
      console.error("Error OCR:", error);
      return { text: "", words: [] };
    }
  };

  // Extract text helper
  const extractAllText = async (doc) => {
    let isMounted = true;

    // Initialize array with empty placeholders to maintain order
    setPdfTextContent(new Array(doc.numPages).fill(null));

    for (let i = 1; i <= doc.numPages; i++) {
      if (!isMounted) break; // Stop if unmounted

      // Process sequentially or in parallel chunks could be better, but sequential is safer for memory with OCR
      try {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        let pageData = { page: i, text: '', words: [], isOCR: false };

        const hasNativeText = content.items.length > 0;

        if (hasNativeText) {
          // Use native text
          const strings = content.items.map(item => item.str).join(' ');
          pageData.text = strings;
        } else {
          // Fallback to OCR
          console.log(`Page ${i} requires OCR...`);
          const ocrResult = await performOCR(page);
          pageData.text = ocrResult.text;
          pageData.words = ocrResult.words;
          pageData.isOCR = true;
        }

        if (!isMounted) break; // Check again before update

        // Update state safely function
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
  };

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
    setScale, // Expose setScale for external control
    isLoading,
    error,
    pdfTextContent, // Now contains { page, text, words, isOCR }
    loadPDF,
    zoomIn,
    zoomOut
  };
};
