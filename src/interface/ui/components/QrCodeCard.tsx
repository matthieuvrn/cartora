"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";
import { Download } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type Props = {
  qrCodeUrl: string;
};

export function QrCodeCard({ qrCodeUrl }: Props) {
  const t = useTranslations("Dashboard");

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("qrCode.title")}</CardTitle>
        <CardDescription>{t("qrCode.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col items-center gap-4">
        <Image
          src={qrCodeUrl}
          alt="QR Code"
          width={192}
          height={192}
          className="rounded-md"
          unoptimized
          priority
        />
        <Button variant="outline" size="sm" asChild>
          <a href={qrCodeUrl} download="qr-code.png">
            <Download />
            {t("qrCode.download")}
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
