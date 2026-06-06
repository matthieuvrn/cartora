import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "@/lib/utils";

// Pastille de statut Cartora. Forme pill (`rounded-full`) — convention de l'app (badges items,
// statut menu, billing…), pas le `rounded-md` shadcn par défaut. Variants token-driven : corrects
// sous `.theme-app`/`.theme-cartora`, neutres sur `:root` (canard/sapin sont des utilities additives
// identiques partout, success/warning/danger/info pointent vers les sémantiques de globals.css).
const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap [&_svg]:pointer-events-none [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-secondary text-secondary-foreground",
        canard: "bg-canard-100 text-canard-700",
        sapin: "bg-sapin-100 text-sapin-700",
        success: "bg-success/15 text-success",
        warning: "bg-warning/15 text-warning",
        danger: "bg-destructive/10 text-destructive",
        info: "bg-info/15 text-info",
        outline: "border text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot.Root : "span";

  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
