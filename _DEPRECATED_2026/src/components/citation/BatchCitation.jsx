import React, { useState } from 'react';
import { useCitation } from '../../hooks/useCitation';
import { Button } from '../common/Button';
import { unifiedExtractMetadata } from '../../utils/citationScraper';
import { useSecureFetch } from '../../hooks/useSecureFetch';

export const BatchCitation = () => {
    const [input, setInput] = useState('');
    const [batchResults, setBatchResults] = useState([]);
    const [progress, setProgress] = useState(0);
    const [processing, setProcessing] = useState(false);
    const { secureFetch } = useSecureFetch();

    const handleBatchProcess = async () => {
        if (!input.trim()) return;

        const urls = input.split('\n').filter(u => u.trim().length > 0);
        if (urls.length === 0) return;

        setProcessing(true);
        setBatchResults([]);
        setProgress(0);

        let results = [];
        let completed = 0;

        for (let url of urls) {
            try {
                // Using unifiedExtractMetadata directly or via hook logic
                // Since hooks can't be called in loops easily, we use the utility directly
                // passing secureFetch which is available from the hook useSecureFetch()
                const data = await unifiedExtractMetadata(url, secureFetch);
                results.push({ url, text: data.text, error: data.error });
            } catch (e) {
                results.push({ url, text: e.message, error: true });
            }

            completed++;
            setProgress(Math.round((completed / urls.length) * 100));
            // Update results progressively (optional, or just set at end)
            setBatchResults([...results]);
        }

        setProcessing(false);
    };

    const copyAll = () => {
        const text = batchResults.map(r => r.error ? '' : r.text.replace(/<[^>]*>/g, '')).filter(Boolean).join('\n\n');
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="bg-white p-10 rounded-3xl shadow-modal border border-border flex flex-col gap-6 animate-fadeIn">
            <div>
                <label className="block mb-3 font-bold text-primary">Lista de Enlaces o DOIs (uno por línea)</label>
                <textarea
                    className="w-full p-4 border-2 border-border rounded-xl text-base transition-colors focus:outline-none focus:border-accent bg-white font-mono text-sm resize-y min-h-[200px]"
                    placeholder="https://repositorio.upao.edu.pe/item/...\n10.1016/j.socscimed..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />
            </div>

            <Button onClick={handleBatchProcess} isLoading={processing} className="w-full justify-center">
                <i className="fas fa-layer-group"></i> Procesar Todo el Lote
            </Button>

            {processing && (
                <div className="mt-4">
                    <div className="flex justify-between mb-2 text-sm font-semibold">
                        <span>Procesando...</span>
                        <span>{progress}%</span>
                    </div>
                    <div className="h-2 bg-border rounded-full overflow-hidden">
                        <div className="h-full bg-accent transition-all duration-300" style={{ width: `${progress}%` }}></div>
                    </div>
                </div>
            )}

            {batchResults.length > 0 && !processing && (
                <div className="mt-8 animate-fadeIn">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-base font-bold m-0 text-primary">Referencias Generadas</h3>
                        <button onClick={copyAll} className="bg-gray-100 hover:bg-gray-200 text-primary py-2 px-4 rounded-full font-bold inline-flex items-center gap-3 transition-all duration-300 border-none cursor-pointer text-sm">
                            <i className="far fa-copy"></i> Copiar Todo
                        </button>
                    </div>
                    <div className="flex flex-col gap-4">
                        {batchResults.map((res, idx) => (
                            <div key={idx} className={`p-4 rounded-xl border ${res.error ? 'bg-red-50 border-red-100' : 'bg-white border-border'}`}>
                                <div className="text-xs text-gray-500 mb-2 flex justify-between">
                                    <span>{res.url}</span>
                                    <span className={res.error ? 'text-red-500' : 'text-green-500 font-bold'}>{res.error ? 'Error' : 'Éxito'}</span>
                                </div>
                                <div className="text-sm" dangerouslySetInnerHTML={{ __html: res.text }}></div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
