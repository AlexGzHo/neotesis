import { useState } from "react";
import { Download, Mail, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { content } from "@/content/landingContent";
import { useToast } from "@/hooks/use-toast";
import guiaPdf from "@/assets/5_Trucos_Infalibles_para_Acelerar_Tu_Tesis_Corrigido.pdf";

const LeadMagnetSection = () => {
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [hasDownloaded, setHasDownloaded] = useState(false);
    const { toast } = useToast();

    const handleLeadSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) {
            toast({ title: "Campo requerido", description: content.leadMagnet.errorRequired, variant: "destructive" });
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast({ title: "Correo inválido", description: content.leadMagnet.errorEmail, variant: "destructive" });
            return;
        }
        setIsSubmitting(true);
        await new Promise((r) => setTimeout(r, 1500));

        // Trigger download
        const link = document.createElement("a");
        link.href = guiaPdf;
        link.download = "5_Trucos_Infalibles_para_Acelerar_Tu_Tesis.pdf";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast({ title: content.leadMagnet.successTitle, description: content.leadMagnet.successMessage });
        setEmail("");
        setIsSubmitting(false);
        setHasDownloaded(true);
    };

    return (
        <section className="py-20 bg-primary">
            <div className="container">
                <div className="max-w-3xl mx-auto">
                    <div className="bg-card rounded-3xl p-8 md:p-12 shadow-elevated">
                        <div className="text-center space-y-6 mb-10">
                            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
                                <Download className="w-10 h-10 text-primary" />
                            </div>
                            <h2 className="font-display text-2xl md:text-3xl lg:text-4xl font-bold text-foreground">{content.leadMagnet.title}</h2>
                            <p className="text-lg text-muted-foreground max-w-xl mx-auto">{content.leadMagnet.description}</p>
                        </div>
                        {!hasDownloaded ? (
                            <form onSubmit={handleLeadSubmit} className="space-y-4 max-w-md mx-auto animate-fade-in">
                                <div className="relative">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                                    <input
                                        type="email"
                                        placeholder={content.leadMagnet.emailPlaceholder}
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full h-14 pl-12 pr-4 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                                        maxLength={255}
                                    />
                                </div>
                                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
                                    {isSubmitting ? content.leadMagnet.submitting : content.leadMagnet.cta}
                                </Button>
                                <p className="text-xs text-center text-muted-foreground">{content.leadMagnet.privacy}</p>
                            </form>
                        ) : (
                            <div className="bg-primary/5 rounded-2xl p-8 border border-primary/10 text-center animate-scale-in">
                                <div className="w-16 h-16 bg-primary text-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                                    <Check className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-bold text-foreground mb-2">¡Gracias por descargar!</h3>
                                <p className="text-muted-foreground">{content.leadMagnet.successMessage}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </section>
    );
};

export default LeadMagnetSection;
