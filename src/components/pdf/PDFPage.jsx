import React, { useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import './TextLayer.css'; // Import isolated styles

export const PDFPage = ({ pdfDocument, pageNumber, scale }) => {
    const canvasRef = useRef(null);
    const textLayerRef = useRef(null);
    const renderTaskRef = useRef(null);
    const pageRenderRef = useRef(null);

    useEffect(() => {
        const renderPage = async () => {
            if (!pdfDocument || !canvasRef.current || !textLayerRef.current) return;

            try {
                // Cancel previous render if any
                if (renderTaskRef.current) {
                    renderTaskRef.current.cancel();
                }

                const page = await pdfDocument.getPage(pageNumber);
                const viewport = page.getViewport({ scale });
                const canvas = canvasRef.current;
                const context = canvas.getContext('2d');

                // Sync Canvas Dimensions (Physically matches the viewport) - Critical for clarity
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                canvas.style.width = `${viewport.width}px`;
                canvas.style.height = `${viewport.height}px`;

                // --- Canvas Render ---
                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };

                const renderTask = page.render(renderContext);
                renderTaskRef.current = renderTask;
                await renderTask.promise;

                // --- Text Layer Render ---
                const textLayerDiv = textLayerRef.current;

                // Clear previous content
                textLayerDiv.innerHTML = '';

                // Set dimensions to match viewport exactly so selection aligns
                textLayerDiv.style.setProperty('--scale-factor', scale);
                textLayerDiv.style.width = `${viewport.width}px`;
                textLayerDiv.style.height = `${viewport.height}px`;

                const textContentSource = page.streamTextContent({ includeMarkedContent: true });

                const textLayer = new pdfjsLib.TextLayer({
                    textContentSource: textContentSource,
                    container: textLayerDiv,
                    viewport: viewport,
                });

                await textLayer.render();

                // Add end of content marker for better selection handling (from reference)
                const end = document.createElement('div');
                end.className = 'endOfContent';
                textLayerDiv.append(end);

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

    return (
        <div
            className="pdf-page-container relative mb-6 shadow-md bg-white select-none" // select-none on container, textLayer handles selection
            style={{
                width: 'fit-content',
                height: 'fit-content'
            }}
        >
            <canvas ref={canvasRef} className="block" />
            <div
                ref={textLayerRef}
                className="textLayer"
                onMouseDown={(e) => e.currentTarget.classList.add('selecting')}
                onMouseUp={(e) => e.currentTarget.classList.remove('selecting')}
            />
        </div>
    );
};
