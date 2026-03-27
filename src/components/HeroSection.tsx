import { ArrowRight, Shield, Zap, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";

const HeroSection = ({ onScrollToComparison }: { onScrollToComparison: () => void }) => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-primary/3 rounded-full blur-[100px]" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/20 bg-primary/5 mb-8 animate-fade-in">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse-subtle" />
          <span className="text-sm font-medium text-primary font-display tracking-wide">
            GenLayer Bradbury Hackathon
          </span>
        </div>

        {/* Title */}
        <h1 className="font-display font-bold tracking-tight mb-6 animate-slide-up">
          <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-gradient-white leading-[1.1]">
            Agent Economy
          </span>
          <span className="block text-5xl sm:text-6xl md:text-7xl lg:text-8xl text-gradient-amber leading-[1.1] mt-2">
            Hub
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 animate-slide-up font-body leading-relaxed" style={{ animationDelay: "0.15s" }}>
          A dispute-aware economic kernel for autonomous AI agents. 
          Trustless commerce with <span className="text-foreground font-medium">Optimistic Democracy</span> consensus 
          and the <span className="text-foreground font-medium">Equivalence Principle</span>.
        </p>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-slide-up" style={{ animationDelay: "0.3s" }}>
          <Button 
            onClick={onScrollToComparison}
            size="lg"
            className="font-display font-semibold text-base px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl glow-amber"
          >
            See the Demo
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button 
            variant="outline" 
            size="lg"
            className="font-display font-semibold text-base px-8 py-6 border-border hover:border-primary/30 rounded-xl"
            onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })}
          >
            How It Works
          </Button>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-6 mt-16 max-w-lg mx-auto animate-slide-up" style={{ animationDelay: "0.45s" }}>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="text-2xl font-bold font-display text-foreground">100×</div>
            <div className="text-xs text-muted-foreground">Cheaper than courts</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Scale className="h-5 w-5 text-primary" />
            </div>
            <div className="text-2xl font-bold font-display text-foreground">99.8%</div>
            <div className="text-xs text-muted-foreground">Jury accuracy</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Shield className="h-5 w-5 text-primary" />
            </div>
            <div className="text-2xl font-bold font-display text-foreground">&lt;5min</div>
            <div className="text-xs text-muted-foreground">Settlement time</div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-float">
        <div className="w-6 h-10 rounded-full border-2 border-muted-foreground/30 flex items-start justify-center p-1.5">
          <div className="w-1.5 h-3 rounded-full bg-muted-foreground/50 animate-pulse-subtle" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
