"use client";

import type { CSSProperties } from "react";
import { Toaster as SonnerToaster, type ToasterProps } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Toaster global du shell app, thémé via les tokens `.theme-app` (`--popover`,
 * `--border`, `--card-shadow`) — à monter DANS le scope `.theme-app`, sinon les
 * variables ne se résolvent pas.
 *
 * Position : top-center sur mobile — le bas de l'écran est occupé par la barre
 * d'onglets `MobileTabBar` (et, le cas échéant, la bannière cookies) ; la topbar
 * sticky h-14 impose l'offset haut. Bottom-right sur desktop (ne chevauche ni le
 * rail de navigation ni la PublishBar sticky). Le décalage bas éventuel est piloté
 * par (app)/layout.tsx, qui monte ce Toaster.
 */
export function Toaster(props: ToasterProps) {
  const isMobile = useIsMobile();

  return (
    <SonnerToaster
      position={isMobile ? "top-center" : "bottom-right"}
      mobileOffset={{ top: 72 }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as CSSProperties
      }
      toastOptions={{
        classNames: { toast: "rounded-xl" },
        style: { boxShadow: "var(--card-shadow, var(--shadow-md))" },
      }}
      {...props}
    />
  );
}
