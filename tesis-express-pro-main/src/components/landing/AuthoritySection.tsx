import { content } from "@/content/landingContent";
import { Users, Target, Award, LucideIcon } from "lucide-react";

const authorityIcons: LucideIcon[] = [Users, Target, Award];

const AuthoritySection = () => {
    return (
        <section className="py-20 bg-background">
            <div className="container">
                <div className="max-w-4xl mx-auto">
                    <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-3xl p-8 md:p-12 border border-primary/10">
                        <div className="text-center space-y-6 mb-12">
                            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">{content.authority.title}</h2>
                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{content.authority.description}</p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-6">
                            {content.authority.points.map((p, i) => {
                                const Icon = authorityIcons[i];
                                return (
                                    <div key={i} className="bg-card rounded-2xl p-6 shadow-soft hover:shadow-card transition-all duration-300">
                                        <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                                            <Icon className="w-7 h-7 text-primary" />
                                        </div>
                                        <h3 className="font-display text-lg font-semibold text-foreground mb-2">{p.title}</h3>
                                        <p className="text-muted-foreground text-sm leading-relaxed">{p.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default AuthoritySection;
