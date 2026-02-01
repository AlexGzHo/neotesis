import React, { useEffect } from 'react';
import { usePDFViewer } from '../../hooks/usePDFViewer';
import { PDFPage } from './PDFPage';

export const PDFViewer = ({ pdfData, onTextExtracted, onUpload }) => {
    const {
        loadPDF,
        totalPages,
        zoomIn,
        zoomOut,
        scale,
        pdfTextContent,
        isLoading,
        error,
        pdfDocument
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
                    <span className="text-sm font-medium text-slate-600 px-2">
                        {totalPages > 0 ? `${totalPages} Páginas` : 'Documento'}
                    </span>
                </div>

                <div className="flex flex-col items-center">
                    <span className="text-xs font-bold text-slate-700">{Math.round(scale * 100)}%</span>
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

            {/* Viewer Container - Scrollable */}
            <div className="flex-grow overflow-y-auto overflow-x-auto p-4 bg-slate-100 relative custom-scrollbar">

                {/* Scrollable Content wrapper to center pages */}
                <div className="flex flex-col items-center min-w-full w-fit min-h-full">

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
                        <div className="flex flex-col items-center justify-center flex-grow text-slate-400 py-20">
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

                    {/* PDF Pages List */}
                    {pdfDocument && !isLoading && (
                        <div className="pb-10">
                            {Array.from({ length: totalPages }, (_, i) => (
                                <PDFPage
                                    key={i + 1}
                                    pageNumber={i + 1}
                                    pdfDocument={pdfDocument}
                                    scale={scale}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
