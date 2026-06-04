import { GeistMono } from "geist/font/mono";

// `theme-app` : scope de marque (canard/sand, Fraunces, focus, charts) en miroir de `.theme-cartora`
// de la landing — voir globals.css. `bg-background text-foreground` re-résout les tokens au niveau du
// scope (sinon le `text-foreground` du <body> reste figé sur la valeur :root). `data-app-shell` :
// marqueur de masquage du footer global, dashboard uniquement (les pages auth gardent leur footer).
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      data-app-shell
      className={`theme-app min-h-screen bg-background text-foreground ${GeistMono.variable}`}
    >
      {children}
    </div>
  );
}
