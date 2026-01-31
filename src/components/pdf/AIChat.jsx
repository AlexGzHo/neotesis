import React, { useState } from 'react';
import { PDFViewer } from './PDFViewer';
import { ChatPanel } from './ChatPanel';
import { useQuota } from '../../hooks/useQuota';

export const AIChat = () => {
    const [pdfData, setPdfData] = useState(null);
    const [pdfText, setPdfText] = useState([]);
    const quota = useQuota();

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (file && file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setPdfData(ev.target.result); // ArrayBuffer or TypedArray preferred by PDF.js usually. FileReader readAsArrayBuffer
            };
            reader.readAsArrayBuffer(file);
        }
    };

    return (
        <div className="h-[calc(100vh-73px)] flex flex-col md:flex-row overflow-hidden bg-white">
            {/* Sidebar / List (Simplified for this MVP, focusing on Viewer + Chat) */}
            <div className="hidden md:flex flex-col w-64 border-r border-slate-200 bg-white">
                <div className="p-4 border-b border-slate-100">
                    <label className="flex items-center justify-center w-full gap-2 bg-primary text-white py-2.5 rounded-xl font-semibold text-sm transition-all hover:bg-primary-light cursor-pointer shadow-sm">
                        <span className="material-icons-round text-lg">add</span>
                        Subir PDF
                        <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
                    </label>
                </div>

                {/* Quota Info */}
                <div className="mt-auto p-4 border-t border-slate-100">
                    <div className="text-xs text-slate-500 flex justify-between mb-2">
                        <span>Consultas hoy</span>
                        <span className={quota.isAvailable ? 'text-green-500 font-bold' : 'text-red-500 font-bold'}>
                            {quota.quota.count}/3
                        </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-500 ${quota.isAvailable ? 'bg-primary' : 'bg-red-500'}`}
                            style={{ width: `${(quota.quota.count / 3) * 100}%` }}
                        ></div>
                    </div>
                    {!quota.isAvailable && (
                        <p className="text-[10px] text-red-500 mt-2 text-center font-bold">Reseteo en 24h</p>
                    )}
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex overflow-hidden relative">
                <div className="flex-1 relative min-w-0">
                    <PDFViewer pdfData={pdfData} onTextExtracted={setPdfText} />
                </div>

                {/* Chat Panel */}
                <div className="w-full md:w-96 flex-shrink-0 relative z-20 shadow-[-5px_0_15px_-3px_rgba(0,0,0,0.05)]">
                    <ChatPanel pdfContext={pdfText} quota={quota} />
                </div>
            </div>
        </div>
    );
};
