import { ShieldAlert, Cpu, FileSearch } from "lucide-react";
import { content } from "@/content/landingContent";

const iconMap = {
    ShieldAlert,
    Cpu,
    FileSearch,
};

const ServicesSection = () => {
    const whatsappUrl = `https://wa.me/${content.whatsappNumber}?text=${encodeURIComponent("Hola, me interesa información sobre ")}`;

    return (
        <section className="py-24 bg-primary relative overflow-hidden">
            {/* Decoración de fondo sutil */}
            <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-accent/20 rounded-full blur-[120px] opacity-20" />
            </div>

            <div className="container relative z-10">
                <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
                    <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 px-4 py-1.5 rounded-full text-sm font-bold border border-white/20 mb-2 backdrop-blur-sm">
                        Soluciones Premium
                    </div>
                    <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-bold text-white leading-tight">
                        {content.otherServices.title}{" "}
                        <span className="text-accent italic">
                            {content.otherServices.titleHighlight}
                        </span>
                    </h2>
                    <p className="text-lg md:text-xl text-white/70 leading-relaxed font-light">
                        {content.otherServices.subtitle}
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                    {content.otherServices.items.map((service, index) => {
                        const Icon = iconMap[service.icon as keyof typeof iconMap];
                        return (
                            <div
                                key={index}
                                className="group relative bg-[#1e1e1e]/40 backdrop-blur-md rounded-[2.5rem] p-10 shadow-2xl hover:bg-white/5 transition-all duration-500 border border-white/10 flex flex-col items-center text-center space-y-8"
                            >
                                {/* Brillo en hover */}
                                <div className="absolute -inset-0.5 bg-gradient-to-br from-accent to-primary rounded-[2.5rem] opacity-0 group-hover:opacity-30 blur-sm transition-opacity duration-500" />

                                <div className="relative w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center group-hover:bg-accent group-hover:rotate-6 transition-all duration-500">
                                    <Icon className="w-10 h-10 text-white group-hover:text-primary transition-colors duration-500" />
                                </div>
                                <div className="relative space-y-4">
                                    <h3 className="font-display text-xl md:text-2xl font-black text-accent uppercase tracking-wider">
                                        {service.title}
                                        <span className="block h-1 w-12 bg-accent/30 mx-auto mt-2 rounded-full group-hover:w-20 transition-all duration-500" />
                                    </h3>
                                    <p className="text-white/70 text-lg leading-relaxed font-light">
                                        {service.description}
                                    </p>
                                </div>

                                <div className="relative pt-4">
                                    <a
                                        href={`${whatsappUrl}${encodeURIComponent(service.title)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-accent font-bold text-sm uppercase tracking-widest flex items-center gap-2 group-hover:gap-4 transition-all"
                                    >
                                        Consultar ahora <FileSearch className="w-4 h-4" />
                                    </a>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default ServicesSection;
