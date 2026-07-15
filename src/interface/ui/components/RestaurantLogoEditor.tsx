"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Trash2, Upload } from "lucide-react";
import { ALLOWED_LOGO_MIME_TYPES, MAX_LOGO_SIZE_BYTES } from "@/domain/restaurant/BrandingPolicy";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  createRestaurantLogoUploadUrlAction,
  deleteRestaurantLogoAction,
  setRestaurantLogoAction,
} from "@/app/(app)/app/actions";
import { restaurantLogoUrl } from "@/lib/storage-url";
import { TemplateLogo } from "@/interface/ui/components/menu-template/TemplateLogo";
import { LogoMonogram } from "@/interface/ui/components/logo/LogoMonogram";
import { LogoMenuPreview } from "@/interface/ui/components/logo/LogoMenuPreview";
import { LogoCropDialog } from "@/interface/ui/components/logo/LogoCropDialog";

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
  const [isDragging, setIsDragging] = useState(false);
  const [cacheBust, setCacheBust] = useState(0);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const previewUrl = logoPath ? restaurantLogoUrl(logoPath) : null;
  const displayUrl = previewUrl && cacheBust > 0 ? `${previewUrl}?v=${cacheBust}` : previewUrl;
  const busy = isUploading || isDeleting;

  // Sélection d'un fichier (bouton ou drop) : on valide le fichier d'ENTRÉE
  // (mime accepté + taille) puis on ouvre l'étape de recadrage. L'upload réel
  // n'a lieu qu'après le crop, sur le Blob WebP normalisé (cf. onCropConfirm).
  function onFileSelected(file: File) {
    setError(null);
    if (!(ALLOWED_LOGO_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError(t("errors.wrongFormat"));
      return;
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      setError(t("errors.tooLarge"));
      return;
    }
    setPendingFile(file);
  }

  async function onCropConfirm(blob: Blob) {
    setError(null);
    setIsUploading(true);
    try {
      const signed = await createRestaurantLogoUploadUrlAction({ mime: "image/webp" });
      if (!signed.ok) {
        setError(t("errors.generic"));
        return;
      }

      const uploadResp = await fetch(signed.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": "image/webp" },
        body: blob,
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
      // Force le re-téléchargement même si le path est identique (upsert même extension).
      setCacheBust((c) => c + 1);
    } catch {
      setError(t("errors.generic"));
    } finally {
      setIsUploading(false);
      setPendingFile(null);
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

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (busy) return;
    const file = e.dataTransfer.files?.[0];
    if (file) onFileSelected(file);
  }

  return (
    <div className="space-y-4">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <input
          ref={fileInputRef}
          id={`${id}-file`}
          type="file"
          accept={ALLOWED_LOGO_MIME_TYPES.join(",")}
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelected(file);
          }}
        />

        <button
          type="button"
          aria-label={logoPath ? t("replace") : t("upload")}
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            if (!busy) setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={cn(
            "group relative size-24 shrink-0 overflow-hidden rounded-lg border-2 border-dashed border-border bg-muted/40 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60",
            isDragging && "border-primary bg-primary/5",
          )}
        >
          {displayUrl ? (
            <TemplateLogo
              src={displayUrl}
              alt={restaurantName}
              className="size-full rounded-none border-none"
              sizes="96px"
              unoptimized={cacheBust > 0}
            />
          ) : (
            <LogoMonogram name={restaurantName} className="size-full rounded-none text-2xl" />
          )}
          <span className="absolute inset-0 flex items-center justify-center bg-foreground/0 text-transparent transition-colors group-hover:bg-foreground/50 group-hover:text-background">
            <Upload className="size-5" />
          </span>
        </button>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="size-4" />
            {isUploading ? t("uploading") : logoPath ? t("replace") : t("upload")}
          </Button>
          {logoPath && (
            <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onDelete}>
              <Trash2 className="size-4" />
              {t("delete")}
            </Button>
          )}
          <p className="text-xs text-muted-foreground">{t("constraints")}</p>
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs font-medium text-muted-foreground">{t("previewLabel")}</p>
        <LogoMenuPreview
          logoUrl={displayUrl}
          restaurantName={restaurantName}
          unoptimized={cacheBust > 0}
        />
      </div>

      <LogoCropDialog
        open={pendingFile !== null}
        file={pendingFile}
        onOpenChange={(open) => {
          if (!open) {
            setPendingFile(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
          }
        }}
        onConfirm={onCropConfirm}
      />
    </div>
  );
}
