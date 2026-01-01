import { useState } from "react";
import { content } from "@/content/landingContent";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useToast } from "@/hooks/use-toast";
import heroImage from "@/assets/hero-graduate.jpg";
import {
  ArrowRight,
  MessageCircle,
  Download,
  Mail,
  User,
  Check,
  Star,
  HelpCircle,
  AlertTriangle,
  TrendingDown,
  Clock,
  Search,
  FileEdit,
  CheckCircle,
  Users,
  Target,
  Award,
} from "lucide-react";

const problemIcons = [HelpCircle, AlertTriangle, TrendingDown, Clock];
const stepIcons = [MessageCircle, Search, FileEdit, CheckCircle];
const authorityIcons = [Users, Target, Award];

const Index = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const whatsappUrl = `https://wa.me/${content.whatsappNumber}?text=${encodeURIComponent(content.whatsappMessage)}`;

  const handleWhatsAppClick = () => window.open(whatsappUrl, "_blank");

  const handleLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast({ title: "Campos requeridos", description: content.leadMagnet.errorRequired, variant: "destructive" });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "Correo inválido", description: content.leadMagnet.errorEmail, variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1500));
    toast({ title: content.leadMagnet.successTitle, description: content.leadMagnet.successMessage });
    setName("");
    setEmail("");
    setIsSubmitting(false);
  };

  return (
    <main className="min-h-screen">
      {/* ========== HERO ========== */}
      <section className="relative min-h-screen bg-background overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        <div className="container relative z-10 py-12 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold">
                <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                {content.hero.badge}
              </div>
              <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-foreground">
                {content.hero.title} <span className="text-gradient">{content.hero.titleHighlight}</span> {content.hero.titleEnd}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">{content.hero.subtitle}</p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button variant="hero" size="xl" onClick={handleWhatsAppClick} className="group">
                  {content.hero.cta}
                  <ArrowRight className="transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
              <div className="flex items-center gap-6 pt-4 text-sm text-muted-foreground">
                {content.hero.trustItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Check className="w-5 h-5 text-primary" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative animate-fade-in-delay-2">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full scale-90 blur-xl" />
              <div className="relative bg-gradient-to-br from-primary/10 to-transparent p-4 rounded-3xl">
                <img src={heroImage} alt="Estudiante graduada" className="w-full max-w-md mx-auto rounded-2xl shadow-elevated object-cover" />
              </div>
              <div className="absolute -bottom-4 -left-4 md:left-4 bg-card shadow-card rounded-2xl p-4 animate-float">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{content.hero.floatingBadge1.title}</p>
                    <p className="text-sm text-muted-foreground">{content.hero.floatingBadge1.subtitle}</p>
                  </div>
                </div>
              </div>
              <div className="absolute -top-4 -right-4 md:right-4 bg-card shadow-card rounded-2xl p-4 animate-float" style={{ animationDelay: "1s" }}>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-accent/20 rounded-xl flex items-center justify-center">
                    <span className="text-2xl font-bold text-accent">{content.hero.floatingBadge2.number}</span>
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{content.hero.floatingBadge2.title}</p>
                    <p className="text-sm text-muted-foreground">{content.hero.floatingBadge2.subtitle}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== PROBLEMA ========== */}
      <section className="py-20 bg-secondary/50">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-6 mb-16">
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
              {content.problem.title} <span className="text-gradient">{content.problem.titleHighlight}</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {content.problem.items.map((text, i) => {
              const Icon = problemIcons[i];
              return (
                <div key={i} className="bg-card rounded-2xl p-6 shadow-card hover:shadow-elevated transition-all duration-300 border border-border/50 group">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-lg text-foreground font-medium leading-relaxed">{text}</p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="max-w-2xl mx-auto mt-12 text-center">
            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8">
              <p className="text-xl md:text-2xl font-display font-semibold text-foreground">
                {content.problem.conclusion} <span className="text-primary">{content.problem.conclusionHighlight}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SOLUCIÓN ========== */}
      <section className="py-20 bg-background">
        <div className="container">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 bg-accent/20 text-accent-foreground px-4 py-2 rounded-full text-sm font-semibold">
                <span className="w-2 h-2 bg-accent rounded-full" />
                {content.solution.badge}
              </div>
              <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
                {content.solution.title} <span className="text-gradient">{content.solution.titleHighlight}</span>
              </h2>
              <p className="text-lg text-muted-foreground leading-relaxed">{content.solution.description}</p>
            </div>
            <div className="bg-card rounded-3xl p-8 shadow-card border border-border/50">
              <h3 className="font-display text-xl font-semibold text-foreground mb-6">{content.solution.featuresTitle}</h3>
              <div className="space-y-4">
                {content.solution.features.map((f, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-secondary/50 rounded-xl hover:bg-secondary transition-colors">
                    <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center shrink-0">
                      <Check className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <p className="text-foreground font-medium">{f}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CÓMO FUNCIONA ========== */}
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

      {/* ========== TESTIMONIOS ========== */}
      <section className="py-20 md:py-28 bg-secondary/50">
        <div className="container mx-auto px-4 max-w-6xl">
          <div className="text-center mb-16">
            <span className="text-primary font-semibold text-sm uppercase tracking-wider">{content.testimonials.badge}</span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mt-3 mb-4">{content.testimonials.title}</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{content.testimonials.subtitle}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {content.testimonials.items.map((t, i) => (
              <Card key={i} className="group bg-card border-border/50 hover:border-primary/30 transition-all duration-300 hover:shadow-elevated hover:-translate-y-2 cursor-default">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="relative">
                      <img src={t.image} alt={t.name} className="w-14 h-14 rounded-full object-cover ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all duration-300" />
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

      {/* ========== AUTORIDAD ========== */}
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

      {/* ========== LEAD MAGNET ========== */}
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
              <form onSubmit={handleLeadSubmit} className="space-y-4 max-w-md mx-auto">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={content.leadMagnet.namePlaceholder}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-14 pl-12 pr-4 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    maxLength={100}
                  />
                </div>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="email"
                    placeholder={content.leadMagnet.emailPlaceholder}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full h-14 pl-12 pr-4 bg-secondary border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                    maxLength={255}
                  />
                </div>
                <Button type="submit" variant="hero" size="lg" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? content.leadMagnet.submitting : content.leadMagnet.cta}
                </Button>
                <p className="text-xs text-center text-muted-foreground">{content.leadMagnet.privacy}</p>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* ========== CTA FINAL ========== */}
      <section className="py-20 bg-gradient-to-br from-background via-secondary/30 to-background">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center space-y-8">
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
              {content.finalCta.title} <span className="text-gradient">{content.finalCta.titleHighlight}</span> {content.finalCta.titleEnd}
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">{content.finalCta.description}</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button variant="cta" size="xl" onClick={handleWhatsAppClick} className="group">
                <MessageCircle className="w-6 h-6" />
                {content.finalCta.cta}
                <ArrowRight className="transition-transform group-hover:translate-x-1" />
              </Button>
            </div>
            <div className="flex items-center justify-center gap-6 pt-4 text-sm text-muted-foreground">
              {content.finalCta.trustItems.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-primary" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ========== FAQ ========== */}
      <section className="py-24 md:py-32 bg-secondary/20 border-t border-border/50">
        <div className="container">
          <div className="max-w-3xl mx-auto space-y-8">
            <div className="text-center space-y-4 mb-12">
              <span className="text-primary font-semibold text-sm uppercase tracking-wider">Dudas comunes</span>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
                {content.faq.title}
              </h2>
            </div>

            <Accordion type="single" collapsible className="w-full">
              {content.faq.items.map((item, index) => (
                <AccordionItem key={index} value={`item-${index}`} className="border-b border-border/50">
                  <AccordionTrigger className="text-left text-lg font-medium hover:text-primary transition-colors py-6">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </div>
      </section>

      {/* ========== FOOTER ========== */}
      <footer className="py-12 bg-foreground text-primary-foreground">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-12">
            {/* Columna Izquierda: Confianza */}
            <div className="space-y-4 text-center md:text-left">
              <p className="text-lg font-medium leading-relaxed opacity-90">
                {content.footer.trustText}
              </p>
              <p className="text-sm opacity-50">
                {content.footer.disclaimer}
              </p>
            </div>

            {/* Columna Derecha: WhatsApp CTA */}
            <div className="flex flex-col items-center md:items-end gap-4">
              <button
                onClick={handleWhatsAppClick}
                className="group relative inline-flex items-center gap-3 bg-[#25D366] hover:bg-[#20bd5a] text-white px-8 py-4 rounded-full font-bold text-lg transition-all duration-300 transform hover:scale-105 hover:shadow-[0_0_20px_rgba(37,211,102,0.5)] animate-pulse-slow"
              >
                <MessageCircle className="w-6 h-6" />
                {content.footer.whatsappCta}
              </button>
            </div>
          </div>

          {/* Bottom Footer */}
          <div className="pt-8 border-t border-primary-foreground/10 text-center">
            <p className="opacity-40 text-sm">
              © 2026 – {content.footer.copyright}
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
};

export default Index;
