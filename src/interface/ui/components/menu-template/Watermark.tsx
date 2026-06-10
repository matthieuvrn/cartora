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
        className="text-xs font-medium"
        style={{ color: "var(--menu-watermark-fg, var(--muted-foreground))" }}
      >
        {text}
      </span>
    </div>
  );
}
