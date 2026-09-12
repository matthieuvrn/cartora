import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import { FAQ_ANSWER_TAGS, FAQ_ITEMS } from "@/interface/ui/landing/faqItems";

// (1) Toute balise <x> d'une réponse FAQ doit être connue de FAQ_ANSWER_TAGS (sinon next-intl rend
// la clé en prod) ; les mêmes balises doivent exister en FR et en EN (parité de structure, pas
// seulement de clés). (2) FAQ_GROUPS est la source unique des clés : aucune clé en double (deux
// Items Radix de même `value`), et l'ensemble = exactement les clés de Landing.faq.items dans les
// deux fichiers (une clé oubliée dans un groupe disparaîtrait de la page ET du JSON-LD FAQPage sans
// qu'aucun autre test ne rougisse). (3) Les 10 réponses sont compilées par intl-messageformat
// (t.rich / t.markup reçoivent toujours des valeurs) : un `'` ASCII, `{`, `}` ou `#` nu casserait
// la réponse en prod (clé émise) — les questions sont tenues à la même règle par cohérence.
const tagsOf = (s: string) => [...s.matchAll(/<(\w+)>/g)].map((m) => m[1]).sort();
const ICU_UNSAFE = /[\x27{}#]/;

describe("Landing.faq answers", () => {
  it("FAQ_ITEMS has no duplicate and matches the message keys exactly (fr and en)", () => {
    const sorted = [...FAQ_ITEMS].sort();
    expect(new Set(FAQ_ITEMS).size).toBe(FAQ_ITEMS.length);
    expect(sorted).toEqual(Object.keys(fr.Landing.faq.items).sort());
    expect(sorted).toEqual(Object.keys(en.Landing.faq.items).sort());
  });

  it.each(FAQ_ITEMS)("%s uses only known tags, identically in fr and en", (key) => {
    const frA = fr.Landing.faq.items[key].a;
    const enA = en.Landing.faq.items[key].a;
    for (const tag of [...tagsOf(frA), ...tagsOf(enA)]) expect(FAQ_ANSWER_TAGS).toContain(tag);
    expect(tagsOf(frA)).toEqual(tagsOf(enA));
  });

  it.each(FAQ_ITEMS)("%s contains no bare ICU character (' { } #) in fr or en", (key) => {
    const { q: frQ, a: frA } = fr.Landing.faq.items[key];
    const { q: enQ, a: enA } = en.Landing.faq.items[key];
    expect(frQ + frA + enQ + enA).not.toMatch(ICU_UNSAFE);
  });
});
