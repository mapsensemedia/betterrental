import { Link } from "react-router-dom";
import { Mail, MapPin, Instagram, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import c2cLogo from "@/assets/c2c-logo-footer.png";

const footerLinks = {
  explore: [
  { href: "/search", label: "Browse Cars" },
  { href: "/locations", label: "Locations" }]

};

export function Footer() {
  return (
    <footer className="text-background bg-[#144d32]/[0.93]">
      <div className="container-page py-14 md:py-20">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center mb-5">
              <img src={c2cLogo} alt="C2C Rental" className="h-10 w-auto" />
            </Link>
            <p className="text-background/55 mb-8 max-w-sm text-sm leading-relaxed">
              Premium car rental across the Lower Mainland. Drive with confidence.
            </p>

            {/* Newsletter */}
            <div>
              <p className="text-sm font-semibold text-background/80 mb-3">Stay in the loop</p>
              <div className="flex gap-2 max-w-sm">
                <Input
                  type="email"
                  placeholder="Your email address"
                  className="h-11 bg-background/8 border-background/15 text-background placeholder:text-background/35 focus:border-background/40 focus:ring-1 focus:ring-background/20 rounded-[12px]" />

                <button
                  type="button"
                  className="shrink-0 h-11 w-11 flex items-center justify-center rounded-[12px] bg-background/15 hover:bg-background/25 transition-colors duration-200"
                  aria-label="Subscribe">

                  <Mail className="w-4 h-4 text-background" />
                </button>
              </div>
            </div>
          </div>

          {/* Links Column */}
          <div>
            <h4 className="font-semibold text-background/80 text-sm mb-5 uppercase tracking-wider">Explore</h4>
            <ul className="space-y-3">
              {footerLinks.explore.map((link) =>
              <li key={link.href}>
                  <Link
                  to={link.href}
                  className="text-background/55 hover:text-background transition-colors duration-200 text-sm">

                    {link.label}
                  </Link>
                </li>
              )}
            </ul>
          </div>
        </div>

        {/* Location */}
        <div className="mt-12 pt-8 border-t border-background/10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <span className="flex items-center gap-2 text-sm text-background/50">
              <MapPin className="w-4 h-4" />
              Surrey, BC
            </span>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-6 pt-6 border-t border-background/8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-background/35">
          <p>© {new Date().getFullYear()} C2C Rental. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-4">
              <a
                href="https://www.instagram.com/c2c.rental/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="text-background/45 hover:text-[#197149] transition-colors duration-200">

                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://www.facebook.com/people/C2C-Rental/61587985570949/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="text-background/45 hover:text-[#197149] transition-colors duration-200">

                <Facebook className="w-5 h-5" />
              </a>
            </div>
            <a href="/documents/terms-and-conditions.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-background/70 transition-colors duration-200">Terms</a>
            <a href="/documents/terms-and-conditions.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-background/70 transition-colors duration-200">Privacy</a>
            <a href="/documents/rental-agreement.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-background/70 transition-colors duration-200">Legal</a>
          </div>
        </div>
      </div>
    </footer>);

}