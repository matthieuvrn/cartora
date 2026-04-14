import type { BillingRepository, BillingInfo } from "@/application/ports/BillingRepository";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";
import type { PrismaClient } from "@/generated/prisma/client";

export class PrismaBillingRepository implements BillingRepository {
  constructor(private readonly db: PrismaClient) {}

  async upsertBilling(params: {
    restaurantId: string;
    stripeCustomerId: string;
    stripeSubscriptionId: string;
  }): Promise<void> {
    await this.db.billing.upsert({
      where: { restaurantId: params.restaurantId },
      update: {
        stripeCustomerId: params.stripeCustomerId,
        stripeSubscriptionId: params.stripeSubscriptionId,
      },
      create: {
        restaurantId: params.restaurantId,
        stripeCustomerId: params.stripeCustomerId,
        stripeSubscriptionId: params.stripeSubscriptionId,
      },
    });
  }

  async findByRestaurantId(restaurantId: string): Promise<BillingInfo | null> {
    const row = await this.db.billing.findUnique({
      where: { restaurantId },
      select: {
        restaurantId: true,
        stripeCustomerId: true,
        stripeSubscriptionId: true,
      },
    });
    if (!row) return null;
    return {
      restaurantId: row.restaurantId,
      stripeCustomerId: row.stripeCustomerId,
      stripeSubscriptionId: row.stripeSubscriptionId,
    };
  }

  async updatePlanStatus(restaurantId: string, planStatus: PlanStatus): Promise<void> {
    await this.db.restaurant.update({
      where: { id: restaurantId },
      data: { planStatus },
    });
  }
}
