"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown, ChevronUp, Circle, CircleCheck } from "lucide-react";
import { AnimatePresence, LazyMotion, domAnimation, m, useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActivationChecklist } from "@/domain/restaurant/ActivationPolicy";
import { PopIn } from "./PopIn";

// cf. token CSS --ease-out-expo ; motion attend un tuple cubic-bezier (convention landing : inline).
const EASE_OUT_EXPO: [number, number, number, number] = [0.16, 1, 0.3, 1];

type Props = {
  checklist: ActivationChecklist;
  dismissAction: () => Promise<void>;
};

export function ActivationChecklistCard({ checklist, dismissAction }: Props) {
  const t = useTranslations("Dashboard.activation");
  const [collapsed, setCollapsed] = useState(false);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (checklist.allDone) {
      void dismissAction();
    }
  }, [checklist.allDone, dismissAction]);

  if (checklist.allDone) return null;

  const pct = Math.round((checklist.doneCount / checklist.totalCount) * 100);

  const stepsContent = (
    <CardContent>
      <ul className="space-y-2">
        {checklist.steps.map((step) => (
          <li key={step.id} className="flex items-center gap-2 text-sm">
            {step.done ? (
              <PopIn spring="bouncy">
                <CircleCheck className="size-4 text-success" aria-hidden />
              </PopIn>
            ) : (
              <Circle className="size-4 text-muted-foreground" aria-hidden />
            )}
            <span className={step.done ? "text-muted-foreground" : ""}>{t(`step.${step.id}`)}</span>
          </li>
        ))}
      </ul>
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
