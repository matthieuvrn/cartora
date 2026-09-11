import { afterEach, describe, expect, it, vi } from "vitest";
import { absoluteMenuUrl, menuPath } from "./public-menu-url";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("menuPath", () => {
  it("rend un chemin relatif, destiné à la navigation", () => {
    expect(menuPath("resto-1a2b3c4d")).toBe("/m/resto-1a2b3c4d");
  });
});

describe("absoluteMenuUrl", () => {
  it("préfixe avec l'URL publique de l'application", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://cartora.app");
    expect(absoluteMenuUrl("resto-1a2b3c4d")).toBe("https://cartora.app/m/resto-1a2b3c4d");
  });

  it("retombe sur l'origine fournie quand l'URL publique est absente", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(absoluteMenuUrl("resto-1a2b3c4d", "http://localhost:3000")).toBe(
      "http://localhost:3000/m/resto-1a2b3c4d",
    );
  });

  it("rend le chemin seul quand aucune base n'est connue", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    expect(absoluteMenuUrl("resto-1a2b3c4d")).toBe("/m/resto-1a2b3c4d");
  });
});
