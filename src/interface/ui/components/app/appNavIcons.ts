import {
  BarChart3,
  CreditCard,
  Languages,
  LayoutGrid,
  Palette,
  QrCode,
  Settings,
  type LucideIcon,
} from "lucide-react";
import type { AppNavKey } from "@/lib/app-nav";

/**
 * Icônes des entrées de nav `/app`. Séparées des données (`@/lib/app-nav`, framework-free) parce
 * que ce sont des composants React : le module de données reste importable par un test ou un
 * helper pur. Règle d'import — les données et les helpers viennent TOUJOURS de `@/lib/app-nav`,
 * les icônes UNIQUEMENT d'ici ; aucun ré-export croisé, pour qu'un symbole n'ait jamais deux
 * chemins d'import concurrents.
 */
export const APP_NAV_ICONS: Record<AppNavKey, LucideIcon> = {
  menu: LayoutGrid,
  stats: BarChart3,
  apparence: Palette,
  traductions: Languages,
  partage: QrCode,
  abonnement: CreditCard,
  reglages: Settings,
};
