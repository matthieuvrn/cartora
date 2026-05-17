"use client";

import Image from "next/image";
import { useId, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2, Upload } from "lucide-react";
import {
  ALLOWED_LOGO_MIME_TYPES,
  MAX_LOGO_SIZE_BYTES,
  type AllowedLogoMime,
} from "@/domain/restaurant/BrandingPolicy";
import { Button } from "@/components/ui/button";
import {
  createRestaurantLogoUploadUrlAction,
  deleteRestaurantLogoAction,
  setRestaurantLogoAction,
} from "@/app/(app)/app/actions";
import { restaurantLogoUrl } from "@/lib/storage-url";

type Props = {
  initialLogoPath: string | null;
  restaurantName: string;
};

export function RestaurantLogoEditor({ initialLogoPath, restaurantName }: Props) {
  const t = useTranslations("Settings.branding");
  const id = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [logoPath, setLogoPath] = useState<string | null>(initialLogoPath);
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, startDeleting] = useTransition();
  const [cacheBust, setCacheBust] = useState(0);

  const previewUrl = logoPath ? restaurantLogoUrl(logoPath) : null;

  async function onFileSelected(file: File) {
    setError(null);

    if (!(ALLOWED_LOGO_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError(t("errors.wrongFormat"));
      return;
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setError(t("errors.tooLarge"));
      return;
    }

    setIsUploading(true);
    try {
      const signed = await createRestaurantLogoUploadUrlAction({
        mime: file.type as AllowedLogoMime,
      });
      if (!signed.ok) {
        setError(t("errors.generic"));
        return;
      }

      const uploadResp = await fetch(signed.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!uploadResp.ok) {
        setError(t("errors.generic"));
        return;
      }

      const persisted = await setRestaurantLogoAction({ logoPath: signed.path });
      if (!persisted.ok) {
        setError(t("errors.generic"));
        return;
      }

      setLogoPath(signed.path);
      // Force le navigateur à re-télécharger l'image même si le path est identique
      // (cas du remplacement avec même extension qui écrase l'objet via upsert).
      setCacheBust((c) => c + 1);
    } catch {
      setError(t("errors.generic"));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function onDelete() {
    setError(null);
    startDeleting(async () => {
      const result = await deleteRestaurantLogoAction();
      if (!result.ok) {
        setError(t("errors.generic"));
        return;
      }
      setLogoPath(null);
    });
  }

  const displayUrl = previewUrl && cacheBust > 0 ? `${previewUrl}?v=${cacheBust}` : previewUrl;

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border bg-muted">
          {displayUrl ? (
            <Image
              src={displayUrl}
              alt={restaurantName}
              fill
              sizes="96px"
              className="object-contain"
              unoptimized={cacheBust > 0}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
              {t("noLogo")}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <input
            ref={fileInputRef}
            id={`${id}-file`}
            type="file"
            accept={ALLOWED_LOGO_MIME_TYPES.join(",")}
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
            {isUploading ? t("uploading") : logoPath ? t("replace") : t("upload")}
          </Button>
          {logoPath && (
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
          <p className="text-xs text-muted-foreground">{t("constraints")}</p>
        </div>
      </div>
    </div>
  );
}
