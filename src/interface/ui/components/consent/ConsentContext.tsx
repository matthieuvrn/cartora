"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import type { ConsentStatus } from "@/domain/consent/ConsentTypes";
import { CONSENT_COOKIE_NAME, CONSENT_MAX_AGE_SECONDS } from "@/domain/consent/ConsentTypes";

interface ConsentContextValue {
  status: ConsentStatus;
  accept: () => void;
  refuse: () => void;
  withdraw: () => void;
}

const ConsentContext = createContext<ConsentContextValue | null>(null);

function readCookie(): ConsentStatus {
  if (typeof document === "undefined") return "pending";
  const match = document.cookie
    .split(";")
    .find((c) => c.trim().startsWith(`${CONSENT_COOKIE_NAME}=`));
  if (!match) return "pending";
  const value = match.split("=")[1]?.trim();
  if (value === "accepted" || value === "refused") return value;
  return "pending";
}

function setCookie(value: "accepted" | "refused") {
  document.cookie = `${CONSENT_COOKIE_NAME}=${value}; path=/; max-age=${CONSENT_MAX_AGE_SECONDS}; SameSite=Lax`;
}

function deleteCookie() {
  document.cookie = `${CONSENT_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

// External store for consent state — avoids setState-in-effect lint errors
let listeners: Array<() => void> = [];
function emitChange() {
  for (const listener of listeners) listener();
}
function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
function getSnapshot(): ConsentStatus {
  return readCookie();
}
function getServerSnapshot(): ConsentStatus {
  return "pending";
}

export function ConsentProvider({ children }: { children: React.ReactNode }) {
  const status = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const accept = useCallback(() => {
    setCookie("accepted");
    emitChange();
  }, []);

  const refuse = useCallback(() => {
    setCookie("refused");
    emitChange();
  }, []);

  const withdraw = useCallback(() => {
    deleteCookie();
    emitChange();
  }, []);

  return <ConsentContext value={{ status, accept, refuse, withdraw }}>{children}</ConsentContext>;
}

export function useConsent(): ConsentContextValue {
  const ctx = useContext(ConsentContext);
  if (!ctx) {
    throw new Error("useConsent must be used within a ConsentProvider");
  }
  return ctx;
}
