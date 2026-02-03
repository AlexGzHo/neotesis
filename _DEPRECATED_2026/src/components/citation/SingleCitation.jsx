import React, { useState } from 'react';
import { useCitation } from '../../hooks/useCitation';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';

export const SingleCitation = () => {
    const [url, setUrl] = useState('');
    const { fetchSingleCitation, loading, result, error } = useCitation();

    const handleGenerate = () => {
        if (url) fetchSingleCitation(url);
    };

    const copyToClipboard = () => {
        if (result) {
            // Navigator clipboard needs specialized handling for HTML copy if needed, 
            // but text is simpler
            const tempDiv = document.createElement("div");
            tempDiv.innerHTML = result;
            const text = tempDiv.textContent || tempDiv.innerText || "";
            navigator.clipboard.writeText(text);
        }
    };

    return (
        <div className="bg-white p-10 rounded-3xl shadow-modal border border-border flex flex-col gap-6 animate-fadeIn">
            <div className="grid grid-cols-[1fr_auto] gap-4 items-end">
                <Input
                    label="Pega un DOI o URL"
                    placeholder="Ej: 10.1016/j.article... o https://..."
                    icon="fas fa-link"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    containerClassName="mb-0"
                />
                <Button
                    onClick={handleGenerate}
                    isLoading={loading}
                    className="h-[58px] mb-[2px]" // Height match adjustment
                >
                    <i className="fas fa-magic"></i> Generar Cita
                </Button>
            </div>

            {error && <div className="p-4 bg-red-50 text-red-600 rounded-xl border border-red-100">{error}</div>}

            {result && (
                <div className="text-left mt-6 bg-white border border-border p-8 rounded-xl animate-fadeIn">
                    <div className="flex justify-between items-center mb-4 border-b border-border pb-2">
                        <span className="text-xs font-extrabold uppercase text-gray tracking-widest">Cita APA 7ma Generada</span>
                        <button onClick={copyToClipboard} className="bg-transparent border-none text-accent cursor-pointer text-sm font-bold flex items-center gap-2 hover:text-accent-hover">
                            <i className="far fa-copy"></i> Copiar
                        </button>
                    </div>
                    <div className="text-base leading-relaxed text-primary font-sans" dangerouslySetInnerHTML={{ __html: result }}></div>
                </div>
            )}

            <div className="p-4 bg-blue-50 text-blue-800 rounded-xl flex gap-3 text-sm mt-4 border border-blue-100">
                <i className="fas fa-info-circle text-lg mt-0.5"></i>
                <p><b>Tip Pro:</b> Los DOIs garantizan la mayor precisión. Si usas una URL, intentaremos extraer los metadatos disponibles.</p>
            </div>
        </div>
    );
};
