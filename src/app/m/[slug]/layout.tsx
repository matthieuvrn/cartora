import { LocaleShell } from "@/app/locale-shell";

// <LocaleShell> : provider i18n cookie (chrome PublicMenu/Allergen fr-en) + footer global +
// bannière cookies — ce que le root layout fournissait avant le chantier « landing statique ».
// La locale du CONTENU du menu (fr/en/es/de/it) reste résolue par la page depuis le snapshot,
// indépendamment de ce provider.
export default function PublicMenuLayout({ children }: { children: React.ReactNode }) {
  return <LocaleShell>{children}</LocaleShell>;
}
