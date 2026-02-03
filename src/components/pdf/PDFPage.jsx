import React from 'react';
import { Page } from 'react-pdf';

export const PDFPage = ({ index, containerWidth, scale }) => {
    return (
        <div
            className="shadow-md bg-white transition-all duration-75 ease-linear"
            style={{
                marginBottom: '1.5rem',
                backgroundColor: 'white'
            }}
        >
            <Page
                pageNumber={index + 1}
                width={containerWidth ? containerWidth - 48 : 600}
                scale={scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                loading={
                    <div className="h-[800px] w-full bg-white animate-pulse flex items-center justify-center text-slate-300">
                        <span className="material-icons-round text-4xl opacity-50">description</span>
                    </div>
                }
            />
        </div>
    );
};
