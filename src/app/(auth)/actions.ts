"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/infrastructure/supabase/server";

// ─── Schemas ───

const EmailSchema = z.email();
const PasswordSchema = z.string().min(6);

// ─── State ───

export type AuthState = {
  error: string | null;
  success?: boolean;
};

// ─── Helpers ───

function getValidationError(email: unknown, password: unknown): string | null {
  if (!EmailSchema.safeParse(email).success) return "invalid_email";
  if (!PasswordSchema.safeParse(password).success) return "password_too_short";
  return null;
}

// ─── Actions ───

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = formData.get("email");
  const password = formData.get("password");

  const validationError = getValidationError(email, password);
  if (validationError) {
    return { error: validationError };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email as string,
    password: password as string,
  });

  if (error) {
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return { error: "email_not_confirmed" };
    }
    return { error: "invalid_credentials" };
  }

  redirect("/app");
}

export async function signupAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = formData.get("email");
  const password = formData.get("password");

  const validationError = getValidationError(email, password);
  if (validationError) {
    return { error: validationError };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signUp({
    email: email as string,
    password: password as string,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
    },
  });

  if (error) {
    console.error("[signupAction]", error);
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: "user_already_exists" };
    }
    return { error: "generic" };
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
    console.error("[resendConfirmationAction]", error);
    return { error: "generic" };
  }

  return { error: null, success: true };
}

export async function logoutAction(): Promise<never> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
