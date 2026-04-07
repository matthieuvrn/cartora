import type { SnapshotRepository } from "@/application/ports/SnapshotRepository";

export type ListPublishedMenusOutput = Array<{ slug: string; publishedAt: string }>;

export class ListPublishedMenus {
  constructor(private readonly snapshotRepo: SnapshotRepository) {}

  async execute(): Promise<ListPublishedMenusOutput> {
    return this.snapshotRepo.listPublished();
  }
}
