import React from 'react';
import { Link } from 'react-router-dom';

const ToolCard = ({ icon, title, description, link, linkText }) => (
    <div className="bg-white p-12 rounded-3xl shadow-card transition-all duration-300 border border-border flex flex-col gap-6 hover:-translate-y-2.5 hover:shadow-card-hover hover:border-accent">
        <i className={`${icon} text-4xl text-accent`}></i>
        <h3 className="text-2xl text-primary font-semibold">{title}</h3>
        <p className="text-gray">{description}</p>
        <Link to={link} className="bg-accent hover:bg-accent-hover text-white py-3 px-7 rounded-full font-bold inline-flex items-center gap-3 transition-all duration-300 hover:scale-105 shadow-glow border-none cursor-pointer text-base w-fit no-underline">
            {linkText}
        </Link>
    </div>
);

export const ToolsGrid = () => {
    return (
        <div className="py-16 px-8 max-w-7xl mx-auto">
            <div className="text-center mb-8">
                <h2 className="text-4xl text-primary mb-4 font-bold">Herramientas Gratuitas</h2>
                <p className="text-lg text-gray">Diseñadas para facilitar cada etapa de tu investigación.</p>
            </div>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                <ToolCard
                    icon="fas fa-quote-right"
                    title="Generador APA 7ma"
                    description="Cita tus fuentes en segundos con total precisión. Olvídate de los errores manuales."
                    link="/citation-tools"
                    linkText="Usar Generador"
                />
                <ToolCard
                    icon="fas fa-magic"
                    title="Auto-Cita URL/DOI"
                    description="Genera citas bibliográficas pegando solo el enlace o el DOI."
                    link="/citation-tools"
                    linkText="Probar Auto-Cita"
                />
                <ToolCard
                    icon="fas fa-layer-group"
                    title="Cita en Lote"
                    description="Procesa hasta 20 URLs o DOIs de forma simultánea. Ideal para bibliografías completas."
                    link="/citation-tools"
                    linkText="Ir a Cita en Lote"
                />
                <ToolCard
                    icon="fas fa-calculator"
                    title="Calculadora de Muestra"
                    description="Determina el tamaño de muestra ideal para tu investigación cuantitativa."
                    link="/sample-calculator"
                    linkText="Calcular Muestra"
                />
                <ToolCard
                    icon="fas fa-robot"
                    title="Neotesis IA - Chat PDF"
                    description="Sube tu PDF y deja que nuestra IA analice el contenido por ti."
                    link="/ai-chat"
                    linkText="Abrir Chat IA"
                />
            </div>
        </div>
    );
};
