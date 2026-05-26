import { cn } from "@/lib/utils";

interface LandingSectionProps {
  id?: string;
  className?: string;
  innerClassName?: string;
  children: React.ReactNode;
}

export function LandingSection({ id, className, innerClassName, children }: LandingSectionProps) {
  return (
    <section id={id} className={cn("border-t border-border", className)}>
      <div className={cn("mx-auto max-w-6xl px-6 py-20", innerClassName)}>{children}</div>
    </section>
  );
}
