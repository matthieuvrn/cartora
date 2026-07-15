import Image from "next/image";
import { cn } from "@/lib/utils";

type Props = {
  src: string;
  alt: string;
  /** Taille + habillage du conteneur carré (ex. `mx-auto mb-4 h-14 w-14`). */
  className?: string;
  /** Hint `sizes` next/image, aligné sur la taille rendue (ex. `"56px"`). */
  sizes: string;
  priority?: boolean;
  /** Désactive l'optimisation next/image (aperçu éditeur post-upload cache-busté). */
  unoptimized?: boolean;
};

/**
 * Rendu unifié du logo restaurant, partagé par les 9 templates publics, l'aperçu
 * de l'éditeur et `LogoMenuPreview`. L'asset étant normalisé **carré** à l'upload
 * (cf. cropImage), `object-cover` remplit proprement sans letterbox. Chaque template
 * passe SA taille art-dirigée via `className` ; le traitement (carré, cover, coins
 * arrondis) reste identique partout — c'est ce qui aligne aperçu et rendu public.
 */
export function TemplateLogo({ src, alt, className, sizes, priority, unoptimized }: Props) {
  return (
    <div className={cn("relative overflow-hidden rounded-md", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        unoptimized={unoptimized}
        className="object-cover"
      />
    </div>
  );
}
