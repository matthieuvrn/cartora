import { BatteryFull, Signal, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

type PhoneMockupProps = {
  /** Inclinaison 3D en degrés (rotateY). 0 = de face. Transform statique, pas une animation. */
  tilt?: number;
  /** Status bar en clair (menus sombres NOIR/NEON/VELOURS) — transition douce au switch. */
  statusBarLight?: boolean;
  className?: string;
  /** Contenu de l'écran — remplit tout le viewport, la status bar est overlayée dessus. */
  children: React.ReactNode;
};

/**
 * Frame iPhone réaliste, 100% CSS/SVG (aucune image de cadre) : coque canard, Dynamic Island,
 * status bar (heure + signal/wifi/batterie) et home indicator. Le viewport interne rend des
 * `children` (menu vivant du hero — Phase 3 ; avant : une capture next/image).
 */
export function PhoneMockup({
  tilt = 0,
  statusBarLight = false,
  className,
  children,
}: PhoneMockupProps) {
  return (
    <div
      className={cn("relative select-none", className)}
      style={tilt ? { transform: `perspective(1200px) rotateY(${tilt}deg)` } : undefined}
    >
      {/* Coque + tranche */}
      <div className="relative rounded-[2.5rem] bg-canard-950 p-2 shadow-xl ring-1 ring-canard-950/40">
        {/* Viewport interne */}
        <div className="relative aspect-[414/896] overflow-hidden rounded-[2rem] bg-sand-50">
          {/* Écran — sous la status bar (le contenu gère son propre padding haut) */}
          <div className="absolute inset-0">{children}</div>

          {/* Status bar overlayée (couleur adaptée aux menus sombres) */}
          <div
            className={cn(
              "absolute inset-x-0 top-0 z-10 flex h-9 items-center justify-between px-6 transition-colors duration-500",
              statusBarLight ? "text-sand-50" : "text-canard-900",
            )}
          >
            <span className="text-micro font-medium tabular-nums">9:41</span>
            <span className="flex items-center gap-1" aria-hidden="true">
              <Signal className="size-3.5 stroke-[1.75]" />
              <Wifi className="size-3.5 stroke-[1.75]" />
              <BatteryFull className="size-4 stroke-[1.75]" />
            </span>
          </div>

          {/* Dynamic Island */}
          <div className="absolute top-2 left-1/2 z-20 h-6 w-24 -translate-x-1/2 rounded-full bg-canard-950" />
          {/* Home indicator */}
          <div
            className={cn(
              "absolute bottom-2 left-1/2 z-20 h-1 w-28 -translate-x-1/2 rounded-full transition-colors duration-500",
              statusBarLight ? "bg-sand-50/40" : "bg-canard-950/25",
            )}
          />
        </div>
      </div>
    </div>
  );
}
