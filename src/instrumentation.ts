import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // VPN/corporate network: patch tls.createSecureContext to include system CA certs
    // NODE_EXTRA_CA_CERTS doesn't propagate into Turbopack workers, so we do it here
    if (process.env.NODE_ENV === "development") {
      try {
        const { existsSync, readFileSync } = await import("node:fs");
        const { join } = await import("node:path");
        const { homedir } = await import("node:os");
        const tls = await import("node:tls");
        const certPath = join(homedir(), ".ssl", "macos-ca-bundle.pem");
        if (existsSync(certPath)) {
          const extraCa = readFileSync(certPath);
          const orig = tls.createSecureContext.bind(tls);
          tls.createSecureContext = (options = {}) =>
            orig({ ...options, ca: options.ca ?? extraCa });
        }
      } catch {
        // silently ignore — non-critical dev helper
      }
    }

    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export const onRequestError = Sentry.captureRequestError;
