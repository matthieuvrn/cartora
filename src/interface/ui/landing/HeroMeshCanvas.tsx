"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Fond "gradient mesh" du hero : canvas 2D peignant 3-4 blobs radiaux flous qui dérivent
 * lentement (mouvement sinusoïdal, pas d'intégration → stable). Garde-fous perf :
 *  - boucle plafonnée à ~30fps,
 *  - pause hors-viewport via IntersectionObserver,
 *  - `prefers-reduced-motion` → une seule frame statique, jamais de boucle,
 *  - cleanup strict (rAF + observers + listener).
 * Décoratif → `aria-hidden`. Cf. docs/ui-refonte-2026.md §8 (décision : canvas, pas WebGL).
 */

type Blob = {
  baseX: number;
  baseY: number;
  ampX: number;
  ampY: number;
  speedX: number;
  speedY: number;
  phaseX: number;
  phaseY: number;
  radius: number;
  color: string;
};

// Positions/rayons en fractions des dimensions du canvas → responsive sans recalcul.
// canard #2c5a66, sapin #1f4a3a, crème #fbfaf7 — alphas bas pour rester éditorial.
const BLOBS: readonly Blob[] = [
  {
    baseX: 0.18,
    baseY: 0.26,
    ampX: 0.06,
    ampY: 0.05,
    speedX: 0.00013,
    speedY: 0.00017,
    phaseX: 0,
    phaseY: 1.2,
    radius: 0.55,
    color: "rgba(44,90,102,0.2)",
  },
  {
    baseX: 0.83,
    baseY: 0.16,
    ampX: 0.05,
    ampY: 0.06,
    speedX: 0.00011,
    speedY: 0.00015,
    phaseX: 2.1,
    phaseY: 0.4,
    radius: 0.42,
    color: "rgba(31,74,58,0.16)",
  },
  {
    baseX: 0.72,
    baseY: 0.86,
    ampX: 0.07,
    ampY: 0.05,
    speedX: 0.00015,
    speedY: 0.00012,
    phaseX: 3.4,
    phaseY: 2.7,
    radius: 0.5,
    color: "rgba(44,90,102,0.14)",
  },
  {
    baseX: 0.32,
    baseY: 0.9,
    ampX: 0.05,
    ampY: 0.04,
    speedX: 0.00012,
    speedY: 0.00016,
    phaseX: 1.0,
    phaseY: 3.0,
    radius: 0.46,
    color: "rgba(251,250,247,0.45)",
  },
];

export function HeroMeshCanvas({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let rafId = 0;
    let lastDraw = 0;
    let running = false;

    const draw = (tMs: number) => {
      ctx.clearRect(0, 0, width, height);
      const maxDim = Math.max(width, height);
      for (const b of BLOBS) {
        const cx = (b.baseX + b.ampX * Math.sin(tMs * b.speedX + b.phaseX)) * width;
        const cy = (b.baseY + b.ampY * Math.sin(tMs * b.speedY + b.phaseY)) * height;
        const r = b.radius * maxDim;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
        grad.addColorStop(0, b.color);
        grad.addColorStop(1, "rgba(0,0,0,0)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);
      }
    };

    const loop = (now: number) => {
      if (!running) return;
      if (now - lastDraw >= 33) {
        lastDraw = now;
        draw(now);
      }
      rafId = requestAnimationFrame(loop);
    };

    const start = () => {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(loop);
    };

    const stop = () => {
      running = false;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      draw(performance.now()); // repaint immédiat → jamais de frame blanche au resize
    };

    const reduceMq = window.matchMedia("(prefers-reduced-motion: reduce)");

    const applyMotionState = (visible: boolean) => {
      if (reduceMq.matches) {
        stop();
        draw(performance.now());
      } else if (visible) {
        start();
      } else {
        stop();
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    const io = new IntersectionObserver(
      (entries) => applyMotionState(entries.some((e) => e.isIntersecting)),
      { threshold: 0 },
    );
    io.observe(canvas);

    const onReduceChange = () => applyMotionState(true);
    reduceMq.addEventListener("change", onReduceChange);

    return () => {
      stop();
      ro.disconnect();
      io.disconnect();
      reduceMq.removeEventListener("change", onReduceChange);
    };
  }, []);

  return (
    <canvas ref={canvasRef} aria-hidden="true" className={cn("block h-full w-full", className)} />
  );
}
