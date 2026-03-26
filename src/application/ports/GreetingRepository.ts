import type { Locale } from "@/domain/hello/Greeting";

export interface GreetingRepository {
  getDefaultName(locale: Locale): Promise<string>;
}
