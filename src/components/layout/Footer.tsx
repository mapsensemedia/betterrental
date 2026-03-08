import { Link } from "react-router-dom";
import { Mail, MapPin, Instagram, Facebook, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import c2cLogo from "@/assets/c2c-logo-footer.png";

const footerLinks = {
  explore: [
    { href: "/search", label: "Browse Cars" },
    { href: "/locations", label: "Locations" },
  ],
  serviceAreas: [
    { href: "/surrey", label: "Car Rental in Surrey, BC" },
    { href: "/langley", label: "Car Rental in Langley, BC" },
    { href: "/abbotsford", label: "Car Rental in Abbotsford, BC" },
  ],
  company: [
    { href: "/about", label: "About C2C Rental" },
    { href: "/contact", label: "Contact Us" },
    { href: "/search", label: "How It Works" },
    { href: "/surrey#requirements", label: "Insurance & Requirements" },
  ],
};

export function Footer() {
  return (
    <footer className="text-background bg-[#144d32]/[0.93]">
      <div className="container-page py-14 md:py-20">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-1">
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
                  className="h-11 bg-background/8 border-background/15 text-background placeholder:text-background/35 focus:border-background/40 focus:ring-1 focus:ring-background/20 rounded-[12px]"
                />
                <button
                  type="button"
                  className="shrink-0 h-11 w-11 flex items-center justify-center rounded-[12px] bg-background/15 hover:bg-background/25 transition-colors duration-200"
                  aria-label="Subscribe"
                >
                  <Mail className="w-4 h-4 text-background" />
                </button>
              </div>
            </div>
          </div>

          {/* Service Areas Column */}
          <div>
            <h4 className="font-semibold text-background/80 text-sm mb-5 uppercase tracking-wider">Service Areas</h4>
            <ul className="space-y-3">
              {footerLinks.serviceAreas.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-background/55 hover:text-background transition-colors duration-200 text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Column */}
          <div>
            <h4 className="font-semibold text-background/80 text-sm mb-5 uppercase tracking-wider">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-background/55 hover:text-background transition-colors duration-200 text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Explore Column */}
          <div>
            <h4 className="font-semibold text-background/80 text-sm mb-5 uppercase tracking-wider">Explore</h4>
            <ul className="space-y-3">
              {footerLinks.explore.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-background/55 hover:text-background transition-colors duration-200 text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* NAP Block */}
        <div className="mt-12 pt-8 border-t border-background/10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-background/60">
              <span className="font-medium text-background/80">C2C Rental</span>
              <span className="hidden md:inline">|</span>
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                Surrey, BC
              </span>
              <span className="hidden md:inline">|</span>
              <a href="tel:+16043300205" className="flex items-center gap-1.5 hover:text-background transition-colors">
                <Phone className="w-3.5 h-3.5" />
                +1-604-330-0205
              </a>
              <span className="hidden md:inline">|</span>
              <a href="https://c2crental.com" className="hover:text-background transition-colors">
                c2crental.com
              </a>
            </div>
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
                className="text-background/45 hover:text-[#197149] transition-colors duration-200"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a
                href="https://www.facebook.com/people/C2C-Rental/61587985570949/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="text-background/45 hover:text-[#197149] transition-colors duration-200"
              >
                <Facebook className="w-5 h-5" />
              </a>
            </div>
            <a href="/documents/terms-and-conditions.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-background/70 transition-colors duration-200">Terms</a>
            <a href="/documents/terms-and-conditions.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-background/70 transition-colors duration-200">Privacy</a>
            <a href="/documents/rental-agreement.pdf" target="_blank" rel="noopener noreferrer" className="hover:text-background/70 transition-colors duration-200">Legal</a>
          </div>
        </div>
      </div>
    </footer>
  );
}