import { useRef } from "react";
import HeroSection from "@/components/HeroSection";
import ComparisonSection from "@/components/ComparisonSection";
import FlowSection from "@/components/FlowSection";
import ArchitectureSection from "@/components/ArchitectureSection";
import CodePreview from "@/components/CodePreview";
import FooterSection from "@/components/FooterSection";

const Index = () => {
  const comparisonRef = useRef<HTMLDivElement>(null);

  const scrollToComparison = () => {
    comparisonRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-background">
      <HeroSection onScrollToComparison={scrollToComparison} />
      <div ref={comparisonRef}>
        <ComparisonSection />
      </div>
      <FlowSection />
      <ArchitectureSection />
      <CodePreview />
      <FooterSection />
    </div>
  );
};

export default Index;
