import type { ReactNode } from "react";
import { Navbar } from "./Navbar";

type AppLayoutProps = {
  children: ReactNode;
};

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-ink">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
