"use client";

import { useSyncExternalStore } from "react";
import { toast } from "sonner";

/**
 * Suppression différée avec « Annuler » : la rangée disparaît immédiatement
 * (masquage optimiste via `usePendingDeletes`), un toast offre l'annulation
 * pendant `delayMs`, et l'appel serveur ne part qu'à l'échéance. Onglet fermé
 * avant l'échéance ⇒ l'entrée N'EST PAS supprimée (échec sûr : elle réapparaît
 * au prochain chargement).
 *
 * Registre au niveau module : les timers survivent aux démontages/navigations
 * client (la suppression aboutit même si l'utilisateur change de section), et
 * `flushAllPendingDeletes` purge tout avant une publication (le snapshot ne
 * doit pas embarquer un item visuellement supprimé).
 */

type Entry = {
  fired: boolean;
  timeoutId: ReturnType<typeof setTimeout>;
  fire: () => Promise<void>;
};

const pending = new Map<string, Entry>();
const listeners = new Set<() => void>();
let snapshot: ReadonlySet<string> = new Set();
const EMPTY: ReadonlySet<string> = new Set();

function notify() {
  snapshot = new Set(pending.keys());
  for (const listener of listeners) listener();
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

// Dernière chance avant déchargement de la page — best-effort : une server
// action lancée pendant `pagehide` n'aboutit pas toujours ; si elle échoue,
// l'entrée persiste (direction d'échec sûre).
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () => {
    for (const entry of pending.values()) void entry.fire();
  });
}

/** Ids en attente de suppression — à FILTRER des listes rendues. */
export function usePendingDeletes(): ReadonlySet<string> {
  return useSyncExternalStore(
    subscribe,
    () => snapshot,
    () => EMPTY,
  );
}

export type DeferDeleteParams = {
  /** Id de l'entité — masque la rangée tant que la suppression est en attente. */
  id: string;
  /**
   * Exécute la suppression serveur (l'action fait son propre `revalidatePath`).
   * Les erreurs se signalent DANS ce callback (toast) : en cas d'échec, l'id
   * quitte le registre et la rangée réapparaît (les props serveur n'ont pas bougé).
   */
  execute: () => Promise<void>;
  /** Message du toast (ex. « “Tartare” supprimé »). */
  message: string;
  /** Libellé du bouton d'annulation. */
  undoLabel: string;
  delayMs?: number;
};

export function deferDelete({
  id,
  execute,
  message,
  undoLabel,
  delayMs = 5000,
}: DeferDeleteParams) {
  if (pending.has(id)) return;

  const entry: Entry = {
    fired: false,
    timeoutId: setTimeout(() => void fire(), delayMs),
    fire,
  };

  async function fire() {
    // Anti double-exécution : timeout + pagehide + flush peuvent se croiser.
    if (entry.fired) return;
    entry.fired = true;
    clearTimeout(entry.timeoutId);
    try {
      await execute();
    } finally {
      pending.delete(id);
      notify();
    }
  }

  function cancel() {
    if (entry.fired) return;
    clearTimeout(entry.timeoutId);
    pending.delete(id);
    notify();
  }

  pending.set(id, entry);
  notify();

  toast(message, {
    action: { label: undoLabel, onClick: cancel },
    duration: delayMs,
  });
}

/**
 * Exécute immédiatement toutes les suppressions en attente. À attendre AVANT
 * de publier : le snapshot public reflète l'état serveur, pas l'état optimiste.
 */
export async function flushAllPendingDeletes(): Promise<void> {
  const entries = [...pending.values()];
  await Promise.all(entries.map((entry) => entry.fire()));
}
