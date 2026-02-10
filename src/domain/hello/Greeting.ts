export type Locale = 'fr' | 'en';

export class Greeting {
  constructor(
    public readonly message: string
  ) {}

  static create(locale: Locale, name: string): Greeting {
    const msg =
      locale === 'fr'
        ? `Bonjour ${name} 👋`
        : `Hello ${name} 👋`;

    return new Greeting(msg);
  }
}