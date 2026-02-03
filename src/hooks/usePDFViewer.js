import { useState } from 'react';
import { pdfjs } from 'react-pdf';

// Baseline worker setup using versioned CDN (Consistent with stable patterns)
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const usePDFViewer = () => {
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const onDocumentLoadSuccess = ({ numPages: nextNumPages }) => {
    setNumPages(nextNumPages);
    setIsLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (err) => {
    console.error("Error loading PDF:", err);
    setError("Error al cargar el archivo PDF.");
    setIsLoading(false);
  };

  const zoomIn = () => setScale(s => Math.min(s + 0.1, 3.0));
  const zoomOut = () => setScale(s => Math.max(s - 0.1, 0.5));

  return {
    numPages,
    scale,
    setScale,
    isLoading,
    setIsLoading,
    error,
    onDocumentLoadSuccess,
    onDocumentLoadError,
    zoomIn,
    zoomOut
  };
};
