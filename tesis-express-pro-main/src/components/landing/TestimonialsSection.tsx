import { Star, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { content } from "@/content/landingContent";

const TestimonialsSection = () => {
    return (
        <section className="py-20 md:py-28 bg-secondary/50">
            <div className="container mx-auto px-4 max-w-6xl">
                <div className="text-center mb-16">
                    <span className="text-primary font-semibold text-sm uppercase tracking-wider">{content.testimonials.badge}</span>
                    <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mt-3 mb-4">{content.testimonials.title}</h2>
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{content.testimonials.subtitle}</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {content.testimonials.items.map((t, i) => (
                        <Card key={i} className="group bg-card border-border/50 hover:border-primary/30 transition duration-300 hover:shadow-elevated hover:-translate-y-2 cursor-default">
                            <CardContent className="p-6">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="relative">
                                        <img
                                            src={t.image}
                                            alt={t.name}
                                            className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary/50 transition duration-300"
                                            loading="lazy"
                                            decoding="async"
                                            width="56"
                                            height="56"
                                        />
                                        <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                                            <Check className="w-3 h-3 text-primary-foreground" />
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors duration-300">{t.name}</h3>
                                        <p className="text-sm text-muted-foreground">{t.career}</p>
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    {[...Array(5)].map((_, j) => (
                                        <Star key={j} className={`w-4 h-4 ${j < t.rating ? "fill-accent text-accent" : "fill-muted text-muted"}`} />
                                    ))}
                                </div>
                                <p className="mt-4 text-muted-foreground leading-relaxed text-sm">"{t.review}"</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default TestimonialsSection;
