import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { PaymentGateway } from "@/application/ports/PaymentGateway";

export type CreateCheckoutSessionInput = {
  restaurantId: string;
  customerEmail: string;
  baseUrl: string;
};

export type CreateCheckoutSessionOutput = {
  checkoutUrl: string;
};

export class CreateCheckoutSession {
  constructor(
    private readonly restaurantRepo: RestaurantRepository,
    private readonly paymentGateway: PaymentGateway,
  ) {}

  async execute(input: CreateCheckoutSessionInput): Promise<CreateCheckoutSessionOutput> {
    const restaurant = await this.restaurantRepo.getRestaurantById(input.restaurantId);
    if (!restaurant) {
      throw new Error("Restaurant introuvable");
    }

    if (restaurant.planStatus !== "FREE") {
      throw new Error("Le restaurant possède déjà un abonnement");
    }

    const { url } = await this.paymentGateway.createCheckoutSession({
      restaurantId: input.restaurantId,
      customerEmail: input.customerEmail,
      successUrl: input.baseUrl + "/app?checkout=success",
      cancelUrl: input.baseUrl + "/app?checkout=cancel",
    });

    return { checkoutUrl: url };
  }
}
