"use client";

import { useSyncExternalStore } from "react";
import { NextParticles } from "@tsparticles/nextjs";
import type { ISourceOptions } from "@tsparticles/engine";

const PARTICLE_OPTIONS: ISourceOptions = {
  fpsLimit: 60,
  fullScreen: { enable: false },
  background: { color: "transparent" },
  particles: {
    number: { value: 60, density: { enable: true, width: 1600, height: 1200 } },
    color: { value: "#ffffff" },
    opacity: { value: { min: 0.05, max: 0.3 } },
    size: { value: { min: 1, max: 2.5 } },
    move: {
      enable: true,
      speed: 0.3,
      direction: "none",
      random: true,
      straight: false,
      outModes: { default: "out" },
    },
    links: { enable: false },
  },
  interactivity: { events: { onHover: { enable: false }, onClick: { enable: false } } },
  detectRetina: true,
  pauseOnBlur: true,
  pauseOnOutsideViewport: true,
};

function isLowPowerDevice(): boolean {
  const cores = navigator.hardwareConcurrency ?? 8;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
  return cores <= 2 || memory <= 2;
}

function subscribeToReducedMotion(callback: () => void): () => void {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getEnabledSnapshot(): boolean {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return !prefersReducedMotion && !isLowPowerDevice();
}

function getServerSnapshot(): boolean {
  return false;
}

/** Ambient, slow-drifting particle field for the landing/auth pages. Disabled on reduced-motion and low-power devices. */
export function ParticleBackground() {
  const enabled = useSyncExternalStore(subscribeToReducedMotion, getEnabledSnapshot, getServerSnapshot);

  if (!enabled) return null;

  return (
    <NextParticles
      id="ambient-particles"
      options={PARTICLE_OPTIONS}
      className="pointer-events-none absolute inset-0 -z-10"
    />
  );
}
