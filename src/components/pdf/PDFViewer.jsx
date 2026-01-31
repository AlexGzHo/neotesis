import React, { useEffect, useRef } from 'react';
import { usePDFViewer } from '../../hooks/usePDFViewer';

export const PDFViewer = ({ pdfData, onTextExtracted }) => {
    const {
        canvasRef,
        loadPDF,
        currentPage,
        totalPages,
        zoomIn,
        zoomOut,
        nextPage,
        prevPage,
        scale,
        pdfTextContent,
        isLoading,
        error
    } = usePDFViewer();

    useEffect(() => {
        if (pdfData) {
            loadPDF(pdfData);
        }
    }, [pdfData, loadPDF]);

    useEffect(() => {
        if (pdfTextContent.length > 0 && onTextExtracted) {
            onTextExtracted(pdfTextContent);
        }
    }, [pdfTextContent, onTextExtracted]);

    return (
        <div className="flex flex-col h-full bg-slate-50 relative overflow-hidden">
            {/* Controls */}
            <div className="p-2 bg-white border-b border-slate-200 flex items-center justify-between z-20 shadow-sm">
                <div className="flex items-center gap-1">
                    <button onClick={prevPage} disabled={currentPage <= 1} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors disabled:opacity-30">
                        <span className="material-icons-round text-xl">chevron_left</span>
                    </button>
                    <button onClick={nextPage} disabled={currentPage >= totalPages} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors disabled:opacity-30">
                        <span className="material-icons-round text-xl">chevron_right</span>
                    </button>
                </div>

                <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-slate-700">{Math.round(scale * 100)}%</span>
                    <span className="text-[10px] text-slate-400 font-medium">{currentPage} / {totalPages || '--'}</span>
                </div>

                <div className="flex items-center gap-1">
                    <button onClick={zoomOut} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                        <span className="material-icons-round text-xl">remove</span>
                    </button>
                    <button onClick={zoomIn} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
                        <span className="material-icons-round text-xl">add</span>
                    </button>
                </div>
            </div>

            {/* Viewer Container */}
            <div className="flex-grow overflow-auto p-4 flex justify-center bg-slate-100 relative custom-scrollbar">
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-50">
                        <i className="fas fa-spinner fa-spin text-3xl text-accent"></i>
                    </div>
                )}

                {error && (
                    <div className="absolute inset-0 flex items-center justify-center text-red-500 z-50">
                        <p>{error}</p>
                    </div>
                )}

                {!pdfData && !isLoading && (
                    <div className="flex flex-col items-center justify-center opacity-40 mt-20">
                        <span className="material-icons-round text-6xl mb-4 text-slate-300">description</span>
                        <p className="text-sm font-bold text-slate-500">Sin Documento</p>
                    </div>
                )}

                <canvas ref={canvasRef} className="shadow-lg mb-4 bg-white" />
            </div>
        </div>
    );
};
