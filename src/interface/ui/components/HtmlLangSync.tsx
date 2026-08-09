"use client";

import { useEffect } from "react";

/**
 * Synchronise `<html lang>` avec la locale effective. Le root layout est statique depuis le
 * chantier « landing statique » : il émet `lang="fr"` pour tout le monde (il ne peut plus lire
 * le cookie sans dynamifier `/` et `/en`). Ce composant corrige l'attribut côté client pour
 * les utilisateurs EN — porteur pour les lecteurs d'écran ; les moteurs s'appuient sur les
 * alternates hreflang émis par les pages.
 */
export function HtmlLangSync({ locale }: { locale: string }) {
  useEffect(() => {
    if (document.documentElement.lang !== locale) {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  return null;
}
