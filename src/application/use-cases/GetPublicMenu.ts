import type { SnapshotRepository } from "@/application/ports/SnapshotRepository";
import type { PublicMenuSnapshot } from "@/domain/menu/PublicMenuTypes";

export type GetPublicMenuInput = {
  slug: string;
};

export type GetPublicMenuOutput = PublicMenuSnapshot | null;

export class GetPublicMenu {
  constructor(private readonly repo: SnapshotRepository) {}

  async execute(input: GetPublicMenuInput): Promise<GetPublicMenuOutput> {
    const result = await this.repo.getSnapshotBySlug(input.slug);
    return result?.snapshotData ?? null;
  }
}
