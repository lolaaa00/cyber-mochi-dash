const FooterSection = () => {
  return (
    <footer className="py-16 px-6 border-t border-border">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-display font-bold text-gradient-amber mb-4">
          Agent Economy Hub
        </h2>
        <p className="text-sm text-muted-foreground mb-6 max-w-lg mx-auto">
          A dispute-aware economic kernel for autonomous AI agents. 
          Built for the GenLayer Bradbury Hackathon — March 20 – April 3, 2026.
        </p>
        <div className="flex justify-center gap-4 mb-8">
          <a
            href="https://dorahacks.io/hackathon/genlayer-bradbury"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-display font-semibold text-sm hover:bg-primary/90 transition-colors glow-amber"
          >
            DoraHacks →
          </a>
          <a
            href="https://portal.genlayer.foundation/#/hackathon/"
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-lg border border-border text-foreground font-display font-semibold text-sm hover:border-primary/30 transition-colors"
          >
            GenLayer Portal
          </a>
        </div>
        <div className="flex justify-center gap-6 text-xs text-muted-foreground">
          <span>Optimistic Democracy</span>
          <span className="text-border">·</span>
          <span>Equivalence Principle</span>
          <span className="text-border">·</span>
          <span>GenVM Python</span>
        </div>
      </div>
    </footer>
  );
};

export default FooterSection;
