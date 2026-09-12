"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { LandingSection } from "@/interface/ui/landing/LandingSection";
import { RevealHeading } from "@/interface/ui/landing/Reveal";
import { StaggerGroup, StaggerItem } from "@/interface/ui/landing/StaggerReveal";
import {
  FAQ_CONTACT_EMAIL,
  FAQ_GROUPS,
  FAQ_GROUP_OF,
  FAQ_NUMBER,
  type FaqAnswerTag,
  type FaqItemKey,
} from "@/interface/ui/landing/faqItems";
import { trackLandingEvent } from "@/interface/ui/landing/trackLandingEvent";

// Liens : canard = interaction. Chaînes BRUTES (jamais passées par cn()), sans `no-underline`
// (dans la feuille Tailwind 4, `.no-underline` est émis AVANT `.underline` : à spécificité égale,
// `underline` gagnerait de toute façon). Soulignement PERMANENT partout : canard-700 sur sand-700
// ≈ 1,14:1, la couleur seule ne distingue pas un lien de sa phrase (WCAG 1.4.1 / G183) —
// hairline canard-300 au repos, canard-700 au survol.
const ANSWER_LINK =
  "text-canard-700 underline decoration-canard-300 underline-offset-4 transition-colors hover:text-canard-900 hover:decoration-canard-700";
// Registre mono de l'adresse : balise <email> dans une réponse ET bloc « Une autre question ? ».
const MONO_LINK = `${ANSWER_LINK} font-mono text-[0.9em]`;

/**
 * FAQ éditoriale 2 colonnes (DA 2026) : colonne gauche sticky (thread + kicker + titre display
 * révélé par RevealHeading + contact), à droite dix questions numérotées en trois sous-blocs,
 * hairlines sand-200, un seul <Accordion type="single"> (une réponse ouverte à la fois, flèches ↑↓
 * Home/End sur les 10). État ouvert affirmé en canard (numéro canard-700, question canard-800,
 * pastille remplie canard-950 avec « + » porcelaine pivoté à 45°, filet gauche canard-300 sur la
 * réponse) — aucun corail hors le point du kicker. Reveal : StaggerGroup PAR SOUS-BLOC (chacun à
 * son scroll-in) ; la section est enveloppée par MotionSection (fade seul, règle du double y).
 * Tailles de police sur des spans/p à className BRUT : tailwind-merge (cn) supprime
 * `text-h3`/`text-body` dès qu'une couleur `text-*` suit dans le même appel (vérifié 2026-09-12
 * — le cn() étendu couvre désormais les tokens maison, mais les chaînes brutes restent la forme
 * la plus sûre ici). La
 * pastille pivote via la propriété `rotate` (Tailwind 4) : la liste de transition nomme `rotate`,
 * pas `transform`.
 */
