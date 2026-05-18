"use client";

import { useActionState, useId, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createDailyEntryAction,
  updateDailyEntryAction,
  type DailyEntryActionState,
} from "@/app/(app)/app/actions";
import { ErrorMessage } from "./ErrorMessage";
import type { DailyMenuEntryData } from "@/domain/menu/MenuTypes";
import { ALLERGEN_VALUES } from "@/domain/menu/ItemPolicy";
import { DailyMenuPolicy } from "@/domain/menu/DailyMenuPolicy";
import { DailyEntryPhotoEditor } from "./DailyEntryPhotoEditor";

type Props = {
  mode: "create" | "edit";
  entry?: DailyMenuEntryData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const initialState: DailyEntryActionState = { error: null };

/**
 * Convertit un ISO 8601 UTC vers le format `datetime-local` (YYYY-MM-DDTHH:MM)
 * dans la TZ du navigateur. Utilisé pour pré-remplir le picker d'expiration.
 */
function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function DailyEntryFormDialog({ mode, entry, open, onOpenChange }: Props) {
  const t = useTranslations("Dashboard");
  const tDaily = useTranslations("Dashboard.dailyMenu");
  const tAllergen = useTranslations("Allergen");
  const id = useId();
  const selectedAllergens = new Set(entry?.allergens ?? []);
  const serverAction = mode === "create" ? createDailyEntryAction : updateDailyEntryAction;

  // Default value pour le datetime-local : fin de journée Paris si création,
  // ou la valeur existante de l'entrée si édition.
  const defaultDatetimeLocal = useMemo(() => {
    if (entry) return isoToDatetimeLocal(entry.validUntilISO);
    return isoToDatetimeLocal(DailyMenuPolicy.defaultExpirationISO(new Date().toISOString()));
  }, [entry]);

  // Wrap l'action pour convertir le datetime-local → ISO avant d'envoyer.
  // Le navigateur expose une `value` au format `YYYY-MM-DDTHH:MM` ; on construit
  // un Date en TZ navigateur (sémantique attendue par l'utilisateur) puis ISO UTC.
  async function wrappedAction(prev: DailyEntryActionState, formData: FormData) {
    const local = formData.get("validUntilLocal");
    if (typeof local === "string" && local.length > 0) {
      const iso = new Date(local).toISOString();
      formData.set("validUntilISO", iso);
    }
    const result = await serverAction(prev, formData);
    if (result.error === null) {
      onOpenChange(false);
    }
    return result;
  }

  const [state, formAction, isPending] = useActionState(wrappedAction, initialState);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? tDaily("add") : tDaily("edit")}</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-5">
          {mode === "edit" && entry && <input type="hidden" name="entryId" value={entry.id} />}

          {state.error?.code !== "validation" && <ErrorMessage error={state.error} />}

          {/* FR */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-muted-foreground">Français</legend>
            <div className="space-y-1">
              <Label htmlFor={`${id}-nameFr`}>{t("nameFr")}</Label>
              <Input
                id={`${id}-nameFr`}
                name="nameFr"
                required
                placeholder="ex : Pot-au-feu maison"
                defaultValue={entry?.translations.fr.name ?? ""}
                aria-invalid={!!state.fieldErrors?.["translations.fr.name"]}
              />
              {state.fieldErrors?.["translations.fr.name"] && (
                <p className="text-xs text-destructive">
                  {state.fieldErrors["translations.fr.name"]}
                </p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${id}-descFr`}>{t("descriptionFr")}</Label>
              <Textarea
                id={`${id}-descFr`}
                name="descriptionFr"
                defaultValue={entry?.translations.fr.description ?? ""}
              />
            </div>
          </fieldset>

          {/* EN */}
          <fieldset className="space-y-3">
            <legend className="text-sm font-medium text-muted-foreground">English</legend>
            <div className="space-y-1">
              <Label htmlFor={`${id}-nameEn`}>{t("nameEn")}</Label>
              <Input
                id={`${id}-nameEn`}
                name="nameEn"
                defaultValue={entry?.translations.en.name ?? ""}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${id}-descEn`}>{t("descriptionEn")}</Label>
              <Textarea
                id={`${id}-descEn`}
                name="descriptionEn"
                defaultValue={entry?.translations.en.description ?? ""}
              />
            </div>
          </fieldset>

          {/* Price + Badge */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor={`${id}-price`}>{t("price")}</Label>
              <div className="relative">
                <Input
                  id={`${id}-price`}
                  name="priceEur"
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className="pr-8"
                  placeholder="0.00"
                  defaultValue={entry ? (entry.priceCents / 100).toFixed(2) : ""}
                  aria-invalid={!!state.fieldErrors?.priceEur}
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  €
                </span>
              </div>
              {state.fieldErrors?.priceEur && (
                <p className="text-xs text-destructive">{state.fieldErrors.priceEur}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor={`${id}-badge`}>{t("badgeLabel")}</Label>
              <Select name="badge" defaultValue={entry?.badge ?? "NONE"}>
                <SelectTrigger id={`${id}-badge`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE">{t("badge.NONE")}</SelectItem>
                  <SelectItem value="NEW">{t("badge.NEW")}</SelectItem>
                  <SelectItem value="POPULAR">{t("badge.POPULAR")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Allergens */}
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{tAllergen("sectionTitle")}</legend>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 sm:grid-cols-3">
              {ALLERGEN_VALUES.map((a) => {
                const checkboxId = `${id}-allergen-${a}`;
                return (
                  <label
                    key={a}
                    htmlFor={checkboxId}
                    className="flex cursor-pointer items-center gap-2 text-sm"
                  >
                    <input
                      id={checkboxId}
                      type="checkbox"
                      name="allergens"
                      value={a}
                      defaultChecked={selectedAllergens.has(a)}
                      className="size-4 rounded border-input"
                    />
                    <span>{tAllergen(`${a}.short`)}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          {/* Expiration */}
          <div className="space-y-1">
            <Label htmlFor={`${id}-validUntil`}>{tDaily("validUntilLabel")}</Label>
            <Input
              id={`${id}-validUntil`}
              name="validUntilLocal"
              type="datetime-local"
              defaultValue={defaultDatetimeLocal}
              aria-invalid={!!state.fieldErrors?.validUntilISO}
              required
            />
            <p className="text-xs text-muted-foreground">{tDaily("validUntilHint")}</p>
            {state.fieldErrors?.validUntilISO && (
              <p className="text-xs text-destructive">{state.fieldErrors.validUntilISO}</p>
            )}
          </div>

          {mode === "edit" && entry && (
            <DailyEntryPhotoEditor
              entryId={entry.id}
              initialImagePath={entry.imagePath}
              initialAltTextFr={entry.altTextFr}
              initialAltTextEn={entry.altTextEn}
            />
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "…" : t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
