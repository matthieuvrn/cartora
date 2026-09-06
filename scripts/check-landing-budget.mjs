#!/usr/bin/env node
/**
 * Budget perf CI — JS initial de la route "/" (landing).
 *
 * Mesure ce qu'un visiteur télécharge réellement : démarre `next start` sur le build
 * fraîchement produit, récupère le HTML de la landing, et somme le gzip de chaque chunk
 * JS référencé (balises <script> + chunks du payload RSC — les import() dynamiques,
 * comme le SDK Sentry différé, n'y figurent pas : c'est voulu, ils ne pèsent pas sur
 * le chargement initial). Échoue au-delà de LANDING_JS_BUDGET_KB.
 *
 * Les balises `<script noModule>` (polyfills core-js de Next, ~39 KB gz) sont EXCLUES :
 * un navigateur qui comprend les modules ES — tous ceux que Cartora supporte — ne les
 * télécharge jamais. Les compter (jusqu'au 2026-09-06) gonflait la mesure de 292 à… 292 KB
 * affichés pour ~253 KB réellement chargés.
 *
 * Seuil : 300 KB gzip. Avant la passe landing de 2026-09 la question était de le relever ;
 * la correction noModule ci-dessus a rendu ~47 KB de marge réelle (253/300), donc le seuil
 * est resté à 300. Il bloque toute régression silencieuse. Ne JAMAIS le remonter pour faire
 * passer un build : c'est le signal qu'un import client doit sauter. À RESSERRER dès la passe
 * livrée (≈ 270) — cible long terme : 150 KB gzip (niveau top-tier SaaS).
 * Usage : pnpm perf:landing (après pnpm build). CI : job checks, après le build.
 */
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";

const PORT = Number(process.env.LANDING_BUDGET_PORT ?? 4311);
const BUDGET_KB = Number(process.env.LANDING_JS_BUDGET_KB ?? 300);
const root = process.cwd();

const server = spawn("node", ["node_modules/next/dist/bin/next", "start", "-p", String(PORT)], {
  cwd: root,
  stdio: "ignore",
  env: process.env,
});

async function fetchLandingHtml(attempts = 60) {
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/`);
      if (res.ok) return res.text();
    } catch {
      // serveur pas encore prêt
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`next start n'a jamais répondu sur le port ${PORT}`);
}

try {
  // Garde-fou statique : `/` et `/en` DOIVENT rester prérendues (○). Une lecture de
  // cookies()/headers() glissée dans leur arbre les repasserait en dynamique (ƒ) —
  // perte du cache CDN, TTFB dégradé — sans rien casser d'autre : on échoue ici.
  const prerender = JSON.parse(
    readFileSync(path.join(root, ".next/prerender-manifest.json"), "utf8"),
  );
  for (const route of ["/", "/en"]) {
    if (!prerender.routes?.[route]) {
      throw new Error(
        `La route "${route}" n'est plus prérendue statique — une API dynamique (cookies()/headers()) a dû entrer dans son arbre. Voir src/app/page.tsx / locale-shell.tsx.`,
      );
    }
  }
  console.log("✓ / et /en prérendues statiques");

  const html = await fetchLandingHtml();
  // Polyfills `noModule` : jamais chargés par un navigateur moderne — retirés AVANT l'extraction
  // (le même chemin réapparaît dans le payload RSC : on l'exclut par nom, pas par balise).
  const noModule = new Set();
  for (const tag of html.matchAll(/<script\b[^>]*\bnomodule\b[^>]*>/gi)) {
    const src = tag[0].match(/src="([^"]+)"/i);
    if (src) noModule.add(src[1]);
  }
  const refs = new Set();
  for (const match of html.matchAll(/\/_next\/static\/[^"'\s\\]+?\.js\b/g)) {
    if (!noModule.has(match[0])) refs.add(match[0]);
  }
  if (noModule.size) {
    console.log(`  (${noModule.size} script noModule ignoré·s : ${[...noModule].join(", ")})`);
  }
  if (refs.size === 0) {
    throw new Error("Aucun chunk JS trouvé dans le HTML de la landing — extraction cassée ?");
  }

  let total = 0;
  const rows = [];
  for (const ref of refs) {
    const file = path.join(root, ".next", ref.replace("/_next/", ""));
    const gz = gzipSync(readFileSync(file)).length;
    total += gz;
    rows.push([gz, ref]);
  }
  rows.sort((a, b) => b[0] - a[0]);

  const totalKb = total / 1024;
  console.log(
    `Landing "/" — ${refs.size} chunks JS, ${totalKb.toFixed(0)} KB gzip (budget ${BUDGET_KB} KB)`,
  );
  for (const [gz, ref] of rows.slice(0, 6)) {
    console.log(`  ${(gz / 1024).toFixed(0).padStart(4)} KB  ${ref}`);
  }

  if (totalKb > BUDGET_KB) {
    console.error(
      `\n✖ Budget dépassé de ${(totalKb - BUDGET_KB).toFixed(0)} KB gzip — la landing ne doit pas regrossir silencieusement.`,
    );
    process.exitCode = 1;
  } else {
    console.log(`✓ Sous le budget (marge ${(BUDGET_KB - totalKb).toFixed(0)} KB)`);
  }
} finally {
  server.kill("SIGTERM");
}
