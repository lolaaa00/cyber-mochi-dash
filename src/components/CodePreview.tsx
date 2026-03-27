const codeSnippet = `# contracts/agent_economy_hub.py
from genlayer import *

class AgentEconomyHub(Contract):
    
    @gl.public.write.payable
    def post_service(self, description: str, deadline: int):
        """Post a service request with escrowed payment."""
        escrow_amount = gl.message.value
        self.services[self.next_id] = {
            "client": gl.message.sender,
            "description": description,
            "escrow": escrow_amount,
            "status": "open"
        }

    @gl.public.write
    def submit_deliverable(self, service_id: int, evidence: str):
        """Submit work with evidence for AI evaluation."""
        service = self.services[service_id]

        # AI Quality Assessment via Equivalence Principle
        result = gl.nondet.exec_prompt(
            f"""Evaluate this deliverable against the service request.
            Request: {service['description']}
            Evidence: {evidence}
            Score 0-1000. Return JSON: {{"score": int, "reasoning": str}}"""
        )
        
        # Validators must reach semantic equivalence
        gl.eq_principle.strict_eq(result)

        score = json.loads(result)["score"]
        if score >= 700:
            # Auto-release payment
            gl.transfer(service["provider"], service["escrow"])
            service["status"] = "completed"
        else:
            # Trigger dispute resolution
            service["status"] = "disputed"
            self._initiate_dispute(service_id, result)`;

const CodePreview = () => {
  return (
    <section className="py-24 px-6 relative">
      <div className="absolute inset-0 dot-bg opacity-10" />
      
      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 mb-6">
            <span className="text-xs font-medium text-primary font-display tracking-wider uppercase">Contract Preview</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-gradient-white mb-4">
            One Python Contract. Full Economy.
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            The entire Agent Economy Hub runs as a single Intelligent Contract on GenLayer, 
            earning permanent dev fees from every transaction.
          </p>
        </div>

        <div className="rounded-xl border border-border overflow-hidden bg-card">
          {/* Code header */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-destructive/60" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
              <div className="w-3 h-3 rounded-full bg-success/60" />
            </div>
            <span className="text-xs font-mono text-muted-foreground ml-2">
              contracts/agent_economy_hub.py
            </span>
          </div>
          {/* Code */}
          <pre className="p-6 overflow-x-auto text-sm leading-relaxed">
            <code className="font-mono text-muted-foreground">
              {codeSnippet.split('\n').map((line, i) => (
                <div key={i} className="flex">
                  <span className="w-8 text-right mr-4 text-muted-foreground/30 select-none text-xs leading-relaxed">
                    {i + 1}
                  </span>
                  <span className={
                    line.trim().startsWith('#') ? 'text-muted-foreground/60' :
                    line.trim().startsWith('def ') || line.trim().startsWith('class ') ? 'text-primary' :
                    line.trim().startsWith('@') ? 'text-purple-400' :
                    line.trim().startsWith('"""') || line.trim().endsWith('"""') ? 'text-success/70' :
                    line.includes('gl.') ? 'text-foreground' :
                    'text-muted-foreground/80'
                  }>
                    {line || '\u00A0'}
                  </span>
                </div>
              ))}
            </code>
          </pre>
        </div>

        {/* Dev fee callout */}
        <div className="mt-6 glass-card rounded-xl p-5 flex items-center gap-4 border-primary/10">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
            <span className="text-lg">💰</span>
          </div>
          <div>
            <h4 className="font-display font-semibold text-sm text-foreground">Build Once, Earn Forever</h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              GenLayer's Dev Fee Model: earn 10-20% of all transaction fees this contract generates — permanently.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CodePreview;
