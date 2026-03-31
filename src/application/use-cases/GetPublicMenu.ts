import type { SnapshotRepository } from "@/application/ports/SnapshotRepository";
import type { PublicMenuSnapshot } from "@/domain/menu/PublicMenuTypes";
import type { PlanStatus } from "@/domain/menu/PublicationPolicy";

export type GetPublicMenuInput = {
  slug: string;
};

export type GetPublicMenuOutput = {
  snapshot: PublicMenuSnapshot;
  planStatus: PlanStatus;
} | null;

export class GetPublicMenu {
  constructor(private readonly repo: SnapshotRepository) {}

  async execute(input: GetPublicMenuInput): Promise<GetPublicMenuOutput> {
    const result = await this.repo.getSnapshotBySlug(input.slug);
    if (!result) return null;
    return { snapshot: result.snapshotData, planStatus: result.planStatus };
  }
}
