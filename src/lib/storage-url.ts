const RESTAURANT_LOGOS_BUCKET = "restaurant-logos";

/**
 * Builds a Supabase public object URL for a stored restaurant logo.
 *
 * Uses the standard `/object/public/` endpoint (works on every Supabase plan).
 * Resizing/format negotiation is handled by Next.js Image Optimization at the
 * call site — do NOT pass `unoptimized` on `<Image>`.
 * Cf. supabase/sql/069_restaurant_logo.sql.
 *
 * Returns null if SUPABASE_URL is not configured (e.g. in tests).
 */
export function restaurantLogoUrl(logoPath: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${RESTAURANT_LOGOS_BUCKET}/${logoPath}`;
}
