> ⚠️ **Dépôt publié à des fins d'évaluation — RNCP 39583 « Expert en développement logiciel » (YNOV).**
> Code **propriétaire, tous droits réservés** (voir [LICENSE](LICENSE)). Toute réutilisation,
> copie ou œuvre dérivée est interdite sans autorisation écrite préalable de l'auteur.

# Cartora

**SaaS de cartes de restaurant numériques accessibles par QR code.** Cartora permet à un
restaurateur, sans compétence technique, de créer une carte numérique et de la rendre accessible
à ses clients via un QR code posé sur la table.

Modèle _freemium_ : création gratuite (avec filigrane) → publication payante via Stripe
(FREE / STARTER / PRO).

---

## Fonctionnalités clés

- **Éditeur de carte** : catégories, articles (prix en centimes, badges), photos (upload direct par URL signée).
- **9 templates** de menu (2 de base + 7 skins premium PRO), couleurs de marque avec contraste AA imposé.
- **Multilingue** : contenu rédigé une fois en langue source, traduit en `fr/en/es/de/it` (auto-traduction DeepL en PRO), avec suivi de fraîcheur par champ.
- **Menu public** rendu serveur (RSC + ISR), responsive, sans authentification, via QR code.
- **Paiement** Stripe (3 tiers) + webhooks signés et idempotents.
- **Statistiques** de consultation (vues, appareils, distribution horaire) respectueuses du consentement CNIL/RGPD.

## Stack technique

| Domaine       | Choix                                        |
| ------------- | -------------------------------------------- |
| Framework     | Next.js 16 (App Router, RSC, Server Actions) |
| Langage       | TypeScript (strict)                          |
| UI            | React 19, Tailwind CSS 4, shadcn/ui (Radix)  |
| Données       | PostgreSQL (Supabase) via Prisma 7 + RLS     |
| Auth          | Supabase Auth                                |
| Paiement      | Stripe                                       |
| Observabilité | Sentry                                       |
| Tests         | Vitest                                       |
| CI/CD         | GitHub Actions → Vercel                      |

## Architecture

Architecture **hexagonale** (ports & adapters) à sens de dépendance unique, vérifiée
automatiquement par ESLint (une violation casse la CI) :

```
Domain → Application → Infrastructure → Interface → App
```

- **Domain** : logique métier pure, sans aucun framework.
- **Application** : use cases + interfaces (ports).
- **Infrastructure** : adapters (Prisma, Supabase, Stripe…).
- **Interface** : composants UI réutilisables et contrôleurs.
- **App** : pages/routes Next.js, _composition root_ (injection de dépendances).

## Démarrage

```bash
pnpm install          # postinstall exécute `prisma generate`
cp .env.example .env.local   # renseigner les variables (voir .env.example)
pnpm dev              # serveur de développement (Turbopack)
```

## Scripts principaux

```bash
pnpm dev            # serveur de développement
pnpm build          # build de production
pnpm lint           # ESLint (+ jsx-a11y, zones d'architecture)
pnpm typecheck      # vérification des types (tsc --noEmit)
pnpm test           # tests unitaires (Vitest)
pnpm test:coverage  # tests + couverture v8
pnpm format:check   # contrôle Prettier
```

## Qualité & sécurité

- **CI bloquante** : format, lint (+ accessibilité), types, tests, build sans secret réel.
- **Audit de dépendances** (`pnpm audit --prod --audit-level=high`) et **scan de secrets** (gitleaks) en CI.
- **Couverture métier** ≈ 90 % (couches Domaine + Application).
- **En-têtes durcis** : CSP stricte, HSTS, `X-Frame-Options: DENY`, `Permissions-Policy`.

---

© 2026 Matthieu Vernier — Tous droits réservés. Projet réalisé dans le cadre de la certification
RNCP 39583. Voir [LICENSE](LICENSE).
