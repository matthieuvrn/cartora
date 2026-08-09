import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "@/infrastructure/supabase/middleware";

const PROTECTED_PREFIX = "/app";
const AUTH_PATHS = ["/login", "/signup"];

export default async function proxy(request: NextRequest) {
  const { user, response } = await createSupabaseMiddlewareClient(request);
  const { pathname } = request.nextUrl;

  // Not authenticated → protect /app and /app/**
  // (substring check would also match siblings like /apple-icon — guard with
  // an exact match or a trailing slash to keep it boundary-aware).
  const isProtected = pathname === PROTECTED_PREFIX || pathname.startsWith(`${PROTECTED_PREFIX}/`);
  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Already authenticated → skip /login and /signup
  if (user && AUTH_PATHS.includes(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  // Uniquement les routes où le proxy AGIT : protection de /app/** et redirection des
  // utilisateurs connectés hors de /login//signup. L'ancien matcher attrapait TOUT (dont la
  // landing statique et /m/**) et payait un appel Supabase Auth par requête pour rien —
  // et un middleware sur `/` empêcherait le service CDN pur des pages prérendues.
  matcher: ["/app/:path*", "/login", "/signup"],
};
