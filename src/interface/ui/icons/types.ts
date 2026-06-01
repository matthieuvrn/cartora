import type { SVGProps } from "react";

/**
 * Icônes éditoriales custom Cartora (Features). ViewBox 24×24, stroke 1.75, `currentColor` :
 * la couleur suit le contexte (text-canard-600, text-sapin-600…). `className` propagé au <svg>.
 */
export type CartoraIconProps = Pick<SVGProps<SVGSVGElement>, "className">;
