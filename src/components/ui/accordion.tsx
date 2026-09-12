"use client";

import * as React from "react";
import { ChevronDownIcon } from "lucide-react";
import { Accordion as AccordionPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/**
 * Primitive shadcn Accordion — consommateur UNIQUE = `LandingFaqV2` (landing). Timing et focus
 * alignés sur la DA landing (2026-09) : anneau de focus de marque (globals `@layer base`,
 * 2 px sand-50 + 4 px canard-600) au lieu des utilitaires `focus-visible:ring-*` shadcn ;
 * ouverture 300 ms / fermeture 200 ms sur `--ease-out-expo` ; plus de `text-sm` hardcodé sur le
 * Content (les tailles vivent chez le consommateur). Le className EXTERNE du Content est une
 * CHAÎNE BRUTE (deux durées de variantes différentes, non mergeable par tailwind-merge — voir
 * `AccordionContent`). API publique inchangée : Accordion / AccordionItem / AccordionTrigger /
 * AccordionContent, mêmes props que la primitive Radix.
 */
function Accordion({ ...props }: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />;
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn("border-b last:border-b-0", className)}
      {...props}
    />
  );
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      {/* Sans les 3 utilitaires de focus shadcn (`focus-visible:border-ring`, `ring-[3px]`,
          `ring-ring/50`) pour laisser parler l'anneau de marque (globals.css @layer base). Un
          `ring-0` laisserait un focus SANS anneau : la box-shadow utilitaire gagnerait encore
          sur la règle de base. */}
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          "flex flex-1 items-start justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-all outline-none hover:underline disabled:pointer-events-none disabled:opacity-50 [&[data-state=open]>svg]:rotate-180",
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDownIcon className="pointer-events-none size-4 shrink-0 translate-y-0.5 text-muted-foreground transition-transform duration-200" />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  );
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    // (a) plus de `text-sm` hardcodé (il forçait 14 px sur les réponses) ; (b) hauteur re-timée :
    // ouverture 300 ms ease-out-expo, fermeture 200 ms (Tailwind 4.2 émet --tw-duration /
    // --tw-ease, lus par les keyframes accordion-down/up de tw-animate-css ; ces variables
    // n'héritent pas → elles DOIVENT être sur ce Content) ; (c) la div interne fond en opacité à
    // l'ouverture (`in-data-[state=open]:` = ancêtre en data-state=open — Item/h3/Content
    // partagent le même état). Fermeture : hauteur seule (accordion-up), sans fondu.
    // Le className EXTERNE reste une CHAÎNE BRUTE : il porte deux durées de variantes différentes
    // (`duration-200` fermé, `data-[state=open]:duration-300` ouvert — l'ouvert gagne par
    // spécificité de l'attribut) ; passé par cn() avec un `duration-*` consommateur, tailwind-merge
    // ne garderait que le dernier de sa variante et supprimerait le timing de fermeture. Ne JAMAIS
    // exposer `className` sur l'élément Content ; seule la div interne passe par cn().
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className="overflow-hidden duration-200 ease-[var(--ease-out-expo)] data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down data-[state=open]:duration-300"
      {...props}
    >
      <div
        className={cn(
          "pt-0 pb-4 duration-300 ease-[var(--ease-out-expo)] in-data-[state=open]:animate-in in-data-[state=open]:fade-in-0",
          className,
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Content>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
