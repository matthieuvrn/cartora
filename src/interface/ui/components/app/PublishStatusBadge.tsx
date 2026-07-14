"use client";

import { useLocale, useTranslations } from "next-intl";
import { useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useRelativeTime } from "@/hooks/use-relative-time";
import type { PublishBarState } from "@/app/(app)/app/_lib/publishBarState";

/** État visuel de la publication, dérivé du couple (status, publishedAt). */
export type PublishView = "published" | "changes" | "draft";

/**
 * Source unique de la dérivation d'état — partagée par la barre desktop, le contrôle
 * mobile et la pastille. PUBLISHED = en ligne ; DRAFT avec un `publishedAt` = modifications
 * non publiées ; DRAFT sans `publishedAt` = brouillon jamais publié.
 */
export function publishView(
  status: PublishBarState["status"],
  publishedAt: string | null,
): PublishView {
  if (status === "PUBLISHED") return "published";
  return publishedAt ? "changes" : "draft";
}

const DOT: Record<PublishView, { color: string; pulse: boolean }> = {
  published: { color: "bg-success", pulse: true },
  changes: { color: "bg-warning", pulse: true },
  // Un brouillon neuf n'est PAS un warning : point neutre muted, sans halo.
  draft: { color: "bg-muted-foreground/50", pulse: false },
};

/** Point de statut coloré, avec halo « live » (ping) pour les états publié / modifications. */
export function StatusDot({ view, className }: { view: PublishView; className?: string }) {
  const reduce = useReducedMotion();
  const { color, pulse } = DOT[view];
  return (
    <span className={cn("relative flex size-2 shrink-0", className)} aria-hidden>
      {pulse && !reduce && (
        <span
          className={cn(
            "absolute inline-flex size-full animate-ping rounded-full opacity-60",
            color,
          )}
        />
      )}
      <span className={cn("relative inline-flex size-2 rounded-full", color)} />
    </span>
  );
}

const BADGE: Record<PublishView, { variant: "success" | "warning" | "canard"; labelKey: string }> =
  {
    published: { variant: "success", labelKey: "status.online" },
    changes: { variant: "warning", labelKey: "status.unpublishedChanges" },
    draft: { variant: "canard", labelKey: "status.DRAFT" },
  };

/**
 * Chip de statut (point + libellé via le primitive `Badge`) suivi d'un temps relatif
 * discret (« Publié il y a 2 h »). Le temps est masqué sous `lg` pour laisser respirer
 * la barre, et retiré côté mobile via `showSubtext={false}`.
 */
export function PublishStatusBadge({
  status,
  publishedAt,
  showSubtext = true,
}: {
  status: PublishBarState["status"];
  publishedAt: string | null;
  showSubtext?: boolean;
}) {
  const t = useTranslations("Dashboard");
  const locale = useLocale();
  const view = publishView(status, publishedAt);
  const rel = useRelativeTime(view === "draft" ? null : publishedAt, locale);
  const { variant, labelKey } = BADGE[view];

  const subtext =
    view === "draft"
      ? t("status.notYetOnline")
      : rel
        ? t(view === "published" ? "status.publishedAgo" : "status.lastPublished", { time: rel })
        : null;

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <Badge variant={variant} className="gap-1.5 py-1 pr-2.5 pl-2">
        <StatusDot view={view} />
        {t(labelKey)}
      </Badge>
      {showSubtext && subtext && (
        <span className="hidden truncate text-caption text-muted-foreground lg:inline">
          {subtext}
        </span>
      )}
    </div>
  );
}
