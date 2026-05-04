"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";
import { RESTAURANT_TYPES } from "@/domain/restaurant/RestaurantInitPolicy";
import * as Sentry from "@sentry/nextjs";

// ─── Schemas ───

const EmailSchema = z.email();
const PasswordSchema = z.string().min(8);
const RestaurantTypeSchema = z.enum(RESTAURANT_TYPES);

// ─── State ───

export type AuthState = {
  error: string | null;
  success?: boolean;
};

// ─── Actions ───

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = formData.get("email");
  const password = formData.get("password");

  // Au login, on ne valide jamais le format du mdp : il a pu être créé sous une politique antérieure.
  // Supabase tranche via invalid_credentials.
  if (!EmailSchema.safeParse(email).success) {
    return { error: "invalid_email" };
  }
  if (typeof password !== "string" || password.length === 0) {
    return { error: "invalid_credentials" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email as string,
    password,
  });

  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "email_not_confirmed" };
    }
    if (error.code === "over_request_rate_limit" || error.code === "over_email_send_rate_limit") {
      return { error: "rate_limited" };
    }
    return { error: "invalid_credentials" };
  }

  redirect("/app");
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (!EmailSchema.safeParse(email).success) {
    return { error: "invalid_email" };
  }
  if (!PasswordSchema.safeParse(password).success) {
    return { error: "password_too_short" };
  }

  const restaurantTypeRaw = formData.get("restaurantType");
  const restaurantTypeResult =
    typeof restaurantTypeRaw === "string" && restaurantTypeRaw.length > 0
      ? RestaurantTypeSchema.safeParse(restaurantTypeRaw)
      : null;
  const restaurantType = restaurantTypeResult?.success ? restaurantTypeResult.data : undefined;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: email as string,
    password: password as string,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      data: restaurantType ? { restaurant_type: restaurantType } : undefined,
    },
  });

  if (error) {
    Sentry.captureException(error, { tags: { action: "signup" } });
    if (error.code === "user_already_exists") {
      return { error: "user_already_exists" };
    }
    if (error.code === "over_request_rate_limit" || error.code === "over_email_send_rate_limit") {
      return { error: "rate_limited" };
    }
    return { error: "generic" };
  }

  // Supabase returns fake success with empty identities for duplicate emails
  // when email confirmation is enabled (to prevent email enumeration)
  if (data.user && data.user.identities?.length === 0) {
    return { error: "user_already_exists" };
  }

  return { error: null, success: true };
}

export async function resendConfirmationAction(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = formData.get("email");
  if (!EmailSchema.safeParse(email).success) {
    return { error: "invalid_email" };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email as string,
  });

  if (error) {
    Sentry.captureException(error, { tags: { action: "resendConfirmation" } });
    if (error.code === "over_request_rate_limit" || error.code === "over_email_send_rate_limit") {
      return { error: "rate_limited" };
    }
    return { error: "generic" };
  }

  return { error: null, success: true };
}

export async function logoutAction(): Promise<never> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
