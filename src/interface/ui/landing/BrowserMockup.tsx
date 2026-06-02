"use client";

import Image, { type StaticImageData } from "next/image";
import { useRef } from "react";
import { Lock } from "lucide-react";
import {
  LazyMotion,
  domAnimation,
  m,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";

type BrowserMockupProps = {
  /** Import statique (pas string) → blurDataURL + dimensions intrinsèques pour CLS. */
  src: StaticImageData;
  alt: string;
  /** URL affichée dans la barre du chrome (ex. "cartora.app/m/demo-cartora"). */
  url: string;
  /** Classes du wrapper externe (centrage / largeur max). */
  className?: string;
};

// Cadre « fenêtre navigateur » macOS, propre (à la Linear/Vercel) : chrome teinté sand, pastilles
// authentiques, pill d'URL en mono. Le screenshot desktop devient « un vrai site qu'on peut visiter ».
const FRAME_CLASS =
  "overflow-hidden rounded-2xl border border-canard-100 bg-card shadow-xl shadow-[var(--shadow-glow)]";

function Chrome({ url }: { url: string }) {
  return (
    <div className="flex items-center gap-3 border-b border-canard-100 bg-sand-100 px-4 py-2.5">
      <div className="flex gap-1.5" aria-hidden="true">
        <span className="size-3 rounded-full bg-[#ff5f57]" />
        <span className="size-3 rounded-full bg-[#febc2e]" />
        <span className="size-3 rounded-full bg-[#28c840]" />
      </div>
      <div className="mx-auto flex items-center gap-1.5 rounded-md bg-card px-3 py-1 font-mono text-micro text-sand-600">
        <Lock className="size-3 stroke-[2]" aria-hidden="true" />
        {url}
      </div>
    </div>
  );
}

/**
 * Fenêtre navigateur autour du screenshot desktop de la démo, avec parallaxe légère pilotée par le
 * scroll de la section. Mirror du pattern motion de `FeatureCard` : `LazyMotion strict` + `m.*`, et
 * fallback statique sous `prefers-reduced-motion`. Translation faible (±24px) — éditorial, pas gadget.
 */
export function BrowserMockup({ src, alt, url, className }: BrowserMockupProps) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [24, -24]);

  const inner = (
    <>
      <Chrome url={url} />
      <Image
        src={src}
        alt={alt}
        loading="lazy"
        sizes="(min-width: 768px) 896px, 100vw"
        className="h-auto w-full"
        placeholder="blur"
      />
    </>
  );

  if (reduce) {
    return (
      <div ref={ref} className={className}>
        <div className={FRAME_CLASS}>{inner}</div>
      </div>
    );
  }

  return (
    <div ref={ref} className={className}>
      <LazyMotion features={domAnimation} strict>
        <m.div className={FRAME_CLASS} style={{ y }}>
          {inner}
        </m.div>
      </LazyMotion>
    </div>
  );
}
