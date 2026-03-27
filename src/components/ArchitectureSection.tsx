import { cn } from "@/lib/utils";

const layers = [
  {
    label: "Agent Applications",
    sublabel: "Autonomous trading, services, market making",
    color: "border-blue-400/30 bg-blue-400/5",
    textColor: "text-blue-400",
  },
  {
    label: "Agent Economy Layer",
    sublabel: null,
    color: "border-primary/30 bg-primary/5",
    textColor: "text-primary",
    modules: [
      { name: "Identity", sub: "Registry" },
      { name: "Commerce", sub: "Marketplace" },
      { name: "Trust", sub: "Reputation" },
      { name: "Value", sub: "Escrow" },
      { name: "Governance", sub: "Parameters" },
    ],
  },
  {
    label: "GenLayer Protocol",
    sublabel: null,
    color: "border-purple-400/30 bg-purple-400/5",
    textColor: "text-purple-400",
    modules: [
      { name: "Optimistic Democracy", sub: "Consensus" },
      { name: "Equivalence Principle", sub: "Validation" },
      { name: "GenVM", sub: "Python Runtime" },
    ],
  },
  {
    label: "Base Infrastructure",
    sublabel: "Ethereum L1 / Rollup Bridge",
    color: "border-muted-foreground/20 bg-muted/30",
    textColor: "text-muted-foreground",
  },
];

const ArchitectureSection = () => {
  return (
    <section className="py-24 px-6 relative">
      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-6">
            <span className="text-xs font-medium text-primary font-display tracking-wider uppercase">Architecture</span>
          </div>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold text-gradient-white mb-4">
            The Agent Economy Stack
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            A layered architecture built on GenLayer's AI-native consensus.
          </p>
        </div>

        <div className="space-y-3">
          {layers.map((layer, i) => (
            <div
              key={i}
              className={cn(
                "rounded-xl border p-5 transition-all duration-300 hover:scale-[1.01]",
                layer.color
              )}
            >
              <div className={cn("font-display font-bold text-sm mb-1", layer.textColor)}>
                {layer.label}
              </div>
              {layer.sublabel && (
                <div className="text-xs text-muted-foreground">{layer.sublabel}</div>
              )}
              {layer.modules && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {layer.modules.map((mod, j) => (
                    <div
                      key={j}
                      className="glass-card rounded-lg px-4 py-2.5 text-center min-w-[120px]"
                    >
                      <div className="text-xs font-semibold text-foreground font-display">{mod.name}</div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">{mod.sub}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Key differentiators */}
        <div className="grid sm:grid-cols-3 gap-4 mt-12">
          {[
            { stat: "1000×", label: "Cheaper than traditional arbitration", detail: "$1–$10 vs $5K–$50K" },
            { stat: "95%", label: "LLM variance handled", detail: "Via Equivalence Principle" },
            { stat: "5+", label: "Independent validator LLMs", detail: "Condorcet's Jury Theorem" },
          ].map((item, i) => (
            <div key={i} className="glass-card-hover rounded-xl p-5 text-center">
              <div className="text-3xl font-display font-bold text-gradient-amber mb-1">{item.stat}</div>
              <div className="text-sm font-medium text-foreground mb-1">{item.label}</div>
              <div className="text-xs text-muted-foreground">{item.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ArchitectureSection;
