import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, User, LogOut, LayoutDashboard } from "lucide-react";
import c2cLogo from "@/assets/c2c-logo.png";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/search", label: "Browse Cars" },
  { href: "/locations", label: "Locations" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function TopNav() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();

    // Treat "session_not_found" as a successful logout - session already expired
    if (error && !error.message?.toLowerCase().includes("session")) {
      toast({ title: "Sign out failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Signed out" });
    setIsOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#FBFAF8] border-b border-black/5 transition-all duration-200">
      <div className="max-w-[1200px] mx-auto w-full px-4 md:px-6">
        <nav className="flex items-center justify-between h-16 md:h-[72px]" aria-label="Primary">
          {/* Logo */}
          <Link to="/" className="flex items-center" aria-label="C2C Rental home">
            <img src={c2cLogo} alt="C2C Rental" className="h-9 md:h-10 w-auto" />
          </Link>

          {/* Desktop Navigation - Hidden on tablet, show on lg+ */}
          <div className="hidden lg:flex items-center gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "relative text-[15px] font-medium transition-colors duration-200 whitespace-nowrap",
                  location.pathname === link.href
                    ? "text-zinc-950 after:absolute after:bottom-[-4px] after:left-0 after:h-[2px] after:w-full after:rounded-full after:bg-[#2F5D46] after:content-['']"
                    : "text-zinc-700 hover:text-zinc-950",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Actions - Hidden on tablet, show on lg+ */}
          <div className="hidden lg:flex items-center gap-3">
            <Link
              to="/search"
              className="text-[15px] font-medium text-zinc-700 hover:text-zinc-950 transition-colors duration-200"
            >
              Search
            </Link>

            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="flex items-center gap-2 h-10 px-5 rounded-full bg-zinc-900 text-white text-[15px] font-medium hover:bg-zinc-800 transition-colors duration-200"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span>Dashboard</span>
                </Link>
                <button
                  onClick={handleSignOut}
                  className="h-10 w-10 rounded-full border border-black/10 hover:border-black/20 flex items-center justify-center transition duration-200 text-zinc-700 hover:text-zinc-950"
                  aria-label="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                className="flex items-center gap-2 h-10 px-5 rounded-full bg-zinc-900 text-white text-[15px] font-medium hover:bg-zinc-800 transition-colors duration-200"
              >
                <User className="w-4 h-4" />
                <span>Sign In</span>
              </Link>
            )}
          </div>

          {/* Mobile/Tablet Menu Button - Show until lg breakpoint */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden h-11 w-11 flex items-center justify-center rounded-full transition-colors text-zinc-700 hover:bg-black/5"
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>

        {/* Mobile/Tablet Menu */}
        {isOpen && (
          <div className="lg:hidden py-4 border-t border-black/5 bg-[#FBFAF8] rounded-b-xl animate-fade-in">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "px-4 py-2.5 rounded-lg text-[15px] font-medium transition-colors duration-200",
                    location.pathname === link.href
                      ? "bg-black/5 text-zinc-950"
                      : "text-zinc-700 hover:bg-black/5 hover:text-zinc-950",
                  )}
                >
                  {link.label}
                </Link>
              ))}

              <div className="flex gap-2 px-4 pt-4 border-t border-black/5 mt-2">
                <Link
                  to="/search"
                  onClick={() => setIsOpen(false)}
                  className="flex-1 flex items-center justify-center h-10 rounded-full border border-black/10 text-[15px] font-medium text-zinc-700 hover:text-zinc-950 hover:border-black/20 transition-colors duration-200"
                >
                  Search
                </Link>

                {user ? (
                  <>
                    <Link
                      to="/dashboard"
                      onClick={() => setIsOpen(false)}
                      className="flex-1 flex items-center justify-center gap-2 h-10 rounded-full bg-zinc-900 text-white text-[15px] font-medium hover:bg-zinc-800 transition-colors duration-200"
                    >
                      Dashboard
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="h-10 w-10 rounded-full border border-black/10 hover:border-black/20 flex items-center justify-center transition duration-200 text-zinc-700"
                      aria-label="Sign out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <Link
                    to="/auth"
                    onClick={() => setIsOpen(false)}
                    className="flex-1 flex items-center justify-center gap-2 h-10 rounded-full bg-zinc-900 text-white text-[15px] font-medium hover:bg-zinc-800 transition-colors duration-200"
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
