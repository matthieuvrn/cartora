import type { UserDataExport, UserDataRepository } from "@/application/ports/UserDataRepository";

type Input = {
  restaurantId: string;
  email: string;
};

export class ExportUserData {
  constructor(private readonly repo: UserDataRepository) {}

  async execute(input: Input): Promise<UserDataExport> {
    return this.repo.exportUserData(input.restaurantId, input.email);
  }
}
