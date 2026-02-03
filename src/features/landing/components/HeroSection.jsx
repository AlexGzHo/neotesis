import React from 'react';
import { Link } from 'react-router-dom';

export const HeroSection = () => {
    return (
        <div className="py-16 px-8 max-w-7xl mx-auto grid lg:grid-cols-2 items-center gap-16">
            <div className="hero-content">
                <h1 className="text-[3.5rem] font-extrabold leading-tight text-primary mb-6 tracking-tight">
                    Tu éxito académico, potenciado por IA y Expertos.
                </h1>
                <p className="text-xl text-gray mb-10 max-w-lg">
                    En Neotesis Perú combinamos la mejor asesoría académica con herramientas tecnológicas de última generación para tu tesis.
                </p>
                <div className="flex gap-4 flex-wrap">
                    <Link to="/ai-chat"
                        className="bg-accent hover:bg-accent-hover text-white py-3 px-7 rounded-full font-bold inline-flex items-center gap-3 transition-all duration-300 hover:scale-105 shadow-glow border-none cursor-pointer text-base w-fit no-underline">
                        Probar Chat PDF
                    </Link>
                    <a href="https://wa.me/51900000000?text=Hola,%20necesito%20asesoría%20con%20mi%20tesis" target="_blank" rel="noopener noreferrer"
                        className="bg-gray-100 hover:bg-gray-200 text-primary py-3 px-7 rounded-full font-bold inline-flex items-center gap-3 transition-all duration-300 border-none cursor-pointer text-base w-fit no-underline">
                        Asesoría Personalizada
                    </a>
                </div>
            </div>
            <div className="relative hero-image">
                <img src="/hero.png" alt="Estudiante profesional trabajando" className="w-full rounded-3xl shadow-hero" />
            </div>
        </div>
    );
};
