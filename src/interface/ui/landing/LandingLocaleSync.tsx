"use client";

import { useEffect } from "react";

/**
 * Synchronisation locale des pages landing statiques (`/` = fr, `/en` = en).
 *
 * 1. Corrige `<html lang>` : le root layout statique émet `lang="fr"` pour tout le monde
 *    (il ne peut plus lire le cookie sans dynamifier la landing).
 * 2. Sur `/en` uniquement : pose le cookie `locale=en` s'il est ABSENT (cookie fonctionnel,
 *    exempt de consentement CNIL — même cookie que `setLocaleAction`), pour qu'un visiteur
 *    arrivé directement sur `/en` continue en anglais sur /signup, /login et le reste du
 *    site. Ne touche jamais un choix existant.
 */
export function LandingLocaleSync({ locale }: { locale: "fr" | "en" }) {
  useEffect(() => {
    if (document.documentElement.lang !== locale) {
      document.documentElement.lang = locale;
    }
    if (
      locale === "en" &&
      !document.cookie.split(";").some((c) => c.trim().startsWith("locale="))
    ) {
      document.cookie = `locale=en; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    }
  }, [locale]);

  return null;
}
