/**
 * Prix en euros ↔ centimes pour les formulaires de l'éditeur. Accepte la saisie
 * française (« 12,50 ») comme anglo-saxonne (« 12.50 »), les espaces (insécables
 * incluses) et un « € » traînant. Jamais de float en base : centimes entiers.
 */
export function parsePriceEurToCents(raw: string): number | null {
  const normalized = raw.replace(/€/g, "").replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;
  const cents = Math.round(Number.parseFloat(normalized) * 100);
  return Number.isSafeInteger(cents) ? cents : null;
}

/** Valeur d'input (format fr) depuis des centimes : 1250 → « 12,50 ». */
export function formatCentsToEurInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}
