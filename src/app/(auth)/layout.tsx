// `theme-app` : scope de marque (cf. globals.css). Fond `bg-background` = sand plein. Pas de
// `data-app-shell` ici → login/signup conservent le footer global (liens légaux + cookies).
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="theme-app min-h-screen flex items-center justify-center bg-background px-4">
      {children}
    </div>
  );
}
