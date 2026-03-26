export class GreetingPolicy {
  static normalizeName(input?: string): string {
    const name = (input ?? "").trim();
    if (!name) return "Restaurateur";
    if (name.length > 50) return name.slice(0, 50);
    return name;
  }
}
