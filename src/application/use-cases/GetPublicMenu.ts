import type { SnapshotRepository } from "@/application/ports/SnapshotRepository";
import type { Clock } from "@/application/ports/Clock";
import type { PublicMenuSnapshot } from "@/domain/menu/PublicMenuTypes";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";
import type { PlanTier } from "@/domain/billing/PlanPolicy";
import { DailyDishPolicy } from "@/domain/menu/DailyDishPolicy";
import { FormulaPolicy } from "@/domain/menu/FormulaPolicy";

export type GetPublicMenuInput = {
  slug: string;
};

export type GetPublicMenuOutput = {
  snapshot: PublicMenuSnapshot;
  planStatus: PlanStatus;
  planTier: PlanTier;
} | null;

export class GetPublicMenu {
  constructor(
    private readonly repo: SnapshotRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: GetPublicMenuInput): Promise<GetPublicMenuOutput> {
    const result = await this.repo.getSnapshotBySlug(input.slug);
    if (!result) return null;

    const nowISO = this.clock.nowISO();
    const snapshot = filterExpiredFormulas(
      filterExpiredDailyItems(result.snapshotData, nowISO),
      nowISO,
    );

    return {
      snapshot,
      planStatus: result.planStatus,
      planTier: result.planTier,
    };
  }
}

/**
 * Le snapshot publié est immuable, mais les daily items ont une `validUntilISO`.
 * On filtre ici, à la lecture, pour éviter d'afficher un plat du jour expiré sans
 * forcer le restaurateur à republier à minuit. Si tous les daily items sont expirés,
 * on retire la clé `dailyItems` (l'UI sait alors ne pas rendre la section).
 */
function filterExpiredDailyItems(snapshot: PublicMenuSnapshot, nowISO: string): PublicMenuSnapshot {
  if (!snapshot.dailyItems || snapshot.dailyItems.length === 0) {
    if ("dailyItems" in snapshot) {
      const { dailyItems: _drop, ...rest } = snapshot;
      return rest;
    }
    return snapshot;
  }

  const active = snapshot.dailyItems.filter((entry) => DailyDishPolicy.isActive(entry, nowISO));
  if (active.length === snapshot.dailyItems.length) return snapshot;

  const { dailyItems: _drop, ...rest } = snapshot;
  return active.length > 0 ? { ...rest, dailyItems: active } : rest;
}

/**
 * Même logique que `filterExpiredDailyItems` pour les formules (S3.2). Snapshot
 * immuable, filtrage dynamique à la lecture via `FormulaPolicy.isActive`.
 */
function filterExpiredFormulas(snapshot: PublicMenuSnapshot, nowISO: string): PublicMenuSnapshot {
  if (!snapshot.formulas || snapshot.formulas.length === 0) {
    if ("formulas" in snapshot) {
      const { formulas: _drop, ...rest } = snapshot;
      return rest;
    }
    return snapshot;
  }

  const active = snapshot.formulas.filter((entry) => FormulaPolicy.isActive(entry, nowISO));
  if (active.length === snapshot.formulas.length) return snapshot;

  const { formulas: _drop, ...rest } = snapshot;
  return active.length > 0 ? { ...rest, formulas: active } : rest;
}
