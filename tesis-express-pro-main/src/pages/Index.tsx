import { useState, lazy, Suspense } from "react";
import { content } from "@/content/landingContent";
import { FlipCountdown } from "@/components/FlipCountdown";
import { Button } from "@/components/ui/button";
import heroImage from "@/assets/hero-graduate.webp";
import {
  ArrowRight,
  MessageCircle,
  Check,
  Star,
  HelpCircle,
  AlertTriangle,
  TrendingDown,
  Clock,
  CheckCircle,
} from "lucide-react";

// Lazy Sections
const HowItWorksSection = lazy(() => import("@/components/landing/HowItWorksSection"));
const TestimonialsSection = lazy(() => import("@/components/landing/TestimonialsSection"));
const AuthoritySection = lazy(() => import("@/components/landing/AuthoritySection"));
const LeadMagnetSection = lazy(() => import("@/components/landing/LeadMagnetSection"));
const FaqSection = lazy(() => import("@/components/landing/FaqSection"));

const problemIcons = [HelpCircle, AlertTriangle, TrendingDown, Clock];

const Index = () => {
  const whatsappUrl = `https://wa.me/${content.whatsappNumber}?text=${encodeURIComponent(content.whatsappMessage)}`;
  const handleWhatsAppClick = () => window.open(whatsappUrl, "_blank");

  const handlePromoWhatsAppClick = () => {
    const url = `https://wa.me/${content.whatsappNumber}?text=${encodeURIComponent(content.promo.whatsappMessage)}`;
    window.open(url, "_blank");
  };

  const scrollToPromocion = () => {
    const element = document.getElementById("promocion");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <main className="min-h-screen">
      {/* ========== BANNER ========== */}
      <div className="bg-primary/95 backdrop-blur-md py-3 px-4 relative z-50 shadow-elevated border-b border-white/10 sticky top-0">
        <div className="container flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-primary-foreground text-center">
          <div className="flex items-center gap-3 text-base sm:text-lg md:text-xl font-extrabold tracking-tight">
            <span className="text-xl md:text-2xl animate-pulse drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]">✨</span>
            <span className="bg-gradient-to-r from-white via-white/90 to-white/70 bg-clip-text text-transparent">
              {content.banner.text}
            </span>
            <span className="opacity-30 hidden md:inline ml-1 text-2xl font-light">|</span>
            <span className="font-semibold opacity-80 hidden md:inline text-sm lg:text-base italic">
              {content.banner.subtext}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6">
            <button
              onClick={scrollToPromocion}
              className="bg-accent text-accent-foreground hover:bg-accent/90 px-6 py-2 rounded-lg font-black uppercase tracking-widest transition-all hover:scale-110 active:scale-95 shadow-[0_10px_30px_rgba(245,158,11,0.2)] text-xs md:text-sm"
            >
              {content.banner.cta}
            </button>

            <div className="flex items-center gap-3 py-1.5 px-3 bg-white/5 rounded-xl border border-white/10 shadow-inner scale-90 sm:scale-100 origin-center">
              <span className="text-xl md:text-2xl animate-bounce-slow">⏱</span>
              <FlipCountdown targetDate={content.banner.expiresAt!} />
            </div>
          </div>
        </div>
      </div>

      {/* ========== HERO ========== */}
      <section className="relative min-h-screen bg-background overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-accent/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />
        <div className="container relative z-10 py-8 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in-up">
              <div className="flex flex-col gap-4">
                <div
                  onClick={scrollToPromocion}
                  className="inline-flex items-center gap-2 bg-accent/20 text-accent-foreground px-4 py-2 rounded-full text-sm font-bold border border-accent/30 w-fit animate-pulse-slow cursor-pointer hover:bg-accent/30 transition-colors"
                >
                  <Star className="w-4 h-4 fill-accent" />
                  {content.hero.discountBadge}
                </div>
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-semibold w-fit">
                  <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                  {content.hero.badge}
                </div>
              </div>
              <h1 className="font-display text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-foreground">
                {content.hero.title} <span className="text-gradient">{content.hero.titleHighlight}</span> {content.hero.titleEnd}
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">{content.hero.subtitle}</p>
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Button variant="hero" size="xl" onClick={handleWhatsAppClick} className="group w-full sm:w-auto">
                  {content.hero.cta}
                  <ArrowRight className="transition-transform group-hover:translate-x-1" />
                </Button>
              </div>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-4 text-sm text-muted-foreground">
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
                <img
                  src={heroImage}
                  alt="Estudiante graduada"
                  className="w-full max-w-md mx-auto rounded-2xl shadow-elevated object-cover"
                  width="448"
                  height="448"
                  fetchPriority="high"
                />
              </div>
              <div className="absolute -bottom-4 left-4 md:-left-4 bg-card shadow-card rounded-2xl p-4 animate-float">
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
              <div className="absolute -top-4 right-4 md:-right-4 bg-card shadow-card rounded-2xl p-4 animate-float" style={{ animationDelay: "1s" }}>
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

      {/* ========== PROMOCIÓN ========== */}
      <section id="promocion" className="py-20 bg-primary relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/20 rounded-full blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl -translate-x-1/2 translate-y-1/2" />

        <div className="container relative z-10">
          <div className="bg-card rounded-[2.5rem] p-8 md:p-16 shadow-elevated border border-white/10 max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-accent text-accent-foreground px-6 py-2 rounded-full text-lg font-bold mb-8 animate-bounce">
              <Star className="w-5 h-5 fill-current" />
              {content.promo.discount} EXTRA
            </div>

            <h2 className="font-display text-3xl md:text-5xl lg:text-6xl font-extrabold text-foreground mb-6 leading-tight">
              {content.promo.title}
            </h2>

            <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              {content.promo.subtitle}
            </p>

            <div className="flex flex-col items-center gap-8 border-y border-border/50 py-12 mb-12">
              <p className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-sm">Precios Referenciales Sin Descuento</p>
              <div className="flex flex-wrap justify-center gap-6 md:gap-12 opacity-50">
                {content.promo.strikethroughPrices.map((price, i) => (
                  <span key={i} className="text-3xl md:text-5xl font-display font-light line-through decoration-accent decoration-2 decoration-solid">
                    {price}
                  </span>
                ))}
              </div>
              <div className="bg-accent/10 text-accent font-bold px-4 py-2 rounded-lg text-lg animate-pulse">
                ¡Elige el éxito, no el precio alto!
              </div>
            </div>

            <div className="space-y-6">
              <Button
                variant="cta"
                size="xl"
                onClick={handlePromoWhatsAppClick}
                className="w-full sm:w-auto px-12 h-20 text-xl font-bold bg-[#25D366] hover:bg-[#20bd5a] border-none shadow-[0_20px_40px_rgba(37,211,102,0.3)] hover:shadow-[0_25px_50px_rgba(37,211,102,0.4)] transition-all duration-300 transform hover:-translate-y-1 group"
              >
                <MessageCircle className="w-8 h-8 mr-2 group-hover:scale-110 transition-transform" />
                {content.promo.cta}
              </Button>
              <p className="text-muted-foreground text-sm italic">{content.promo.disclaimer}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ========== SECCIONES LAZY ========== */}
      <Suspense fallback={<div className="h-96 bg-secondary/10" />}>
        <HowItWorksSection />
      </Suspense>

      <Suspense fallback={<div className="h-96 bg-secondary/20" />}>
        <TestimonialsSection />
      </Suspense>

      <Suspense fallback={<div className="h-96 bg-background" />}>
        <AuthoritySection />
      </Suspense>

      <Suspense fallback={<div className="h-96 bg-primary" />}>
        <LeadMagnetSection />
      </Suspense>

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

      <Suspense fallback={<div className="h-96 bg-background" />}>
        <FaqSection />
      </Suspense>

      {/* ========== FOOTER ========== */}
      <footer className="py-12 bg-foreground text-primary-foreground">
        <div className="container">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-12">
            <div className="space-y-4 text-center md:text-left">
              <p className="text-lg font-medium leading-relaxed opacity-90">
                {content.footer.trustText}
              </p>
              <p className="text-sm opacity-50">
                {content.footer.disclaimer}
              </p>
            </div>

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
