"use client";

import { NextParticlesProvider } from "@tsparticles/nextjs";
import { loadSlim } from "@tsparticles/slim";

// Wrapped in its own client component so `loadSlim` (a plain function) never
// has to cross the Server->Client Component boundary as a prop — it's
// referenced entirely within this client module instead.
export function ParticlesProvider({ children }: { children: React.ReactNode }) {
  return <NextParticlesProvider init={loadSlim}>{children}</NextParticlesProvider>;
}
