import type { BillingRepository } from "@/application/ports/BillingRepository";
import type { PaymentGateway } from "@/application/ports/PaymentGateway";
import type { StorageService } from "@/application/ports/StorageService";
import type { RestaurantRepository } from "@/application/ports/RestaurantRepository";
import type { AuthAdminService } from "@/application/ports/AuthAdminService";
import { DomainError } from "@/domain/errors/DomainError";

type Input = {
  restaurantId: string;
  ownerUserId: string;
};

type Output = {
  status: "completed";
  /** Échecs NON-bloquants (logo, auth user) — les données du compte sont bien supprimées. */
  errors: string[];
};

/**
 * Ordre et sémantique d'échec — invariant : on ne détruit AUCUNE donnée locale tant que
 * Stripe n'est pas nettoyé. Un abonnement encore vivant après suppression du compte
 * facturerait un utilisateur qui ne peut plus ni se connecter, ni accéder au portail,
 * ni contacter le support avec un compte identifiable.
 *
 *  1. Stripe (BLOQUANT) : cancel + deleteCustomer. Échec ⇒ DomainError(stripe_cleanup_failed),
 *     rien n'est supprimé, l'utilisateur réessaie — les appels sont idempotents (contrat du
 *     port PaymentGateway), le retry converge. Filet en profondeur : si malgré tout un
 *     abonnement survivait, la compensation du webhook (HandleStripeWebhook, restaurant
 *     introuvable ⇒ cancel + deleteCustomer) le résilierait au prochain event.
 *  2. DELETE restaurant (BLOQUANT) : CASCADE sur toutes les tables enfants. Échec ⇒ propage ;
 *     Stripe est déjà nettoyé, le retry est sûr.
 *  3. Logo storage (non-bloquant) : un fichier orphelin n'a plus d'impact utilisateur.
 *  4. Auth user en DERNIER (non-bloquant) : un échec laisse un auth user orphelin —
 *     surfacé via `errors` pour nettoyage manuel (l'action loggue restaurantId + userId).
 */
export class DeleteRestaurant {
  constructor(
    private readonly billingRepo: BillingRepository,
    private readonly paymentGateway: PaymentGateway,
    private readonly logoStorage: StorageService,
    private readonly restaurantRepo: RestaurantRepository,
    private readonly authAdmin: AuthAdminService,
  ) {}

  async execute(input: Input): Promise<Output> {
    const errors: string[] = [];

    const billing = await this.billingRepo.findByRestaurantId(input.restaurantId);
    if (billing?.stripeSubscriptionId || billing?.stripeCustomerId) {
      try {
        if (billing.stripeSubscriptionId) {
          await this.paymentGateway.cancelSubscription(billing.stripeSubscriptionId);
        }
        if (billing.stripeCustomerId) {
          await this.paymentGateway.deleteCustomer(billing.stripeCustomerId);
        }
      } catch (error) {
        const domainError = new DomainError("stripe_cleanup_failed", {
          entityId: input.restaurantId,
        });
        domainError.cause = error;
        throw domainError;
      }
    }

    await this.restaurantRepo.delete(input.restaurantId);

    try {
      await this.logoStorage.deleteByPrefix(`${input.restaurantId}/`);
    } catch (error) {
      errors.push(`Logo cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      await this.authAdmin.deleteUser(input.ownerUserId);
    } catch (error) {
      errors.push(
        `Auth user deletion failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }

    return { status: "completed", errors };
  }
}
