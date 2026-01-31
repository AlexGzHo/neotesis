import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';

export const ChatPanel = ({ pdfContext, quota }) => {
    const { messages, loading, sendMessage, error } = useChat(quota);
    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || loading) return;
        const msg = input;
        setInput('');
        await sendMessage(msg, pdfContext);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full bg-white border-l border-slate-200">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-10">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_2px_rgba(16,185,129,0.2)]"></div>
                    <h2 className="font-bold text-slate-800 text-sm">Neotesis IA</h2>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-4 bg-white">
                {messages.length === 0 && (
                    <div className="flex flex-col gap-2 animate-fadeIn items-start">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center flex-shrink-0 text-primary transition-transform hover:scale-110">
                                <i className="fas fa-robot text-sm"></i>
                            </div>
                            <p className="text-[10px] text-accent font-extrabold uppercase tracking-widest">Neotesis IA</p>
                        </div>
                        <div className="bg-slate-50/80 text-slate-600 rounded-2xl rounded-tl-none py-3.5 px-5 text-[14px] leading-relaxed max-w-[90%] shadow-sm border border-slate-100/50">
                            ¡Hola! Carga un PDF a la izquierda para comenzar el análisis.
                        </div>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex flex-col gap-1 w-full animate-fadeIn ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-center gap-2 mb-1">
                            {msg.role === 'assistant' && (
                                <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center flex-shrink-0 text-primary shadow-sm">
                                    <i className="fas fa-robot text-sm"></i>
                                </div>
                            )}
                            <p className={`text-[10px] font-extrabold uppercase tracking-widest ${msg.role === 'user' ? 'text-accent' : 'text-accent'}`}>
                                {msg.role === 'user' ? 'Tú' : 'Neotesis IA'}
                            </p>
                        </div>
                        <div className={`py-3.5 px-5 text-[14px] leading-relaxed max-w-[90%] transition-all ${msg.role === 'user' ? 'bg-accent text-white rounded-2xl rounded-tr-none shadow-glow' : 'bg-slate-50/80 text-slate-700 rounded-2xl rounded-tl-none border border-slate-100/50 shadow-sm'}`}>
                            {msg.content}
                        </div>
                    </div>
                ))}

                {loading && (
                    <div className="flex flex-col gap-1 w-full items-start">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-8 rounded-xl bg-primary/5 flex items-center justify-center flex-shrink-0 text-primary shadow-sm">
                                <i className="fas fa-robot text-sm"></i>
                            </div>
                            <p className="text-[10px] text-accent font-extrabold uppercase tracking-widest">Neotesis IA</p>
                        </div>
                        <div className="bg-slate-50/80 py-4 px-6 rounded-2xl rounded-tl-none border border-slate-100/50 shadow-sm">
                            <div className="flex gap-1.5">
                                <span className="w-1.5 h-1.5 bg-accent/40 rounded-full animate-bounce"></span>
                                <span className="w-1.5 h-1.5 bg-accent/40 rounded-full animate-bounce delay-100"></span>
                                <span className="w-1.5 h-1.5 bg-accent/40 rounded-full animate-bounce delay-200"></span>
                            </div>
                        </div>
                    </div>
                )}

                {error && <div className="text-red-500 text-xs text-center p-2 bg-red-50 rounded-lg">{error}</div>}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-100 bg-white/50 backdrop-blur-sm z-20">
                <div className="relative flex items-end gap-3 transition-all p-3 rounded-2xl bg-white border border-slate-200 shadow-sm focus-within:shadow-md focus-within:border-accent/30 focus-within:ring-4 focus-within:ring-accent/5">
                    <textarea
                        className="flex-grow bg-transparent border-none focus:ring-0 text-[14px] py-1 px-1 resize-none placeholder:text-slate-400 custom-scrollbar max-h-32 leading-relaxed min-h-[24px]"
                        placeholder={quota.isAvailable ? "Haz una pregunta sobre el documento..." : "Cuota diaria agotada"}
                        rows="1"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        disabled={!quota.isAvailable || loading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || loading || !quota.isAvailable}
                        className="w-10 h-10 bg-accent text-white rounded-xl flex items-center justify-center hover:bg-accent-hover transition-all shadow-glow flex-shrink-0 disabled:opacity-30 disabled:grayscale disabled:cursor-not-allowed"
                    >
                        <span className="material-icons-round text-[20px]">send</span>
                    </button>
                </div>
                <p className="text-[9px] text-center text-slate-300 mt-2 flex items-center justify-center gap-1">
                    {!quota.isAvailable && <span className="text-red-400 font-bold mr-1">Límite alcanzado</span>}
                    <span className="material-icons-round text-[10px]">bolt</span>
                    Powered by Gemini 2.0 Flash
                </p>
            </div>
        </div>
    );
};
