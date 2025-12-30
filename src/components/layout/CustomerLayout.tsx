import { ReactNode } from "react";
import { TopNav } from "./TopNav";
import { Footer } from "./Footer";

interface CustomerLayoutProps {
  children: ReactNode;
  transparentNav?: boolean;
}

export function CustomerLayout({ children, transparentNav = false }: CustomerLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav transparent={transparentNav} />
      <main className={transparentNav ? "" : "pt-20"}>
        {children}
      </main>
      <Footer />
    </div>
  );
}
