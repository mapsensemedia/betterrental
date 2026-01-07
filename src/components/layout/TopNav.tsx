import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Menu, X, User, Search, Car, LogOut, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
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

    if (error) {
      toast({ title: "Sign out failed", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "Signed out" });
    setIsOpen(false);
    navigate("/", { replace: true });
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-200 bg-card border-b border-border"
    >
      <div className="container-page">
        <nav className="flex items-center justify-between h-16" aria-label="Primary">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5" aria-label="C2C Rental home">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
              <Car className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              C2C Rental
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                to={link.href}
                className={cn(
                  "text-sm font-medium transition-colors",
                  location.pathname === link.href
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/search">
                <Search className="w-4 h-4" />
                Search
              </Link>
            </Button>

            {user ? (
              <>
                <Button variant="default" size="sm" asChild>
                  <Link to="/dashboard">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <Button variant="default" size="sm" asChild>
                <Link to="/auth">
                  <User className="w-4 h-4" />
                  Sign In
                </Link>
              </Button>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 rounded-lg transition-colors text-foreground hover:bg-secondary"
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </nav>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-border bg-card rounded-b-xl animate-fade-in">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "px-4 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    location.pathname === link.href
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              ))}

              <div className="flex gap-2 px-4 pt-4 border-t border-border mt-2">
                <Button variant="outline" size="sm" className="flex-1" asChild>
                  <Link to="/search" onClick={() => setIsOpen(false)}>
                    Search
                  </Link>
                </Button>

                {user ? (
                  <>
                    <Button size="sm" className="flex-1" asChild>
                      <Link to="/dashboard" onClick={() => setIsOpen(false)}>
                        Dashboard
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleSignOut}>
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <Button size="sm" className="flex-1" asChild>
                    <Link to="/auth" onClick={() => setIsOpen(false)}>
                      Sign In
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
