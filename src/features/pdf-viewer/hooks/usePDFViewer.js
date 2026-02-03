import { useState } from 'react';
import { pdfjs } from 'react-pdf';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set worker using Vite's asset URL mechanism
// This ensures the worker is bundled correctly and served from the local origin
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export const usePDFViewer = () => {
  const [numPages, setNumPages] = useState(0);
  const [scale, setScale] = useState(1.0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const onDocumentLoadSuccess = ({ numPages: nextNumPages }) => {
    console.log("PDF Loaded Successfully. Pages:", nextNumPages);
    setNumPages(nextNumPages);
    setIsLoading(false);
    setError(null);
  };

  const onDocumentLoadError = (err) => {
    console.error("Critical PDF Load Error:", err);
    setError(`Error: ${err.message || 'Unknown error'} (${err.name})`);
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
