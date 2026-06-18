"use client";

import { useActionState, useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2, Upload } from "lucide-react";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { Switch } from "@/components/ui/switch";
import {
  createItemAction,
  createItemImageUploadUrlAction,
  setItemImageAction,
  updateItemAction,
  type ItemActionState,
} from "@/app/(app)/app/actions";
import { ErrorMessage } from "./ErrorMessage";
import type { MenuItemData } from "@/domain/menu/MenuTypes";
import { ALLERGEN_VALUES } from "@/domain/menu/ItemPolicy";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_ALT_TEXT_LENGTH,
  MAX_IMAGE_SIZE_BYTES,
  type AllowedImageMime,
} from "@/domain/menu/ItemPhotoPolicy";
import { ItemPhotoEditor } from "./ItemPhotoEditor";

type Props = {
  mode: "create" | "edit";
  categoryId: string;
  item?: MenuItemData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const initialState: ItemActionState = { error: null };

export function ItemFormDialog({ mode, categoryId, item, open, onOpenChange }: Props) {
  const t = useTranslations("Dashboard");
  const tAllergen = useTranslations("Allergen");
  const id = useId();
  const selectedAllergens = new Set(item?.allergens ?? []);
  const serverAction = mode === "create" ? createItemAction : updateItemAction;

  // Create-mode photo: held in memory until the item is created, then uploaded.
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingAlt, setPendingAlt] = useState("");
  const [pendingFileError, setPendingFileError] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previewUrl = useMemo(
    () => (pendingFile ? URL.createObjectURL(pendingFile) : null),
    [pendingFile],
  );

  useEffect(() => {
    if (!previewUrl) return;
    return () => URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function handleFileChange(file: File | null) {
    setPendingFileError(null);
    if (!file) {
      setPendingFile(null);
      return;
    }
    if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
      setPendingFileError(t("photo.error.wrongFormat"));
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setPendingFileError(t("photo.error.tooLarge"));
      return;
    }
    setPendingFile(file);
  }

  function clearPendingFile() {
    setPendingFile(null);
    setPendingAlt("");
    setPendingFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const wrappedAction = useCallback(
    async (prev: ItemActionState, formData: FormData) => {
      const result = await serverAction(prev, formData);

      if (result.success && mode === "create" && pendingFile && result.createdItemId) {
        setIsUploadingPhoto(true);
        try {
          const signed = await createItemImageUploadUrlAction({
            itemId: result.createdItemId,
            mime: pendingFile.type as AllowedImageMime,
          });
          if (!signed.ok) throw new Error("signed-url-failed");

          const uploadResp = await fetch(signed.uploadUrl, {
            method: "PUT",
            headers: { "Content-Type": pendingFile.type },
            body: pendingFile,
          });
          if (!uploadResp.ok) throw new Error("upload-failed");

          await setItemImageAction({
            itemId: result.createdItemId,
            imagePath: signed.path,
            altText: pendingAlt.trim() || undefined,
          });
        } catch {
          // Item created, photo failed. Sentry already captured it server-side.
          // We close the dialog regardless — the user sees the dish in the list and
          // can retry the photo via the Edit dialog (zero data loss).
        } finally {
          setIsUploadingPhoto(false);
        }
      }

      if (result.success) {
        clearPendingFile();
        onOpenChange(false);
      }
      return result;
    },
    [serverAction, onOpenChange, mode, pendingFile, pendingAlt],
  );
  const [state, formAction, isPending] = useActionState(wrappedAction, initialState);
  const isBusy = isPending || isUploadingPhoto;
  const nameError = state.fieldErrors?.name;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        aria-describedby={undefined}
        className="flex w-full flex-col gap-0 sm:max-w-lg"
      >
        <SheetHeader>
          <SheetTitle>{mode === "create" ? t("addItem") : t("editItem")}</SheetTitle>
        </SheetHeader>

        <form action={formAction} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 space-y-5 overflow-y-auto px-6 py-4">
            <input type="hidden" name="categoryId" value={categoryId} />
            {mode === "edit" && item && <input type="hidden" name="itemId" value={item.id} />}

            {state.error?.code !== "validation" && <ErrorMessage error={state.error} />}

            {/* Saisie monolingue (S4) : une seule langue — celle du restaurateur.
                Les traductions se gèrent dans /app/traductions. v1 : source = fr,
                `translations.fr` EST le texte source (swap vers `texts` au step 11). */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor={`${id}-name`}>{t("name")}</Label>
                <Input
                  id={`${id}-name`}
                  name="name"
                  placeholder="ex: Spaghetti Carbonara"
                  defaultValue={item?.translations.fr.name ?? ""}
                  aria-invalid={!!nameError}
                />
                {nameError && <p className="text-xs text-destructive">{nameError}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor={`${id}-desc`}>{t("description")}</Label>
                <Textarea
                  id={`${id}-desc`}
                  name="description"
                  placeholder="ex: Pâtes fraîches, pancetta, parmesan..."
                  defaultValue={item?.translations.fr.description ?? ""}
                />
              </div>
            </div>

            {/* Price + Badge row */}
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
                    defaultValue={item ? (item.priceCents / 100).toFixed(2) : ""}
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
                <Select name="badge" defaultValue={item?.badge ?? "NONE"}>
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

            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">{tAllergen("sectionTitle")}</legend>
              <p className="text-xs text-muted-foreground">{tAllergen("selectLabel")}</p>
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

            {mode === "edit" && (
              <div className="flex items-center gap-2">
                <Switch
                  id={`${id}-available`}
                  name="isAvailable"
                  value="true"
                  defaultChecked={item?.isAvailable ?? true}
                />
                <Label htmlFor={`${id}-available`}>{t("available")}</Label>
              </div>
            )}

            {mode === "edit" && item && (
              <ItemPhotoEditor
                itemId={item.id}
                initialImagePath={item.imagePath}
                initialAltText={item.texts.altText?.fr ?? item.altTextFr}
              />
            )}

            {mode === "create" && (
              <fieldset className="space-y-3 rounded-lg border p-3">
                <legend className="px-2 text-sm font-medium">
                  {t("photo.title")}{" "}
                  <span className="font-normal text-muted-foreground">
                    {t("photo.optionalLabel")}
                  </span>
                </legend>
                {pendingFileError && (
                  <p role="alert" className="text-sm text-destructive">
                    {pendingFileError}
                  </p>
                )}
                <div className="flex items-start gap-3">
                  <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-md bg-muted">
                    {previewUrl ? (
                      // Local object URL preview, no need for next/image optimization here.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={previewUrl}
                        alt={pendingAlt || ""}
                        className="absolute inset-0 size-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                        {t("photo.noPhoto")}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept={ALLOWED_IMAGE_MIME_TYPES.join(",")}
                      className="hidden"
                      onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="size-4" />
                      {pendingFile ? t("photo.replace") : t("photo.upload")}
                    </Button>
                    {pendingFile && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isBusy}
                        onClick={clearPendingFile}
                      >
                        <Trash2 className="size-4" />
                        {t("photo.remove")}
                      </Button>
                    )}
                  </div>
                </div>

                {pendingFile && (
                  <div className="space-y-2">
                    <p className="text-xs text-muted-foreground">{t("photo.altTextHint")}</p>
                    <div className="space-y-1">
                      <Label htmlFor={`${id}-create-alt`}>{t("photo.altText")}</Label>
                      <Input
                        id={`${id}-create-alt`}
                        value={pendingAlt}
                        maxLength={MAX_ALT_TEXT_LENGTH}
                        disabled={isBusy}
                        onChange={(e) => setPendingAlt(e.target.value)}
                        placeholder="ex : assiette de salade verte avec tomates"
                      />
                    </div>
                  </div>
                )}
              </fieldset>
            )}
          </div>

          <SheetFooter className="flex-row justify-end gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isBusy}>
              {isBusy ? "…" : t("save")}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
