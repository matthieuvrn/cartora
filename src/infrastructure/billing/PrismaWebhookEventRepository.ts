import type { WebhookEventRepository } from "@/application/ports/WebhookEventRepository";
import type { PrismaClient } from "@/generated/prisma/client";

export class PrismaWebhookEventRepository implements WebhookEventRepository {
  constructor(private readonly db: PrismaClient) {}

  async isAlreadyProcessed(stripeEventId: string): Promise<boolean> {
    const existing = await this.db.processedWebhookEvent.findUnique({
      where: { stripeEventId },
      select: { processedAt: true },
    });
    return existing?.processedAt !== null && existing?.processedAt !== undefined;
  }

  async markProcessed(stripeEventId: string, eventType: string): Promise<void> {
    await this.db.processedWebhookEvent.upsert({
      where: { stripeEventId },
      create: { stripeEventId, eventType, processedAt: new Date() },
      update: { processedAt: new Date() },
    });
  }
}
