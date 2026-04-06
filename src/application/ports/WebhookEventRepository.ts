export interface WebhookEventRepository {
  isAlreadyProcessed(stripeEventId: string): Promise<boolean>;
  markProcessed(stripeEventId: string, eventType: string): Promise<void>;
}
