"use client";

import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { ParticleBackground } from "./particle-background";

export function LandingHero() {
  const containerRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const tl = gsap.timeline({ defaults: { ease: "power3.out" } });
      tl.from(".hero-eyebrow", { opacity: 0, y: 12, duration: 0.5 })
        .from(".hero-title", { opacity: 0, y: 24, duration: 0.7 }, "-=0.3")
        .from(".hero-subtitle", { opacity: 0, y: 16, duration: 0.6 }, "-=0.4")
        .from(".hero-cta", { opacity: 0, y: 12, duration: 0.5, stagger: 0.08 }, "-=0.3")
        .from(".hero-glow", { opacity: 0, scale: 0.8, duration: 1.2, ease: "power2.out" }, "-=1");
    },
    { scope: containerRef },
  );

  return (
    <div ref={containerRef} className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="hero-glow pointer-events-none absolute left-1/2 top-1/3 -z-10 h-[600px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-tr from-indigo-500/20 via-fuchsia-500/10 to-transparent blur-3xl"
      />
      <ParticleBackground />

      <div className="mx-auto flex min-h-[calc(100vh-0px)] max-w-4xl flex-col items-center justify-center gap-6 px-6 text-center">
        <span className="hero-eyebrow rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground backdrop-blur">
          AI creative director for brand marketing
        </span>
        <h1 className="hero-title text-balance text-5xl font-semibold tracking-tight sm:text-6xl">
          Talk your ads into existence.
        </h1>
        <p className="hero-subtitle max-w-xl text-balance text-lg text-muted-foreground">
          Chat with an AI creative team that generates and edits your brand&apos;s ad creatives and
          video, live on a canvas — on brand, every time.
        </p>
        <div className="flex gap-3">
          <Link href="/sign-up" className={`hero-cta ${buttonVariants({ variant: "default", size: "lg" })}`}>
            Get started
          </Link>
          <Link href="/sign-in" className={`hero-cta ${buttonVariants({ variant: "outline", size: "lg" })}`}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
