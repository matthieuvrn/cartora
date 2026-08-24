import { LocaleShell } from "@/app/locale-shell";

// `theme-app` : scope de marque (cf. globals.css). Scène NUIT (DA « Nuit de service ») :
// l'inscription est la continuité du CTA final nuit de la landing — même recette (grille
// hairline + glow canard central + grain), le remap `.section-nuit` inverse cartes/inputs/
// boutons tout seul. Un seul glow, pas de contrepoint corail : le climax du viewport est le
// bouton submit (variant cta), le point corail de l'eyebrow suffit. Surface SANS overlay
// porté (aucun Dialog/Select ici) — condition de viabilité des scènes nuit in-app. Pas de
// `data-app-shell` → login/signup conservent le footer global (liens légaux + cookies).
// <LocaleShell> : provider i18n cookie + footer + bannière (cf. src/app/locale-shell.tsx).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <LocaleShell>
      <div className="theme-app section-nuit texture-grain relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10 text-foreground">
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <div className="bg-grid-nuit absolute inset-0" />
          <div
            className="absolute top-1/2 left-1/2 h-[560px] w-[820px] -translate-x-1/2 -translate-y-1/2"
            style={{
              background:
                "radial-gradient(ellipse 50% 50% at 50% 50%, oklch(0.42 0.058 198 / 0.28), transparent 70%)",
            }}
          />
        </div>
        {children}
      </div>
    </LocaleShell>
  );
}
