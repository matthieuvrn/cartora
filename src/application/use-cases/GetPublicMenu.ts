import type { SnapshotRepository } from "@/application/ports/SnapshotRepository";
import type { PublicMenuSnapshot } from "@/domain/menu/PublicMenuTypes";

export type GetPublicMenuInput = {
  slug: string;
};

export class GetPublicMenu {
  constructor(private readonly snapshotRepo: SnapshotRepository) {}

  async execute(input: GetPublicMenuInput): Promise<PublicMenuSnapshot | null> {
    const result = await this.snapshotRepo.getSnapshotBySlug(input.slug);
    return result?.snapshotData ?? null;
  }
}
