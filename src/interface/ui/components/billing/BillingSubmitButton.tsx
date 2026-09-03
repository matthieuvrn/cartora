"use client";

import type { ComponentProps, ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  label: string;
  icon?: ReactNode;
  variant?: ComponentProps<typeof Button>["variant"];
  size?: ComponentProps<typeof Button>["size"];
  className?: string;
};

/**
 * Submit des formulaires « hand-off Stripe » (Checkout, portail) : état pending via
 * `useFormStatus` — le seul feedback possible avant la redirection vers Stripe.
 */
export function BillingSubmitButton({
  label,
  icon,
  variant = "outline",
  size = "default",
  className,
}: Props) {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant={variant}
      size={size}
      className={className}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? <Loader2 className="animate-spin" /> : icon}
      {label}
    </Button>
  );
}
