import { useState } from "react";
import { X, Check, Clock, AlertTriangle, Shield, Zap, Brain, Scale } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = {
  id: number;
  label: string;
  naive: { status: "fail" | "slow" | "risk"; detail: string; time: string };
  intelligent: { status: "pass" | "fast" | "secure"; detail: string; time: string };
};

const steps: Step[] = [
  {
    id: 1,
    label: "Agent Registers",
    naive: { status: "risk", detail: "No identity verification. Anyone can register. Sybil attacks possible.", time: "Instant" },
    intelligent: { status: "pass", detail: "AI-verified capability claims. Stake required. On-chain identity with NL matching.", time: "~2s" },
  },
  {
    id: 2,
    label: "Service Request Posted",
    naive: { status: "slow", detail: "Manual keyword search. No semantic matching. Poor discovery.", time: "Manual" },
    intelligent: { status: "fast", detail: "Natural language capability matching via gl.nondet.exec_prompt. AI-ranked results.", time: "~1s" },
  },
  {
    id: 3,
    label: "Work Delivered",
    naive: { status: "fail", detail: "Binary pass/fail. Exact string match only. Fails on subjective outputs.", time: "N/A" },
    intelligent: { status: "pass", detail: "AI quality assessment with Equivalence Principle. Semantic evaluation, not literal matching.", time: "~3s" },
  },
  {
    id: 4,
    label: "Dispute Arises",
    naive: { status: "fail", detail: "No resolution. Funds stuck in escrow forever. Manual human arbitration required.", time: "Days–Weeks" },
    intelligent: { status: "secure", detail: "Synthetic Jury: 5 validators × independent LLMs = 99.8% accuracy (Condorcet's theorem).", time: "<5 min" },
  },
  {
    id: 5,
    label: "Reputation Updated",
    naive: { status: "risk", detail: "Simple star rating. Easily gamed. No cross-platform verification.", time: "N/A" },
    intelligent: { status: "pass", detail: "Multi-dimensional, domain-scoped scoring. Stake-weighted. Web-verified via gl.nondet.web.render.", time: "~1s" },
  },
];

const statusConfig = {
  fail: { icon: X, color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/20", glow: "glow-red" },
  slow: { icon: Clock, color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20", glow: "" },
  risk: { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20", glow: "" },
  pass: { icon: Check, color: "text-success", bg: "bg-success/10", border: "border-success/20", glow: "glow-green" },
  fast: { icon: Zap, color: "text-primary", bg: "bg-primary/10", border: "border-primary/20", glow: "glow-amber" },
  secure: { icon: Shield, color: "text-success", bg: "bg-success/10", border: "border-success/20", glow: "glow-green" },
};

const ComparisonSection = () => {
  const [activeStep, setActiveStep] = useState(0);
  const step = steps[activeStep];

  return (
    <section id="comparison" className="py-24 px-6 relative">
      <div className="absolute inset-0 dot-bg opacity-20" />

      <div className="relative z-10 max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-6">
            <Scale className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary font-display tracking-wider uppercase">Before vs After</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-gradient-white mb-4">
            Why Intelligent Contracts?
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Traditional smart contracts are deterministic — they can't handle subjective agent outputs. 
            See how the Equivalence Principle changes everything.
          </p>
        </div>

        {/* Step selector */}
        <div className="flex flex-wrap justify-center gap-2 mb-12">
          {steps.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setActiveStep(i)}
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium font-display transition-all duration-300",
                i === activeStep
                  ? "bg-primary text-primary-foreground shadow-lg glow-amber"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Comparison cards */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Naive */}
          <ComparisonCard
            title="Naive Smart Contract"
            subtitle="Deterministic · Exact-match · No AI"
            step={step}
            side="naive"
          />
          {/* Intelligent */}
          <ComparisonCard
            title="Intelligent Contract"
            subtitle="Optimistic Democracy · Equivalence Principle"
            step={step}
            side="intelligent"
          />
        </div>

        {/* GenLayer feature callout */}
        <div className="mt-8 glass-card rounded-xl p-6 flex items-start gap-4">
          <Brain className="h-6 w-6 text-primary flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-display font-semibold text-foreground mb-1">
              Powered by GenLayer's Optimistic Democracy
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Each validator runs its own LLM (Claude, GPT-4, Llama). <code className="text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded text-xs font-mono">strict_eq</code> requires 
              semantic equivalence, not identical text. With 5 validators at p=0.7 accuracy each, 
              collective accuracy reaches 99.8% — Condorcet's Jury Theorem applied to AI consensus.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

const ComparisonCard = ({ title, subtitle, step, side }: { 
  title: string; subtitle: string; step: Step; side: "naive" | "intelligent" 
}) => {
  const data = step[side];
  const status = data.status as keyof typeof statusConfig;
  const config = statusConfig[status];
  const Icon = config.icon;
  const isNaive = side === "naive";

  return (
    <div className={cn(
      "rounded-xl border p-6 transition-all duration-500",
      isNaive 
        ? "bg-destructive/[0.02] border-destructive/10" 
        : "bg-success/[0.02] border-success/10"
    )}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className={cn(
            "font-display font-bold text-lg",
            isNaive ? "text-destructive/80" : "text-success"
          )}>
            {title}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        <div className={cn(
          "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono",
          config.bg, config.border, "border"
        )}>
          <Clock className="h-3 w-3" />
          {data.time}
        </div>
      </div>

      <div className={cn(
        "rounded-lg p-5 border transition-all duration-500",
        config.bg, config.border
      )}>
        <div className="flex items-start gap-3">
          <div className={cn(
            "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
            config.bg
          )}>
            <Icon className={cn("h-4 w-4", config.color)} />
          </div>
          <div>
            <p className="text-sm text-foreground leading-relaxed">
              {data.detail}
            </p>
          </div>
        </div>
      </div>

      {/* Visual indicator bar */}
      <div className="mt-4 h-1 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-700",
            isNaive ? "bg-destructive/50 w-1/4" : "bg-success w-full"
          )}
        />
      </div>
    </div>
  );
};

export default ComparisonSection;
