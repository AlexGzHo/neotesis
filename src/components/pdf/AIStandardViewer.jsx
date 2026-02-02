import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/TextLayer.css';
import 'react-pdf/dist/Page/AnnotationLayer.css';

// Configuración del Worker (CDN)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// Componente para el botón flotante de "Preguntar a la IA"
const AskAIButton = ({ position, onClick }) => {
    if (!position) return null;

    return (
        <button
            style={{
                top: position.top,
                left: position.left,
                position: 'fixed',
                zIndex: 50,
            }}
            className="animate-fade-in-up bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium transition-all transform hover:scale-105"
            onClick={onClick}
            onMouseDown={(e) => e.preventDefault()} // Evitar que el click deseleccione
        >
            <span className="material-icons-round text-base">auto_awesome</span>
            Preguntar a la IA
        </button>
    );
};

const PDFPage = React.memo(({ pageNumber, scale }) => {
    return (
        <div className="mb-6 shadow-md">
            <Page
                pageNumber={pageNumber}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                loading={
                    <div className="h-[800px] w-full bg-slate-100 animate-pulse flex items-center justify-center text-slate-400">
                        Cargando página...
                    </div>
                }
            />
        </div>
    );
});

export default function AIStandardViewer({ pdfUrl }) {
    const [numPages, setNumPages] = useState(null);
    const [selection, setSelection] = useState(null); // { text, rect: { top, left } }
    const containerRef = useRef(null);
    const [scale, setScale] = useState(1.0);

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
    };

    // Manejo de selección de texto
    const handleMouseUp = useCallback(() => {
        const selectionObject = window.getSelection();
        const text = selectionObject.toString().trim();

        if (text && text.length > 0) {
            const range = selectionObject.getRangeAt(0);
            const rect = range.getBoundingClientRect();

            // Calculamos la posición centrada arriba de la selección
            setSelection({
                text,
                position: {
                    top: rect.top - 40, // 40px arriba
                    left: rect.left + (rect.width / 2) - 60 // Centrado (aprox 120px ancho botón)
                }
            });
        } else {
            setSelection(null);
        }
    }, [setSelection]);

    // Auto-hide button on scroll or resize just in case
    useEffect(() => {
        const clearSelection = () => setSelection(null);
        window.addEventListener('scroll', clearSelection);
        window.addEventListener('resize', clearSelection);
        return () => {
            window.removeEventListener('scroll', clearSelection);
            window.removeEventListener('resize', clearSelection);
        };
    }, []);


    const handleAskAI = () => {
        if (!selection) return;
        // Aquí iría la lógica para enviar al chat (se conectará después)
        console.log("Preguntar a la IA sobre:", selection.text);
        alert(`Texto seleccionado para IA:\n\n"${selection.text}"`);
        setSelection(null);
        window.getSelection().removeAllRanges();
    };


    return (
        <div
            className="flex flex-col items-center bg-slate-100 min-h-screen p-8 relative"
            onMouseUp={handleMouseUp}
            ref={containerRef}
        >
            <React.Suspense fallback={<div className="text-center p-10">Cargando PDF...</div>}>
                <Document
                    file={pdfUrl}
                    onLoadSuccess={onDocumentLoadSuccess}
                    className="flex flex-col items-center"
                    loading={<div className="text-center p-10">Iniciando motor PDF...</div>}
                    error={<div className="text-red-500 p-10">Error al cargar el PDF.</div>}
                >
                    {Array.from(new Array(numPages), (el, index) => (
                        <PDFPage
                            key={`page_${index + 1}`}
                            pageNumber={index + 1}
                            scale={scale} // Se puede hacer dinámico luego
                        />
                    ))}
                </Document>
            </React.Suspense>

            <AskAIButton
                position={selection?.position}
                onClick={handleAskAI}
            />
        </div>
    );
}
