"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteAccountAction } from "@/app/(app)/app/billing-actions";

export function DeleteAccountButton() {
  const t = useTranslations("Dashboard");
  const confirmWord = t("deleteAccountConfirmWord");
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const isConfirmed = confirmText === confirmWord;

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await deleteAccountAction();
      if (result?.error) {
        // stripe_cleanup_failed ⇒ rien n'a été supprimé, réessayer suffit (message dédié).
        setError(
          result.error === "stripe_cleanup_failed"
            ? t("deleteAccountStripeError")
            : t("deleteAccountError"),
        );
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          setConfirmText("");
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive" size="sm">
          {t("deleteAccount")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("deleteAccountConfirmTitle")}</DialogTitle>
          <DialogDescription>{t("deleteAccountConfirmDescription")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <label htmlFor="delete-account-confirm" className="text-sm font-medium">
            {t("deleteAccountConfirmLabel", { word: confirmWord })}
          </label>
          <Input
            id="delete-account-confirm"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={confirmWord}
            disabled={isPending}
          />
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            disabled={!isConfirmed || isPending}
            aria-busy={isPending}
            onClick={handleSubmit}
          >
            {isPending ? t("deleteAccountDeleting") : t("deleteAccountConfirmButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
