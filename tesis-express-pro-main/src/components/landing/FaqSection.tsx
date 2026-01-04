import { HelpCircle } from "lucide-react";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { content } from "@/content/landingContent";

const FaqSection = () => {
    return (
        <section className="py-24 md:py-32 bg-background relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/5 rounded-full blur-3xl opacity-50" />

            <div className="container relative z-10">
                <div className="max-w-3xl mx-auto">
                    <div className="text-center space-y-4 mb-16">
                        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-bold tracking-wide">
                            <HelpCircle className="w-4 h-4" />
                            Dudas comunes
                        </div>
                        <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground">
                            {content.faq.title}
                        </h2>
                        <div className="h-1.5 w-24 bg-primary/20 mx-auto rounded-full" />
                    </div>

                    <Accordion type="single" collapsible className="w-full space-y-4">
                        {content.faq.items.map((item, index) => (
                            <AccordionItem
                                key={index}
                                value={`item-${index}`}
                                className="bg-card border border-border/50 rounded-2xl overflow-hidden shadow-soft hover:shadow-card transition-all duration-300"
                            >
                                <AccordionTrigger className="text-left text-lg font-semibold hover:text-primary hover:no-underline px-6 py-5 group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                                            <span className="text-sm font-bold">?</span>
                                        </div>
                                        {item.question}
                                    </div>
                                </AccordionTrigger>
                                <AccordionContent className="text-muted-foreground text-base leading-relaxed px-6 pb-6 pt-2 border-t border-border/30 bg-secondary/20">
                                    <div className="pl-12">
                                        {item.answer}
                                    </div>
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                </div>
            </div>
        </section>
    );
};

export default FaqSection;
