import React, { useState } from 'react';
import { SingleCitation } from './SingleCitation';
import { BatchCitation } from './BatchCitation';
import { ManualAPA } from './ManualAPA';

export const CitationTools = () => {
    const [activeTab, setActiveTab] = useState('single');

    return (
        <div className="py-12 px-8 max-w-7xl mx-auto animate-fadeIn">
            <div className="section-header text-center mb-10">
                <span className="bg-accent/10 text-accent px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider mb-4 inline-block">IA + Metadatos</span>
                <h2 className="text-4xl text-primary mb-4 font-bold">Herramientas de Citación</h2>
                <p className="text-gray text-lg max-w-2xl mx-auto">Genera citas bibliográficas automáticamente desde URLs, DOIs o procesa múltiples enlaces en lote.</p>
            </div>

            {/* Tabs */}
            <div className="mb-8">
                <div className="flex bg-border rounded-xl p-1 mb-8 max-w-3xl mx-auto">
                    <button
                        className={`flex-1 py-3 px-4 border-none rounded-lg font-semibold cursor-pointer transition-all duration-300 text-sm flex flex-col items-center gap-2 ${activeTab === 'single' ? 'bg-white text-primary shadow-sm' : 'bg-transparent text-gray hover:bg-white/50 hover:text-primary'}`}
                        onClick={() => setActiveTab('single')}
                    >
                        <i className="fas fa-magic text-lg"></i> Auto-Cita
                    </button>
                    <button
                        className={`flex-1 py-3 px-4 border-none rounded-lg font-semibold cursor-pointer transition-all duration-300 text-sm flex flex-col items-center gap-2 ${activeTab === 'batch' ? 'bg-white text-primary shadow-sm' : 'bg-transparent text-gray hover:bg-white/50 hover:text-primary'}`}
                        onClick={() => setActiveTab('batch')}
                    >
                        <i className="fas fa-layer-group text-lg"></i> Cita en Lote
                    </button>
                    <button
                        className={`flex-1 py-3 px-4 border-none rounded-lg font-semibold cursor-pointer transition-all duration-300 text-sm flex flex-col items-center gap-2 ${activeTab === 'manual' ? 'bg-white text-primary shadow-sm' : 'bg-transparent text-gray hover:bg-white/50 hover:text-primary'}`}
                        onClick={() => setActiveTab('manual')}
                    >
                        <i className="fas fa-edit text-lg"></i> Generador APA
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-4xl mx-auto">
                {activeTab === 'single' && <SingleCitation />}
                {activeTab === 'batch' && <BatchCitation />}
                {activeTab === 'manual' && <ManualAPA />}
            </div>
        </div>
    );
};
