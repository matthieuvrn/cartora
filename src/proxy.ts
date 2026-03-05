import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseMiddlewareClient } from "@/infrastructure/supabase/middleware";

const PROTECTED_PREFIX = "/app";
const AUTH_PATHS = ["/login", "/signup"];

export default async function proxy(request: NextRequest) {
  const { user, response } = await createSupabaseMiddlewareClient(request);
  const { pathname } = request.nextUrl;

  // Not authenticated → protect /app/**
  if (!user && pathname.startsWith(PROTECTED_PREFIX)) {
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
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
