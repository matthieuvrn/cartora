import Image, { type StaticImageData } from "next/image";
import { BatteryFull, Signal, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

type PhoneMockupProps = {
  /** Import statique (pas string) → blurDataURL + dimensions intrinsèques pour LCP/CLS. */
  src: StaticImageData;
  alt: string;
  /** Propagé à next/image (true sur le hero above-the-fold). */
  priority?: boolean;
  /** Inclinaison 3D en degrés (rotateY). 0 = de face. Transform statique, pas une animation. */
  tilt?: number;
  className?: string;
};

/**
 * Frame iPhone réaliste, 100% CSS/SVG (aucune image de cadre) : coque canard, Dynamic Island,
 * status bar (heure + signal/wifi/batterie) et home indicator. Le viewport interne affiche une
 * capture d'écran via next/image. Réutilisé par le hero et par DemoPreview (étape 4).
 */
export function PhoneMockup({ src, alt, priority = false, tilt = 0, className }: PhoneMockupProps) {
  return (
    <div
      className={cn("relative select-none", className)}
      style={tilt ? { transform: `perspective(1200px) rotateY(${tilt}deg)` } : undefined}
    >
      {/* Coque + tranche */}
      <div className="relative rounded-[2.5rem] bg-canard-950 p-2 shadow-xl ring-1 ring-canard-950/40">
        {/* Viewport interne */}
        <div className="relative flex aspect-[414/896] flex-col overflow-hidden rounded-[2rem] bg-sand-50">
          {/* Status bar (strip réservé — n'écrase pas le contenu de la capture) */}
          <div className="relative z-10 flex h-9 shrink-0 items-center justify-between px-6 text-canard-900">
            <span className="text-micro font-medium tabular-nums">9:41</span>
            <span className="flex items-center gap-1" aria-hidden="true">
              <Signal className="size-3.5 stroke-[1.75]" />
              <Wifi className="size-3.5 stroke-[1.75]" />
              <BatteryFull className="size-4 stroke-[1.75]" />
            </span>
          </div>

          {/* Capture menu — remplit la zone sous la status bar, débordement rogné en bas */}
          <div className="relative flex-1">
            <Image
              src={src}
              alt={alt}
              fill
              priority={priority}
              placeholder="blur"
              sizes="(min-width: 768px) 320px, 280px"
              className="object-cover object-top"
            />
          </div>

          {/* Dynamic Island */}
          <div className="absolute left-1/2 top-2 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-canard-950" />
          {/* Home indicator */}
          <div className="absolute bottom-2 left-1/2 z-20 h-1 w-28 -translate-x-1/2 rounded-full bg-canard-950/25" />
        </div>
      </div>
    </div>
  );
}
