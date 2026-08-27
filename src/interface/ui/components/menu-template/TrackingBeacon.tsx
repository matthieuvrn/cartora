"use client";

import { useEffect } from "react";
import type { MenuLocale } from "@/domain/menu/MenuLocale";

type TrackingBeaconProps = {
  slug: string;
  /** Langue de CONTENU affichée au moment de la vue (état du switcher), pas la locale chrome. */
  locale: MenuLocale;
};

// Mesure d'audience EXEMPTÉE de consentement (art. 82 LIL / délib. CNIL 2020-091),
// même régime anonyme que la partie exemptée du funnel landing (`trackLandingEvent`) :
// rien de personnel n'est persisté (pas d'IP, pas d'UA, aucun identifiant, aucun
// cookie déposé) et la clé sessionStorage ci-dessous est strictement nécessaire au
// comptage (1 vue par onglet et par menu — absorbe aussi le Strict Mode en dev).
//
// Repli mémoire quand sessionStorage jette (navigation privée stricte) : sans lui,
// `locale` étant dans les deps de l'effet, chaque switch de langue recompterait
// une vue. Portée = chargement de page, plus courte que la session d'onglet — un
// reload recompte, assumé pour ce cas marginal.
const memoryTracked = new Set<string>();

function alreadyTracked(slug: string): boolean {
  if (memoryTracked.has(slug)) return true;
  try {
    return sessionStorage.getItem(`cartora-mv-${slug}`) !== null;
  } catch {
    return false;
  }
}

function markTracked(slug: string) {
  memoryTracked.add(slug);
  try {
    sessionStorage.setItem(`cartora-mv-${slug}`, "1");
  } catch {
    // Sans storage, le Set mémoire reste la seule dédup — assumé.
  }
}

export function TrackingBeacon({ slug, locale }: TrackingBeaconProps) {
  useEffect(() => {
    if (alreadyTracked(slug)) return;

    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get("utm_source");
    const payload = JSON.stringify({
      slug,
      locale,
      // Seule valeur portée par le domaine — un utm exotique (lien tagué par un
      // tiers) ne doit pas coûter la vue.
      source: utmSource === "qr" ? "qr" : undefined,
      // Référent de NAVIGATION : le header Referer du POST serait l'URL de cette
      // page même (same-origin) et classerait toute vue non-QR en LINK. Tronqué à
      // la borne Zod serveur — une URL fleuve ne doit pas coûter la vue.
      referrer: document.referrer ? document.referrer.slice(0, 2048) : undefined,
    });

    // La dédup n'est marquée que si le beacon est accepté par la file d'envoi :
    // un refus laisse sa chance à un prochain rendu au lieu de brûler la vue.
    if (navigator.sendBeacon("/api/track", payload)) markTracked(slug);
  }, [slug, locale]);

  return null;
}
