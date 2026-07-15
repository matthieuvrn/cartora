"use client";

import { useEffect, useState } from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cropImageToWebp } from "./cropImage";

type Props = {
  open: boolean;
  /** Fichier source sélectionné (déjà validé mime/taille par le parent). */
  file: File | null;
  onOpenChange: (open: boolean) => void;
  /** Reçoit le Blob WebP carré normalisé, prêt à uploader. */
  onConfirm: (blob: Blob) => void | Promise<void>;
};

/**
 * Étape de recadrage : l'utilisateur cadre/zoome son logo dans un carré (aspect 1).
 * À la validation, `cropImageToWebp` produit un asset 512×512 WebP déterministe.
 * `react-easy-crop` injecte son propre <style> et lit une image data-URL — les deux
 * sont autorisés par le CSP (style-src 'unsafe-inline', img-src data:).
 */
export function LogoCropDialog({ open, file, onOpenChange, onConfirm }: Props) {
  const t = useTranslations("Settings.branding");
  const [isProcessing, setIsProcessing] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(next) => !isProcessing && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("cropTitle")}</DialogTitle>
          <DialogDescription>{t("cropHint")}</DialogDescription>
        </DialogHeader>

        {/* Remonté à chaque nouveau fichier (key) → cadrage/zoom repartent de zéro. */}
        {file && (
          <CropBody
            key={`${file.name}-${file.lastModified}-${file.size}`}
            file={file}
            onConfirm={onConfirm}
            onCancel={() => onOpenChange(false)}
            onProcessingChange={setIsProcessing}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CropBody({
  file,
  onConfirm,
  onCancel,
  onProcessingChange,
}: {
  file: File;
  onConfirm: (blob: Blob) => void | Promise<void>;
  onCancel: () => void;
  onProcessingChange: (processing: boolean) => void;
}) {
  const t = useTranslations("Settings.branding");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Décodage en data-URL : le setState vit dans le callback async de FileReader
  // (pas dans le corps de l'effet) — pas de cascade de rendus, pas d'URL à révoquer.
  useEffect(() => {
    const reader = new FileReader();
    reader.onload = () => setImageSrc(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
    return () => reader.abort();
  }, [file]);

  async function handleConfirm() {
    if (!area) return;
    setIsProcessing(true);
    onProcessingChange(true);
    try {
      const blob = await cropImageToWebp(file, area);
      await onConfirm(blob);
    } finally {
      setIsProcessing(false);
      onProcessingChange(false);
    }
  }

  return (
    <>
      <div className="relative h-72 w-full overflow-hidden rounded-md bg-neutral-900">
        {imageSrc && (
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={(_, pixels) => setArea(pixels)}
          />
        )}
      </div>

      <label className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">{t("zoom")}</span>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          aria-label={t("zoom")}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="h-1.5 flex-1 cursor-pointer accent-primary"
        />
      </label>

      <DialogFooter>
        <Button type="button" variant="ghost" onClick={onCancel} disabled={isProcessing}>
          {t("cropCancel")}
        </Button>
        <Button type="button" onClick={handleConfirm} disabled={isProcessing || !area}>
          {isProcessing ? t("uploading") : t("cropConfirm")}
        </Button>
      </DialogFooter>
    </>
  );
}
