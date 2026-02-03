import React, { useEffect, useRef, useState } from 'react';
import { Document, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import { usePDFViewer } from '../../hooks/usePDFViewer';
import { PDFPage } from './PDFPage';

// Standard options from react-pdf-main (Versioned for stability)
const options = {
    cMapUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/cmaps/`,
    standardFontDataUrl: `https://unpkg.com/pdfjs-dist@${pdfjs.version}/standard_fonts/`,
};

// Set worker globally in component context as well
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const PDFViewer = ({ pdfData, onUpload, isLoadingExternal }) => {
    const {
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
    } = usePDFViewer();

    const containerRef = useRef(null);
    const [containerWidth, setContainerWidth] = useState(null);

    // ResizeObserver for responsive width
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
                        onClick={() => setScale(1.0)}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
                        title="Restablecer Zoom"
                    >
                        <span className="material-icons-round text-xl">restart_alt</span>
                    </button>
                    <div className="w-px h-4 bg-slate-200 mx-1"></div>
                    <button onClick={zoomOut} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                        <span className="material-icons-round text-xl">remove</span>
                    </button>
                    <button onClick={zoomIn} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                        <span className="material-icons-round text-xl">add</span>
                    </button>
                </div>
            </div>

            {/* Viewer Container */}
            <div className="flex-grow overflow-y-auto overflow-x-hidden bg-slate-100 relative custom-scrollbar p-4" ref={containerRef}>
                {!pdfData && !isLoadingExternal && (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center max-w-sm text-center">
                            <div className="w-16 h-16 bg-blue-50 text-accent rounded-2xl flex items-center justify-center mb-4">
                                <span className="material-icons-round text-3xl">upload_file</span>
                            </div>
                            <h3 className="text-slate-800 font-bold text-lg mb-2">Sube tu documento</h3>
                            <p className="text-slate-500 text-sm mb-6">Analiza tesis o artículos con el visor restaurado.</p>

                            <label className="bg-primary hover:bg-primary-light text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-lg cursor-pointer flex items-center gap-2">
                                <span className="material-icons-round text-sm">add</span>
                                Seleccionar PDF
                                <input type="file" className="hidden" accept=".pdf" onChange={onUpload} />
                            </label>
                        </div>
                    </div>
                )}

                {(isLoading || isLoadingExternal) && (
                    <div className="flex items-center justify-center p-10 h-full">
                        <i className="fas fa-spinner fa-spin text-3xl text-accent"></i>
                    </div>
                )}

                {error && (
                    <div className="text-red-500 p-10 flex flex-col items-center">
                        <span className="material-icons-round text-4xl mb-2">error_outline</span>
                        <p>{error}</p>
                    </div>
                )}

                {pdfData && (
                    <div className="flex flex-col items-center gap-6">
                        <Document
                            file={pdfData}
                            onLoadStart={() => setIsLoading(true)}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={onDocumentLoadError}
                            options={options}
                            className="flex flex-col gap-6"
                        >
                            {Array.from(new Array(numPages), (el, index) => (
                                <PDFPage
                                    key={`page_${index + 1}`}
                                    index={index}
                                    containerWidth={containerWidth}
                                    scale={scale}
                                />
                            ))}
                        </Document>
                    </div>
                )}
            </div>
        </div>
    );
};
