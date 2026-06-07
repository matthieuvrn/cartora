import Link from "next/link";
import { LocaleSwitcher } from "@/interface/ui/components/LocaleSwitcher";
import { Logo } from "@/interface/ui/components/Logo";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-app min-h-screen bg-background">
      <header className="border-b bg-background px-6 py-4">
        <div className="mx-auto flex max-w-3xl items-center justify-between">
          <Link href="/" aria-label="Cartora">
            <Logo variant="lockup" className="h-7" />
          </Link>
          <LocaleSwitcher />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-10">{children}</main>
    </div>
  );
}
