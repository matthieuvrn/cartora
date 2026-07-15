import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { restaurantMonogram } from "@/domain/restaurant/monogram";

type Props = {
  /** Nom du restaurant — source des initiales. */
  name: string;
  /** Taille + police de la pastille (ex. `size-8 text-xs`, `size-24 text-3xl`). */
  className?: string;
};

/**
 * Avatar carré de repli affiché **côté app** quand aucun logo n'est défini :
 * initiales du restaurant sur fond teinté (jamais imposé au menu public).
 * La taille et la police sont pilotées par `className` du parent.
 */
export function LogoMonogram({ name, className }: Props) {
  const monogram = restaurantMonogram(name);

  return (
    <div
      aria-hidden="true"
      className={cn(
        "flex items-center justify-center rounded-md bg-primary/10 font-semibold tracking-tight text-primary select-none",
        className,
      )}
    >
      {monogram || <ImageIcon className="size-1/3 opacity-60" />}
    </div>
  );
}
