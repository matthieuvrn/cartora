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
  createItemImageUploadUrlAction,
  deleteItemImageAction,
  setItemImageAction,
} from "@/app/(app)/app/actions";
import { itemImageUrl } from "@/lib/storage-url";

type Props = {
  itemId: string;
  initialImagePath: string | null;
  initialAltTextFr: string | null;
  initialAltTextEn: string | null;
};

export function ItemPhotoEditor({
  itemId,
  initialImagePath,
  initialAltTextFr,
  initialAltTextEn,
}: Props) {
  const t = useTranslations("Dashboard.photo");
  const id = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [imagePath, setImagePath] = useState<string | null>(initialImagePath);
  const [altFr, setAltFr] = useState(initialAltTextFr ?? "");
  const [altEn, setAltEn] = useState(initialAltTextEn ?? "");
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
      const signed = await createItemImageUploadUrlAction({
        itemId,
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

      const persisted = await setItemImageAction({
        itemId,
        imagePath: signed.path,
        altTextFr: altFr.trim() || undefined,
        altTextEn: altEn.trim() || undefined,
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
      const result = await deleteItemImageAction({ itemId });
      if (!result.ok) {
        setError(t("error.generic"));
        return;
      }
      setImagePath(null);
      setAltFr("");
      setAltEn("");
    });
  }

  function persistAltText() {
    if (!imagePath) return;
    setError(null);
    startSavingAlt(async () => {
      const result = await setItemImageAction({
        itemId,
        imagePath,
        altTextFr: altFr.trim() || undefined,
        altTextEn: altEn.trim() || undefined,
      });
      if (!result.ok) setError(t("error.generic"));
    });
  }

  return (
    <fieldset className="space-y-3 rounded-lg border p-3">
      <legend className="px-2 text-sm font-medium">{t("title")}</legend>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex items-start gap-3">
        <div className="relative h-24 w-32 shrink-0 overflow-hidden rounded-md bg-muted">
          {previewUrl ? (
            <Image
              src={previewUrl}
              alt={altFr || altEn || ""}
              fill
              sizes="128px"
              className="object-cover"
            />
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
            <Label htmlFor={`${id}-altFr`}>{t("altTextFr")}</Label>
            <Input
              id={`${id}-altFr`}
              value={altFr}
              maxLength={MAX_ALT_TEXT_LENGTH}
              disabled={isSavingAlt}
              onChange={(e) => setAltFr(e.target.value)}
              onBlur={persistAltText}
              placeholder="ex : assiette de salade verte avec tomates"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor={`${id}-altEn`}>{t("altTextEn")}</Label>
            <Input
              id={`${id}-altEn`}
              value={altEn}
              maxLength={MAX_ALT_TEXT_LENGTH}
              disabled={isSavingAlt}
              onChange={(e) => setAltEn(e.target.value)}
              onBlur={persistAltText}
              placeholder="e.g. plate of green salad with tomatoes"
            />
          </div>
        </div>
      )}
    </fieldset>
  );
}
