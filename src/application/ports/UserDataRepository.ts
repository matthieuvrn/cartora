/** Textes multilingues d'une entité : `{ <locale>: { name, description } }`, toutes langues (S4). */
export type ExportedTexts = Record<string, { name: string; description: string }>;

/**
 * Export RGPD (portabilité, art. 20) : doit couvrir TOUT ce que l'utilisateur a saisi ou
 * qui l'identifie — pas seulement le menu. Toute nouvelle donnée personnelle ou contenu
 * utilisateur ajouté au schéma doit être reflété ici (et donc dans PrismaUserDataRepository).
 */
export interface UserDataExport {
  account: {
    email: string;
    createdAt: string;
  };
  restaurant: {
    displayName: string;
    slug: string;
    planStatus: string;
    planTier: string;
    restaurantType: string | null;
    createdAt: string;
    /** Langue de saisie + langues cibles activées (S4). */
    sourceLocale: string;
    menuLocales: string[];
    logoPath: string | null;
    brandColors: {
      primary: string | null;
      accent: string | null;
      background: string | null;
    };
    /** Personnalisation du QR (JSONB brut, null = défaut). */
    qrStyle: unknown;
  };
  menu: {
    status: string;
    template: string;
    publishedAt: string | null;
    categories: Array<{
      name: string;
      /** Traductions du nom dans les langues cibles (la source vit sur `name`). */
      nameTranslations: Record<string, string>;
      items: Array<{
        texts: ExportedTexts;
        priceCents: number;
        badge: string;
        allergens: string[];
        isAvailable: boolean;
      }>;
    }>;
    dailyDishes: Array<{
      texts: ExportedTexts;
      priceCents: number;
      badge: string;
      allergens: string[];
      validUntil: string;
    }>;
    formulas: Array<{
      texts: ExportedTexts;
      priceCents: number;
      validUntil: string;
    }>;
  };
  billing: {
    hasSubscription: boolean;
    /** Identifiants pseudonymes Stripe liés à l'utilisateur — données personnelles au sens RGPD. */
    stripeCustomerId: string | null;
    stripeSubscriptionId: string | null;
  } | null;
  analytics: {
    totalViews: number;
    oldestDataDate: string | null;
  };
}

export interface UserDataRepository {
  exportUserData(restaurantId: string, email: string): Promise<UserDataExport>;
}
