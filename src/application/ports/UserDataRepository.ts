export interface UserDataExport {
  account: {
    email: string;
    createdAt: string;
  };
  restaurant: {
    displayName: string;
    slug: string;
    planStatus: string;
    createdAt: string;
    /** Langue de saisie + langues cibles activées (S4). */
    sourceLocale: string;
    menuLocales: string[];
  };
  menu: {
    status: string;
    categories: Array<{
      name: string;
      items: Array<{
        /** Textes par locale (S4) : `{ <locale>: { name, description } }`, toutes langues. */
        texts: Record<string, { name: string; description: string }>;
        priceCents: number;
        badge: string;
        isAvailable: boolean;
      }>;
    }>;
  };
  billing: {
    hasSubscription: boolean;
  } | null;
  analytics: {
    totalViews: number;
    oldestDataDate: string | null;
  };
}

export interface UserDataRepository {
  exportUserData(restaurantId: string, email: string): Promise<UserDataExport>;
}
