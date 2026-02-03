import React from 'react';
import { HeroSection } from './HeroSection';
import { TrustBar } from './TrustBar';
import { ToolsGrid } from './ToolsGrid';

export const LandingPage = () => {
    return (
        <div className="animate-fadeIn">
            <HeroSection />
            <TrustBar />
            <ToolsGrid />

            {/* FINAL CTA */}
            <div className="bg-primary text-white py-24 px-8 text-center">
                <h2 className="text-4xl mb-6 font-bold">¿Necesitas ayuda experta con tu tesis?</h2>
                <p className="opacity-80 mb-10 text-xl max-w-2xl mx-auto">Contamos con un equipo de
                    especialistas listos para guiarte en todo el proceso.</p>
                <a href="https://wa.me/51900000000?text=Hola,%20necesito%20asesoría%20con%20mi%20tesis" target="_blank" rel="noopener noreferrer"
                    className="bg-[#25D366] hover:bg-[#1ebc57] text-white py-3 px-7 rounded-full font-bold inline-flex items-center gap-3 transition-all duration-300 border-none cursor-pointer text-base w-fit no-underline">
                    <i className="fab fa-whatsapp"></i> Hablar con un Asesor
                </a>
            </div>
        </div>
    );
};
