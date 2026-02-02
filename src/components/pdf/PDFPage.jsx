import React, { useState } from 'react';
import { Page } from 'react-pdf';

const RENDER_SCALE = 2.0; // Calidad de renderizado fija (Alta) - coincide con usePDFViewer

export const PDFPage = ({ index, containerWidth, scale, onRestoreSelection, ocrData }) => {
    const [pageDims, setPageDims] = useState(null);

    const onPageLoadSuccess = ({ width, height }) => {
        setPageDims({ width, height });
    };

    // Factor de escala visual: (Escala deseada) / (Escala de renderizado)
    const visualScale = scale / RENDER_SCALE;

    // Manual OCR Layer removed - using native PDF text layer from backend optimization

    return (
        <div
            className="shadow-md bg-white transition-all duration-75 ease-linear relative"
            style={{
                width: pageDims ? pageDims.width * visualScale : 'auto',
                height: pageDims ? pageDims.height * visualScale : 'auto',
                overflow: 'hidden'
            }}
        >
            <div
                style={{
                    transform: `scale(${visualScale})`,
                    transformOrigin: 'top left',
                    width: pageDims ? pageDims.width : undefined,
                    height: pageDims ? pageDims.height : undefined,
                    position: 'relative' // Needed for OCR layer absolute positioning context
                }}
            >
                <Page
                    pageNumber={index + 1}
                    width={containerWidth ? containerWidth - 48 : 600}
                    scale={RENDER_SCALE}
                    renderTextLayer={true}
                    renderAnnotationLayer={true}
                    onLoadSuccess={onPageLoadSuccess}
                    className="border-b border-gray-200"
                    loading={
                        <div className="h-[800px] w-full bg-white animate-pulse flex items-center justify-center text-slate-300">
                            <span className="material-icons-round text-4xl opacity-50">description</span>
                        </div>
                    }
                />


            </div>
        </div>
    );
};
