"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, CircleCheck } from "lucide-react";
import { AnimatePresence, LazyMotion, domAnimation, m } from "motion/react";
import { Button } from "@/components/ui/button";
import { useReducedMotionSafe } from "@/hooks/use-reduced-motion-safe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivationChecklist } from "@/domain/restaurant/ActivationPolicy";
import { EASE_OUT_EXPO } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { PopIn } from "./PopIn";

type Props = {
  checklist: ActivationChecklist;
  dismissAction: () => Promise<void>;
};

export function ActivationChecklistCard({ checklist, dismissAction }: Props) {
  const t = useTranslations("Dashboard.activation");
  const [collapsed, setCollapsed] = useState(false);
  const reduce = useReducedMotionSafe();

  useEffect(() => {
    if (checklist.allDone) {
      void dismissAction();
    }
  }, [checklist.allDone, dismissAction]);

  if (checklist.allDone) return null;

  const pct = Math.round((checklist.doneCount / checklist.totalCount) * 100);
  // Prochaine étape à faire : mise en avant (numéro canard + libellé medium) — les autres
  // étapes restantes gardent un numéro neutre, les faites une coche sapin (succès).
  const nextIndex = checklist.steps.findIndex((step) => !step.done);

  const stepsContent = (
    <CardContent>
      <ol className="space-y-2">
        {checklist.steps.map((step, index) => {
          const isNext = index === nextIndex;
          return (
            <li key={step.id} className="flex items-center gap-2.5 text-sm">
              {step.done ? (
                <PopIn spring="bouncy">
                  <CircleCheck className="size-4 text-success" aria-hidden />
                </PopIn>
              ) : (
                <span
                  aria-hidden
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded-full border font-mono text-[0.625rem] leading-none tabular-nums",
                    isNext ? "border-primary text-primary" : "text-muted-foreground",
                  )}
                >
                  {index + 1}
                </span>
              )}
              <span className={cn(step.done && "text-muted-foreground", isNext && "font-medium")}>
                {t(`step.${step.id}`)}
              </span>
            </li>
          );
        })}
      </ol>
    </CardContent>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="display text-h3">{t("title")}</span>
          <span className="text-sm font-normal text-muted-foreground">
            {t("progress", { done: checklist.doneCount, total: checklist.totalCount })}
          </span>
        </CardTitle>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-primary transition-[width] duration-300 ease-[var(--ease-out-expo)]"
            style={{ width: `${pct}%` }}
            aria-hidden
          />
        </div>
      </CardHeader>
      {reduce ? (
        !collapsed && stepsContent
      ) : (
        <LazyMotion features={domAnimation} strict>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <m.div
                key="steps"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: EASE_OUT_EXPO }}
                style={{ overflow: "hidden" }}
              >
                {stepsContent}
              </m.div>
            )}
          </AnimatePresence>
        </LazyMotion>
      )}
      <CardContent className="pt-0">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed((v) => !v)}
          className="text-muted-foreground"
        >
          {collapsed ? (
            <>
              <ChevronDown className="size-4" />
              {t("expand")}
            </>
          ) : (
            <>
              <ChevronUp className="size-4" />
              {t("collapse")}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
