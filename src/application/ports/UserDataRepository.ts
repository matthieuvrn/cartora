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
  };
  menu: {
    status: string;
    categories: Array<{
      type: string;
      items: Array<{
        nameFr: string | null;
        nameEn: string | null;
        descriptionFr: string | null;
        descriptionEn: string | null;
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
