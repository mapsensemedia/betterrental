import { ReactNode } from "react";
import { TopNav } from "./TopNav";
import { Footer } from "./Footer";

interface CustomerLayoutProps {
  children: ReactNode;
}

export function CustomerLayout({ children }: CustomerLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <TopNav />
      <main className="pt-16">
        {children}
      </main>
      <Footer />
    </div>
  );
}
