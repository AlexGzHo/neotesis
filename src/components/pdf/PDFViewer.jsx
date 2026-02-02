import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import './TextLayer.css'; // Nuestros estilos personalizados (si son necesarios override)

// Configuración del Worker (usando CDN para consistencia con la referencia profesional)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const PDFViewer = ({ pdfData, onTextExtracted, onUpload }) => {
    const [numPages, setNumPages] = useState(null);
    const [scale, setScale] = useState(1.0);
    const [isLoading, setIsLoading] = useState(true);
    const [containerWidth, setContainerWidth] = useState(null);
    const containerRef = useRef(null);

    // ResizeObserver para mantener el ancho ajustado
    useEffect(() => {
        const resizeObserver = new ResizeObserver((entries) => {
            for (const entry of entries) {
                if (entry.contentRect) {
                    setContainerWidth(entry.contentRect.width);
                }
            }
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => resizeObserver.disconnect();
    }, []);

    // Carga del documento exitosa
    const onDocumentLoadSuccess = useCallback(async (pdf) => {
        setNumPages(pdf.numPages);
        setIsLoading(false);

        // Extracción de texto para IA (manteniendo funcionalidad original)
        if (onTextExtracted) {
            try {
                let texts = [];
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const strings = textContent.items.map(item => item.str).join(' ');
                    texts.push({ page: i, text: strings });
                }
                onTextExtracted(texts);
            } catch (e) {
                console.error("Error extracting text for AI:", e);
            }
        }
    }, [onTextExtracted]);

    // --- Selection Persistence Logic ---
    const selectionRef = useRef(null);

    const captureSelection = useCallback(() => {
        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0) return;

        const range = selection.getRangeAt(0);
        const startNode = range.startContainer.parentNode;
        const endNode = range.endContainer.parentNode;

        // Ensure we are inside a textLayer
        const startLayer = startNode.closest('.textLayer');
        if (!startLayer) return;

        // Verify start and end are in the same layer
        if (startLayer !== endNode.closest('.textLayer')) return;

        const pageDiv = startLayer.closest('.react-pdf__Page');
        const pageNumber = pageDiv ? parseInt(pageDiv.getAttribute('data-page-number')) : null;

        if (pageNumber) {
            const startNodeIndex = Array.prototype.indexOf.call(startLayer.children, startNode);
            const endNodeIndex = Array.prototype.indexOf.call(startLayer.children, endNode);

            selectionRef.current = {
                pageNumber,
                startNodeIndex,
                endNodeIndex,
                startOffset: range.startOffset,
                endOffset: range.endOffset,
                startText: startNode.textContent, // Save text for validation
                endText: endNode.textContent,
                text: selection.toString()
            };
        }
    }, []);

    const restoreSelection = useCallback((pageIndex) => {
        // Use a small delay to allow the textLayer to be fully painted by the browser
        setTimeout(() => {
            const saved = selectionRef.current;
            if (!saved || saved.pageNumber !== pageIndex) return;

            const pageDiv = document.querySelector(`.react-pdf__Page[data-page-number="${pageIndex}"]`);
            if (!pageDiv) return;

            const textLayer = pageDiv.querySelector('.textLayer');
            if (!textLayer) return;

            try {
                // Attempt to find nodes by index
                let startNode = textLayer.children[saved.startNodeIndex]?.firstChild;
                let endNode = textLayer.children[saved.endNodeIndex]?.firstChild;

                // Validate text content to ensure we have the correct nodes (robustness check)
                if (startNode && endNode) {
                    // Optional: verification log
                    // if (startNode.textContent !== saved.startText) console.warn("Start node text mismatch");

                    const range = document.createRange();
                    range.setStart(startNode, saved.startOffset);
                    range.setEnd(endNode, saved.endOffset);

                    const selection = window.getSelection();
                    selection.removeAllRanges();
                    selection.addRange(range);
                }
            } catch (e) {
                console.warn("Could not restore selection", e);
            }
        }, 100);
    }, []);

    // Wrap zoom functions to capture selection first
    const handleZoomIn = () => {
        captureSelection();
        zoomIn();
    };

    const handleZoomOut = () => {
        captureSelection();
        zoomOut();
    };

    const zoomIn = () => setScale(s => Math.min(s + 0.1, 3.0));
    const zoomOut = () => setScale(s => Math.max(s - 0.1, 0.5));

    return (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
            {/* Controls */}
            <div className="p-2 bg-white border-b border-slate-200 flex items-center justify-between z-20 shadow-sm">
                <div className="flex items-center gap-1">
                    <span className="text-sm font-medium text-slate-600 px-2">
                        {numPages ? `${numPages} Páginas` : 'Cargando...'}
                    </span>
                </div>

                <div className="flex flex-col items-center">
                    <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {Math.round(scale * 100)}%
                    </span>
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => {
                            captureSelection();
                            setScale(1.0);
                        }}
                        onMouseDown={(e) => e.preventDefault()}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                        title="Restablecer Zoom (Ancho)"
                    >
                        <span className="material-icons-round text-xl">restart_alt</span>
                    </button>
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                    <button
                        onClick={handleZoomOut}
                        onMouseDown={(e) => e.preventDefault()}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                    >
                        <span className="material-icons-round text-xl">remove</span>
                    </button>
                    <button
                        onClick={handleZoomIn}
                        onMouseDown={(e) => e.preventDefault()}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                    >
                        <span className="material-icons-round text-xl">add</span>
                    </button>
                </div>
            </div>

            {/* Viewer Container */}
            <div className="flex-grow overflow-y-auto overflow-x-hidden bg-slate-100 relative custom-scrollbar p-4" ref={containerRef}>

                {!pdfData && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center max-w-sm text-center">
                            <div className="w-16 h-16 bg-blue-50 text-accent rounded-2xl flex items-center justify-center mb-4">
                                <span className="material-icons-round text-3xl">upload_file</span>
                            </div>
                            <h3 className="text-slate-800 font-bold text-lg mb-2">Sube tu documento</h3>
                            <p className="text-slate-500 text-sm mb-6">Analiza tesis, libros o artículos con IA avanzada.</p>

                            <label className="bg-primary hover:bg-primary-light text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg shadow-blue-500/20 cursor-pointer flex items-center gap-2">
                                <span className="material-icons-round text-sm">add</span>
                                Seleccionar PDF
                                <input type="file" className="hidden" accept=".pdf" onChange={onUpload} />
                            </label>
                        </div>
                    </div>
                )}

                {pdfData && (
                    <div className="flex flex-col items-center">
                        <Document
                            file={pdfData}
                            onLoadSuccess={onDocumentLoadSuccess}
                            loading={
                                <div className="flex items-center justify-center p-10">
                                    <i className="fas fa-spinner fa-spin text-3xl text-accent"></i>
                                </div>
                            }
                            error={
                                <div className="text-red-500 p-10 flex flex-col items-center">
                                    <span className="material-icons-round text-4xl mb-2">error_outline</span>
                                    <p>Error al cargar el PDF.</p>
                                </div>
                            }
                            className="flex flex-col gap-6"
                        >
                            {Array.from(new Array(numPages || 0), (el, index) => (
                                <div key={`page_${index + 1}`} className="shadow-md bg-white">
                                    <Page
                                        pageNumber={index + 1}
                                        width={containerWidth ? containerWidth - 48 : 600} // Restamos padding (48px aprox)
                                        scale={scale}
                                        renderTextLayer={true}
                                        renderAnnotationLayer={true}
                                        onRenderTextLayerSuccess={() => restoreSelection(index + 1)}
                                        className="border-b border-gray-200"
                                        loading={
                                            <div className="h-[800px] w-full bg-white animate-pulse flex items-center justify-center text-slate-300">
                                                <span className="material-icons-round text-4xl opacity-50">description</span>
                                            </div>
                                        }
                                    />
                                </div>
                            ))}
                        </Document>
                    </div>
                )}
            </div>
        </div>
    );
};
