import { Logo } from "@/interface/ui/components/Logo";

type Props = {
  text: string;
};

export function Watermark({ text }: Props) {
  // Couleurs via `--menu-watermark-*` avec repli sur les tokens neutres `--muted` (rendu actuel
  // inchangé sur les templates clairs). Tokenisé surtout pour la fidélité de l'aperçu in-app sur
  // les skins sombres ; en prod le watermark est FREE-only et ne co-occurre pas avec un premium PRO.
  return (
    <div
      className="pointer-events-none mt-8 flex items-center justify-center rounded-lg py-2.5"
      style={{ backgroundColor: "var(--menu-watermark-bg, var(--muted))" }}
      aria-hidden="true"
    >
      <span
        className="inline-flex items-center gap-1.5 text-xs font-medium"
        style={{ color: "var(--menu-watermark-fg, var(--muted-foreground))" }}
      >
        {/* Mark en `currentColor` (ton mono) : la couleur suit `--menu-watermark-fg` du skin — la
            marque ne colore jamais le menu d'un restaurateur. */}
        <Logo variant="mark" tone="mono" className="h-3.5" />
        {text}
      </span>
    </div>
  );
}
