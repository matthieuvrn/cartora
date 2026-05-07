import { describe, it, expect, vi, beforeEach } from "vitest";

// `unstable_rethrow` de next/navigation : on mock un comportement minimal —
// re-throw si le digest commence par "NEXT_", sinon no-op.
vi.mock("next/navigation", () => ({
  unstable_rethrow: (e: unknown) => {
    if (
      e !== null &&
      typeof e === "object" &&
      typeof (e as { digest?: unknown }).digest === "string" &&
      ((e as { digest: string }).digest.startsWith("NEXT_REDIRECT") ||
        (e as { digest: string }).digest.startsWith("NEXT_NOT_FOUND") ||
        (e as { digest: string }).digest.startsWith("NEXT_HTTP_ERROR_FALLBACK"))
    ) {
      throw e;
    }
  },
}));

const captureException = vi.fn();
vi.mock("@sentry/nextjs", () => ({
  captureException: (...args: unknown[]) => captureException(...args),
}));

import { withActionContext } from "./action-result";
import { DomainError } from "@/domain/errors/DomainError";

describe("withActionContext", () => {
  beforeEach(() => {
    captureException.mockClear();
  });

  it("renvoie le résultat tel quel quand le run réussit", async () => {
    const result = await withActionContext({ actionName: "test" }, async () => ({
      error: null,
      success: true,
    }));
    expect(result).toEqual({ error: null, success: true });
    expect(captureException).not.toHaveBeenCalled();
  });

  it("convertit DomainError en POJO { error: { code, metadata } } sans appeler Sentry", async () => {
    const result = await withActionContext({ actionName: "createCategory" }, async () => {
      throw new DomainError("max_categories", { limit: 6, current: 6, tier: "FREE" });
    });
    expect(result).toEqual({
      error: { code: "max_categories", metadata: { limit: 6, current: 6, tier: "FREE" } },
    });
    expect(captureException).not.toHaveBeenCalled();
  });

  it("convertit aussi un POJO ressemblant à une DomainError sérialisée", async () => {
    const result = await withActionContext({ actionName: "x" }, async () => {
      // throw d'un POJO non-Error : volontaire, simule le round-trip serialisation.
      const pojo = { name: "DomainError", code: "no_items", metadata: {} };
      throw pojo;
    });
    expect(result).toEqual({ error: { code: "no_items", metadata: {} } });
    expect(captureException).not.toHaveBeenCalled();
  });

  it("capture les erreurs inconnues dans Sentry avec tag/user/extra et renvoie generic", async () => {
    const ctx = {
      actionName: "publishMenu",
      restaurantId: "resto-1",
      input: { foo: "bar" },
    };
    const boom = new Error("boom");
    const result = await withActionContext(ctx, async () => {
      throw boom;
    });

    expect(result).toEqual({ error: { code: "generic" } });
    expect(captureException).toHaveBeenCalledTimes(1);
    expect(captureException).toHaveBeenCalledWith(boom, {
      tags: { action: "publishMenu" },
      user: { id: "resto-1" },
      extra: { foo: "bar" },
    });
  });

  it("ne setup pas user.id si restaurantId absent", async () => {
    await withActionContext({ actionName: "noUser" }, async () => {
      throw new Error("oops");
    });
    expect(captureException).toHaveBeenCalledWith(expect.any(Error), {
      tags: { action: "noUser" },
      user: undefined,
      extra: undefined,
    });
  });

  it("re-throw les navigation errors Next (digest NEXT_REDIRECT)", async () => {
    const navError = Object.assign(new Error("redirect"), { digest: "NEXT_REDIRECT;..." });
    await expect(
      withActionContext({ actionName: "x" }, async () => {
        throw navError;
      }),
    ).rejects.toBe(navError);
    expect(captureException).not.toHaveBeenCalled();
  });

  it("re-throw les navigation errors Next (digest NEXT_NOT_FOUND)", async () => {
    const navError = Object.assign(new Error("not found"), { digest: "NEXT_NOT_FOUND" });
    await expect(
      withActionContext({ actionName: "x" }, async () => {
        throw navError;
      }),
    ).rejects.toBe(navError);
    expect(captureException).not.toHaveBeenCalled();
  });
});
