import React, { useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import './TextLayer.css'; // Import isolated styles

export const PDFPage = ({ pdfDocument, pageNumber, scale }) => {
    const canvasRef = useRef(null);
    const textLayerRef = useRef(null);
    const renderTaskRef = useRef(null);

    useEffect(() => {
        const renderPage = async () => {
            if (!pdfDocument || !canvasRef.current) return;

            try {
                const page = await pdfDocument.getPage(pageNumber);
                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');

                // Sync Canvas Dimensions
                canvas.height = viewport.height;
                canvas.width = viewport.width;

                // Cancel previous render if any
                if (renderTaskRef.current) {
                    renderTaskRef.current.cancel();
                }

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };

                const renderTask = page.render(renderContext);
                renderTaskRef.current = renderTask;
                await renderTask.promise;

                // --- Text Layer Logic ---
                if (textLayerRef.current) {
                    // Clear previous text layer content
                    textLayerRef.current.innerHTML = '';

                    // Explicitly set dimensions to match viewport
                    textLayerRef.current.style.height = `${viewport.height}px`;
                    textLayerRef.current.style.width = `${viewport.width}px`;
                    textLayerRef.current.style.setProperty('--scale-factor', '1');

                    // Get text content
                    const textContent = await page.getTextContent();

                    if (textContent.items.length === 0) {
                        console.warn(`[PDFPage ${pageNumber}] No text items found.`);
                    } else {
                        // console.log(`[PDFPage ${pageNumber}] Found ${textContent.items.length} text items.`);
                    }

                    // Render Text Layer
                    const textLayer = new pdfjsLib.TextLayer({
                        textContentSource: textContent,
                        container: textLayerRef.current,
                        viewport: viewport,
                    });

                    await textLayer.render();
                }

            } catch (error) {
                if (error.name !== 'RenderingCancelledException') {
                    console.error(`Error rendering page ${pageNumber}:`, error);
                }
            }
        };

        renderPage();

        return () => {
            if (renderTaskRef.current) {
                renderTaskRef.current.cancel();
            }
        };
    }, [pdfDocument, pageNumber, scale]);

    // --- Responsive Text Layer Scaling ---
    useEffect(() => {
        const container = canvasRef.current?.parentElement;
        const textLayer = textLayerRef.current;
        const canvas = canvasRef.current;

        if (!container || !textLayer || !canvas) return;

        const syncScale = () => {
            const currentWidth = canvas.offsetWidth;
            const originalWidth = canvas.width;

            if (originalWidth > 0) {
                const scaleRatio = currentWidth / originalWidth;
                textLayer.style.transform = `scale(${scaleRatio})`;
            }
        };

        const resizeObserver = new ResizeObserver(() => syncScale());
        resizeObserver.observe(canvas);

        // Initial sync
        syncScale();

        return () => {
            resizeObserver.disconnect();
        };
    }, [scale]);

    return (
        <div className="pdf-page-container relative mb-6 shadow-md bg-white">
            <canvas ref={canvasRef} className="block" />
            <div ref={textLayerRef} className="textLayer" />
        </div>
    );
};
