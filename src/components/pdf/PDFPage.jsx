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

    // Render OCR Text Layer
    const renderOCRLayer = () => {
        if (!ocrData || !Array.isArray(ocrData) || ocrData.length === 0 || !pageDims) return null;

        return (
            <div className="ocr-layer" style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                zIndex: 51, // Above standard text layer
                pointerEvents: 'none' // Let clicks pass initially, but spans have auto
            }}>
                {ocrData.map((word, i) => {
                    const { bbox, text } = word;
                    if (!bbox) return null;

                    return (
                        <span key={i} style={{
                            position: 'absolute',
                            left: `${bbox.x0}px`,
                            top: `${bbox.y0}px`,
                            width: `${bbox.x1 - bbox.x0}px`,
                            height: `${bbox.y1 - bbox.y0}px`,
                            color: 'transparent',
                            cursor: 'text',
                            pointerEvents: 'auto',
                            userSelect: 'text',
                            fontSize: `${bbox.y1 - bbox.y0}px`, // Approx font size
                            lineHeight: 1,
                            whiteSpace: 'nowrap'
                        }}>
                            {text}
                        </span>
                    );
                })}
            </div>
        );
    };

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

                {/* OCR Layer Overlay */}
                {renderOCRLayer()}
            </div>
        </div>
    );
};