export function LandingFaqV2() {
  const t = useTranslations("Landing.faq");
  const locale = useLocale();

  const answerTags: Record<FaqAnswerTag, (chunks: ReactNode) => ReactNode> = {
    email: (chunks) => (
      <a href={`mailto:${FAQ_CONTACT_EMAIL}`} className={MONO_LINK}>
        {chunks}
      </a>
    ),
    pricing: (chunks) => (
      <a href="#pricing" className={ANSWER_LINK}>
        {chunks}
      </a>
    ),
    privacyLink: (chunks) => (
      <Link href="/confidentialite" className={ANSWER_LINK}>
        {chunks}
      </Link>
    ),
  };

  const handleValueChange = (value: string) => {
    if (!value) return;
    const key = value as FaqItemKey;
    trackLandingEvent({
      event: "faq_opened",
      locale,
      metadata: { question: key, group: FAQ_GROUP_OF[key] },
    });
  };

  // Issue de secours (mailto) : colonne sticky dès lg, APRÈS les questions sous lg — proposer le
  // contact avant même d'avoir lu la FAQ inversait l'ordre de lecture mobile.
  const contact = (
    <p className="text-body text-sand-700">
      {t("contactLabel")}{" "}
      <a href={`mailto:${FAQ_CONTACT_EMAIL}`} className={MONO_LINK}>
        {FAQ_CONTACT_EMAIL}
      </a>
    </p>
  );

  return (
    <LandingSection id="faq" ariaLabelledBy="faq-heading">
      <div className="grid gap-12 lg:grid-cols-12">
        {/* Le sticky est sur ce <header>, jamais sur le h2 : le transform du reveal (enfant) ne le
            touche pas, et motion émet `transform: none` en fin d'entrée. */}
        <header className="self-start lg:sticky lg:top-24 lg:col-span-5">
          <span aria-hidden="true" className="eyebrow-thread" />
          <p className="eyebrow">
            <span className="eyebrow-dot" aria-hidden="true" />
            {t("kicker")}
          </p>
          <RevealHeading id="faq-heading" className="mt-5 text-display-lg">
            {t("title")}
          </RevealHeading>
          <p className="mt-5 max-w-[28rem] text-lead text-sand-700">{t("subtitle")}</p>
          <div className="mt-8 hidden lg:block">{contact}</div>
        </header>

        <Accordion
          type="single"
          collapsible
          onValueChange={handleValueChange}
          className="lg:col-span-7"
        >
          {FAQ_GROUPS.map((group) => {
            const labelId = `faq-group-${group.key}`;
            return (
              // role="group" + aria-labelledby : un lecteur d'écran annonce « Facturation, groupe »
              // sans ajouter de niveau de titre (les questions sont déjà des <h3> Radix sous le h2).
              <div
                key={group.key}
                role="group"
                aria-labelledby={labelId}
                className="not-first:mt-10"
              >
                <StaggerGroup>
                  <StaggerItem>
                    <p id={labelId} className="eyebrow pb-3">
                      {t(`groups.${group.key}`)}
                    </p>
                  </StaggerItem>
                  {group.items.map((key) => (
                    <StaggerItem key={key}>
                      {/* `last:border-b` annule le `last:border-b-0` de la primitive : chaque Item
                          est l'unique enfant de son StaggerItem, `last:` matcherait TOUTES les
                          rangées. Hairline sous chaque question, y compris la dernière (règle de
                          clôture avant le bloc contact mobile). */}
                      <AccordionItem value={key} className="border-sand-200 last:border-b">
                        <AccordionTrigger className="group gap-4 py-5 hover:no-underline [&>svg]:hidden">
                          <span
                            aria-hidden="true"
                            className="w-7 shrink-0 font-mono text-micro leading-[1.65rem] tabular-nums text-sand-600 transition-colors duration-200 group-data-[state=open]:text-canard-700"
                          >
                            {FAQ_NUMBER[key]}
                          </span>
                          <span className="flex-1 text-body-lg font-medium text-canard-950 transition-colors duration-200 group-hover:text-canard-800 group-data-[state=open]:text-canard-800">
                            {t(`items.${key}.q`)}
                          </span>
                          {/* Pastille +/× : remplace le chevron par défaut (masqué ci-dessus). -mt-[3px]
                              recentre ses 32 px sur la première ligne de 26,4 px (items-start).
                              `rotate-45` = propriété `rotate` (Tailwind 4) → la liste de transition
                              DOIT contenir `rotate` ; `transform` seul ne ferait pas tourner le « + »
                              (saut sec). */}
                          <span
                            aria-hidden="true"
                            className="-mt-[3px] flex size-8 shrink-0 items-center justify-center rounded-full border border-sand-300 text-sand-600 transition-[rotate,background-color,border-color,color] duration-200 ease-[var(--ease-snappy)] group-hover:border-canard-300 group-data-[state=open]:rotate-45 group-data-[state=open]:border-canard-950 group-data-[state=open]:bg-canard-950 group-data-[state=open]:text-sand-50"
                          >
                            <Plus className="size-4 stroke-[1.75]" />
                          </span>
                        </AccordionTrigger>
                        <AccordionContent className="pt-1 pb-6">
                          {/* Filet gauche canard-300. Sous md : filet à x = 0, texte à 17 px (1 px
                              + pl-4). Dès md : le TEXTE de la réponse s'aligne sur le texte de la
                              question (44 px = w-7 28 + gap-4 16) → ml-7 (28) + 1 px de bordure +
                              pl-[15px] = 44 ; le filet tombe donc à x = 28, dans la gouttière entre
                              la colonne du numéro et le texte. Un seul axe de texte par rangée.
                              `t.rich` reçoit TOUJOURS les 3 balises (ICU ignore les valeurs non
                              utilisées) — jamais un sous-ensemble, sinon drift silencieux. */}
                          <p className="max-w-prose border-l border-canard-300 pl-4 text-body text-sand-700 md:ml-7 md:pl-[15px]">
                            {t.rich(`items.${key}.a`, answerTags)}
                          </p>
                        </AccordionContent>
                      </AccordionItem>
                    </StaggerItem>
                  ))}
                </StaggerGroup>
              </div>
            );
          })}
        </Accordion>
        <div className="-mt-4 lg:hidden">{contact}</div>
      </div>
    </LandingSection>
  );
}
