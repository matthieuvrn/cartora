// Plain (non-"use client") module : consommé par LandingPageContent (JSON-LD, serveur),
// LandingFaqV2 (client) et src/i18n/faq-answer-tags.test.ts (vitest, node).

export type FaqGroupKey = "billing" | "service" | "data";

/**
 * SOURCE UNIQUE des clés et de l'ordre. Regroupement éditorial (moodboard 2026) : trois registres,
 * ordre de lecture d'un restaurateur qui hésite — d'abord « combien / quand je paie », puis « ça
 * marche en salle ? », puis « mes données, qui me répond ». Numérotation continue 01→10 sur
 * FAQ_ITEMS (dérivé). `FaqItemKey` est DÉRIVÉ de ce tableau : une clé absente d'ici n'existe pas
 * pour TypeScript (le test faq-answer-tags compare en plus l'ensemble aux clés des messages, et
 * refuse les doublons — un doublon donnerait deux Items Radix de même `value`). Les clés d'items ne
 * changent pas : `faq_opened.metadata.question` reste comparable.
 */
export const FAQ_GROUPS = [
  { key: "billing", items: ["noCc", "commitment", "cancel"] },
  { key: "service", items: ["qrAgeingClients", "qrPrinting", "allergens", "bilingual"] },
  { key: "data", items: ["dataHosting", "supportFr", "multiRestaurants"] },
] as const satisfies readonly { key: FaqGroupKey; items: readonly string[] }[];

/** Union littérale dérivée des groupes — jamais saisie à la main. */
export type FaqItemKey = (typeof FAQ_GROUPS)[number]["items"][number];

/** Ordre plat = ordre d'affichage = ordre du JSON-LD FAQPage. */
export const FAQ_ITEMS: readonly FaqItemKey[] = FAQ_GROUPS.flatMap((g) => g.items);

/** « 01 » … « 10 » — index continu sur les groupes. */
export const FAQ_NUMBER: Readonly<Record<FaqItemKey, string>> = Object.fromEntries(
  FAQ_ITEMS.map((key, i) => [key, String(i + 1).padStart(2, "0")]),
) as Record<FaqItemKey, string>;

export const FAQ_GROUP_OF: Readonly<Record<FaqItemKey, FaqGroupKey>> = Object.fromEntries(
  FAQ_GROUPS.flatMap((g) => g.items.map((k) => [k, g.key])),
) as Record<FaqItemKey, FaqGroupKey>;

/**
 * Balises ICU autorisées dans `Landing.faq.items.*.a`. Source UNIQUE pour le client (`t.rich`,
 * rend des liens) ET le JSON-LD serveur (`t.markup`, fonctions identité = texte nu). Une balise
 * présente dans un message mais absente de cette liste ferait retomber next-intl sur la CLÉ
 * (« Landing.faq.items.noCc.a ») en prod, sans erreur CI — d'où le test src/i18n/faq-answer-tags.test.ts.
 */
export const FAQ_ANSWER_TAGS = ["email", "pricing", "privacyLink"] as const;
export type FaqAnswerTag = (typeof FAQ_ANSWER_TAGS)[number];

/**
 * Adresse de contact : hrefs `mailto:` de la FAQ (bloc « Une autre question ? » + balise <email>)
 * et `contactPoint.email` du JSON-LD Organization. Le TEXTE visible dans les réponses
 * (`supportFr.a`, `multiRestaurants.a`) reste un littéral dans les messages : c'est du contenu
 * traduit, et `t.markup` a besoin de la chaîne complète pour le JSON-LD FAQPage.
 */
export const FAQ_CONTACT_EMAIL = "contact@cartora.app";
