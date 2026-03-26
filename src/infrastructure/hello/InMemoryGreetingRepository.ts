import type { GreetingRepository } from "@/application/ports/GreetingRepository";
import type { Locale } from "@/domain/hello/Greeting";

export class InMemoryGreetingRepository implements GreetingRepository {
  async getDefaultName(locale: Locale): Promise<string> {
    return locale === "fr" ? "Restaurateur" : "Restaurant owner";
  }
}
