import { GeistMono } from "geist/font/mono";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div className={GeistMono.variable}>{children}</div>;
}
