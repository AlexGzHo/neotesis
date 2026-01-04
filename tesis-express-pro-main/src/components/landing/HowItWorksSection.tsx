import { content } from "@/content/landingContent";
import { MessageCircle, Search, FileEdit, CheckCircle, LucideIcon } from "lucide-react";

const stepIcons: LucideIcon[] = [MessageCircle, Search, FileEdit, CheckCircle];

const HowItWorksSection = () => {
    return (
        <section className="py-20 bg-secondary/30">
            <div className="container">
                <div className="max-w-3xl mx-auto text-center space-y-6 mb-16">
                    <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                        {content.howItWorks.title} <span className="text-gradient">{content.howItWorks.titleHighlight}</span>?
                    </h2>
                    <p className="text-lg text-muted-foreground">{content.howItWorks.subtitle}</p>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {content.howItWorks.steps.map((step, i) => {
                        const Icon = stepIcons[i];
                        return (
                            <div key={i} className="relative group">
                                {i < 3 && <div className="hidden lg:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-primary/30 to-transparent z-0" />}
                                <div className="bg-card rounded-3xl p-8 shadow-card border border-border/50 hover:shadow-elevated transition-all duration-300 relative z-10 h-full">
                                    <span className="absolute top-4 right-4 text-5xl font-display font-bold text-primary/40">{step.number}</span>
                                    <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                                        <Icon className="w-8 h-8 text-primary" />
                                    </div>
                                    <h3 className="font-display text-xl font-semibold text-foreground mb-3">{step.title}</h3>
                                    <p className="text-muted-foreground">{step.description}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
};

export default HowItWorksSection;
