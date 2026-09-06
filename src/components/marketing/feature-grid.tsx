"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Sparkles, Clapperboard, Wand2 } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const FEATURES = [
  {
    icon: Sparkles,
    title: "Generate on brand, by default",
    body: "Every image, video, and line of copy reads your Brand Kit first — palette, tone, banned words — before it generates anything.",
  },
  {
    icon: Wand2,
    title: "Edit by describing it",
    body: "Click a layer and say what should change. Regenerations land on the canvas as a new version — undo is always one step away.",
  },
  {
    icon: Clapperboard,
    title: "A full campaign in one brief",
    body: "One request produces every format — Meta, TikTok, LinkedIn, Google Display, and a 9:16 video — ready to export as a pack.",
  },
];

export function FeatureGrid() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      gsap.from(".feature-card", {
        opacity: 0,
        y: 20,
        duration: 0.6,
        stagger: 0.12,
        ease: "power3.out",
        scrollTrigger: { trigger: containerRef.current, start: "top 80%" },
      });
    },
    { scope: containerRef },
  );

  return (
    <div ref={containerRef} className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 pb-24 sm:grid-cols-3">
      {FEATURES.map((feature) => (
        <div
          key={feature.title}
          className="feature-card rounded-xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur transition-colors hover:bg-white/[0.06]"
        >
          <feature.icon className="mb-3 size-6 text-primary" />
          <h3 className="mb-1.5 text-sm font-semibold">{feature.title}</h3>
          <p className="text-sm text-muted-foreground">{feature.body}</p>
        </div>
      ))}
    </div>
  );
}
