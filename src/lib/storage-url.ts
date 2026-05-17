const ITEM_IMAGES_BUCKET = "item-images";
const RESTAURANT_LOGOS_BUCKET = "restaurant-logos";

/**
 * Builds a Supabase public object URL for a stored item photo.
 *
 * Uses the standard `/object/public/` endpoint (works on every Supabase plan).
 * Resizing/format negotiation is handled by Next.js Image Optimization at the
 * call site — do NOT pass `unoptimized` on `<Image>`.
 *
 * Returns null if SUPABASE_URL is not configured (e.g. in tests).
 */
export function itemImageUrl(imagePath: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${ITEM_IMAGES_BUCKET}/${imagePath}`;
}

/**
 * Builds a Supabase public object URL for a stored restaurant logo.
 * Even path layout as `itemImageUrl`, distinct bucket. Cf. supabase/sql/069_restaurant_logo.sql.
 */
export function restaurantLogoUrl(logoPath: string): string | null {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) return null;
  return `${base}/storage/v1/object/public/${RESTAURANT_LOGOS_BUCKET}/${logoPath}`;
}
