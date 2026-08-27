import type { LandingEventName } from "@/domain/analytics/LandingEventNames";
import { CONSENT_COOKIE_NAME } from "@/domain/consent/ConsentTypes";

interface TrackPayload {
  event: LandingEventName;
  locale: string;
  metadata?: Record<string, unknown>;
}

const VISITOR_STORAGE_KEY = "cartora-visitor-id";

/**
 * Id de visite anonyme (sessionStorage — jamais de cookie, purgé à la fermeture de l'onglet),
 * attaché aux events UNIQUEMENT quand le consentement est « accepted ». Sans consentement,
 * les events restent strictement anonymes comme avant (mesure d'audience exemptée).
 * Permet les funnels joints (« X % de ceux qui ont vu le pricing ont cliqué ») et les A/B.
 */
function getVisitorId(): string | null {
  try {
    if (typeof document === "undefined") return null;
    const consented = document.cookie
      .split(";")
      .some((c) => c.trim().startsWith(`${CONSENT_COOKIE_NAME}=accepted`));
    if (!consented) return null;
    const existing = window.sessionStorage.getItem(VISITOR_STORAGE_KEY);
    if (existing) return existing;
    const id = window.crypto.randomUUID();
    window.sessionStorage.setItem(VISITOR_STORAGE_KEY, id);
    return id;
  } catch {
    // Storage bloqué (navigation privée…) : on track sans id plutôt que d'échouer.
    return null;
  }
}

export function trackLandingEvent({ event, locale, metadata }: TrackPayload) {
  const visitorId = getVisitorId();
  const mergedMetadata = { ...metadata, ...(visitorId ? { visitorId } : {}) };
  // Référent de NAVIGATION (document.referrer) : le header Referer du POST est
  // l'URL de la page émettrice — il classerait toute la landing en trafic « lien »
  // auto-référentiel. Réduit au hostname côté serveur (sanitizeRefererToHost) ;
  // tronqué ici à la borne Zod pour qu'une URL fleuve ne coûte pas l'événement.
  const referrer = typeof document !== "undefined" ? document.referrer.slice(0, 2048) : "";
  const payload = JSON.stringify({
    type: "landing",
    event,
    locale: locale === "en" ? "en" : "fr",
    ...(referrer ? { referrer } : {}),
    ...(Object.keys(mergedMetadata).length > 0 ? { metadata: mergedMetadata } : {}),
  });

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([payload], { type: "application/json" });
    if (navigator.sendBeacon("/api/track", blob)) return;
  }
  void fetch("/api/track", {
    method: "POST",
    body: payload,
    keepalive: true,
    headers: { "Content-Type": "application/json" },
  }).catch(() => {});
}
