import type { Clock } from "@/application/ports/Clock";
import type { GreetingRepository } from "@/application/ports/GreetingRepository";
import { Greeting, type Locale } from "@/domain/hello/Greeting";
import { GreetingPolicy } from "@/domain/hello/GreetingPolicy";

export type GetHelloInput = {
  locale: Locale;
  name?: string;
};

export type GetHelloOutput = {
  message: string;
  generatedAt: string;
};

export class GetHello {
  constructor(
    private readonly repo: GreetingRepository,
    private readonly clock: Clock,
  ) {}

  async execute(input: GetHelloInput): Promise<GetHelloOutput> {
    const fallbackName = await this.repo.getDefaultName(input.locale);
    const normalized = GreetingPolicy.normalizeName(input.name ?? fallbackName);

    const greeting = Greeting.create(input.locale, normalized);

    return {
      message: greeting.message,
      generatedAt: this.clock.nowISO(),
    };
  }
}
