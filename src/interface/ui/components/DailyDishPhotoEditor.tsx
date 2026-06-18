"use client";

import Image from "next/image";
import { useId, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2, Upload } from "lucide-react";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_ALT_TEXT_LENGTH,
  MAX_IMAGE_SIZE_BYTES,
  type AllowedImageMime,
} from "@/domain/menu/ItemPhotoPolicy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  createDailyDishImageUploadUrlAction,
  deleteDailyDishImageAction,
  setDailyDishImageAction,
} from "@/app/(app)/app/actions";
import { itemImageUrl } from "@/lib/storage-url";

type Props = {
  dishId: string;
  initialImagePath: string | null;
  /** Alt-text dans la langue de saisie (S4) — les autres locales : /app/traductions. */
  initialAltText: string | null;
};

/**
 * Photo editor pour un plat du jour (S3.1). Calque sur `ItemPhotoEditor` mais
 * appelle les actions ``*DailyDishImage*``. Le bucket Supabase est le même
 * (`item-images`) avec un sous-chemin `daily/`.
 */
export function DailyDishPhotoEditor({ dishId, initialImagePath, initialAltText }: Props) {
  const t = useTranslations("Dashboard.photo");
  const id = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imagePath, setImagePath] = useState<string | null>(initialImagePath);
  const [alt, setAlt] = useState(initialAltText ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, startDeleting] = useTransition();
  const [isSavingAlt, startSavingAlt] = useTransition();

  const previewUrl = imagePath ? itemImageUrl(imagePath) : null;

  async function onFileSelected(file: File) {
    setError(null);
    if (!(ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError(t("error.wrongFormat"));
      return;
    }
    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      setError(t("error.tooLarge"));
      return;
    }

    setIsUploading(true);
    try {
      const signed = await createDailyDishImageUploadUrlAction({
        dishId,
        mime: file.type as AllowedImageMime,
      });
      if (!signed.ok) {
        setError(t("error.generic"));
        return;
      }

      const uploadResp = await fetch(signed.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadResp.ok) {
        setError(t("error.generic"));
        return;
      }

      const persisted = await setDailyDishImageAction({
        dishId,
        imagePath: signed.path,
        altText: alt.trim() || undefined,
      });
      if (!persisted.ok) {
        setError(t("error.generic"));
        return;
      }

      setImagePath(signed.path);
    } catch {
      setError(t("error.generic"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function onDelete() {
    setError(null);
    startDeleting(async () => {
      const result = await deleteDailyDishImageAction({ dishId });
      if (!result.ok) {
        setError(t("error.generic"));
        return;
      }
      setImagePath(null);
      setAlt("");
    });
  }

  function persistAltText() {
    if (!imagePath) return;
    setError(null);
    startSavingAlt(async () => {
      const result = await setDailyDishImageAction({
        dishId,
        imagePath,
        altText: alt.trim() || undefined,
      });
      if (!result.ok) setError(t("error.generic"));
    });
  }

  return (
    <fieldset className="space-y-3 rounded-lg border p-3">
      <legend className="px-2 text-sm font-medium">
        {t("title")} <span className="font-normal text-muted-foreground">{t("optionalLabel")}</span>
      </legend>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-start gap-3">
        <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-md bg-muted">
          {previewUrl ? (
            <Image src={previewUrl} alt={alt || ""} fill sizes="128px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              {t("noPhoto")}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            id={`${id}-file`}
            type="file"
            accept={ALLOWED_IMAGE_MIME_TYPES.join(",")}
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void onFileSelected(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading || isDeleting}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-4" />
            {isUploading ? t("uploading") : imagePath ? t("replace") : t("upload")}
          </Button>
          {imagePath && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isUploading || isDeleting}
              onClick={onDelete}
            >
              <Trash2 className="size-4" />
              {t("delete")}
            </Button>
          )}
        </div>
      </div>

      {imagePath && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">{t("altTextHint")}</p>
          <div className="space-y-1">
            <Label htmlFor={`${id}-alt`}>{t("altText")}</Label>
            <Input
              id={`${id}-alt`}
              value={alt}
              maxLength={MAX_ALT_TEXT_LENGTH}
              disabled={isSavingAlt}
              onChange={(e) => setAlt(e.target.value)}
              onBlur={persistAltText}
            />
          </div>
        </div>
      )}
    </fieldset>
  );
}
