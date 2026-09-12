import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn — tokens de taille du @theme", () => {
  it("garde un token de taille suivi d'une couleur", () => {
    expect(cn("text-h3", "text-sand-50")).toBe("text-h3 text-sand-50");
    expect(cn("mt-5 text-h3 text-canard-950", "relative")).toBe(
      "mt-5 text-h3 text-canard-950 relative",
    );
    expect(cn("rounded-full text-micro", "text-canard-800")).toBe(
      "rounded-full text-micro text-canard-800",
    );
  });
  it("garde les variantes responsive d'un même token", () => {
    expect(
      cn(
        "display text-display-lg leading-none tabular-nums lg:text-h1 xl:text-display-lg",
        "text-canard-950",
      ),
    ).toBe(
      "display text-display-lg leading-none tabular-nums lg:text-h1 xl:text-display-lg text-canard-950",
    );
  });
  it("résout un conflit de taille (maison / t-shirt) : le dernier gagne", () => {
    expect(cn("text-sm", "text-h3")).toBe("text-h3");
    expect(cn("text-h3", "text-body")).toBe("text-body");
    expect(cn("text-body-sm", "text-caption")).toBe("text-caption");
    expect(cn("text-body", "md:text-h3")).toBe("text-body md:text-h3");
  });
});
