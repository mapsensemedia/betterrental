import { Link } from "react-router-dom";
import { Car, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const footerLinks = {
  explore: [
    { href: "/search", label: "Browse Cars" },
    { href: "/locations", label: "Locations" },
    { href: "/search?category=luxury", label: "Luxury Fleet" },
    { href: "/search?category=electric", label: "Electric Vehicles" },
  ],
  company: [
    { href: "/about", label: "About Us" },
    { href: "/careers", label: "Careers" },
    { href: "/press", label: "Press" },
    { href: "/contact", label: "Contact" },
  ],
  support: [
    { href: "/help", label: "Help Center" },
    { href: "/policies", label: "Rental Policies" },
    { href: "/insurance", label: "Insurance" },
    { href: "/faq", label: "FAQ" },
  ],
};

const socialLinks = [
  { icon: Facebook, href: "#", label: "Facebook" },
  { icon: Twitter, href: "#", label: "Twitter" },
  { icon: Instagram, href: "#", label: "Instagram" },
  { icon: Youtube, href: "#", label: "YouTube" },
];

export function Footer() {
  return (
    <footer className="bg-foreground text-background">
      <div className="container-page section-spacing">
        {/* Main Footer Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-5">
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-background">
                <Car className="w-4 h-4 text-foreground" />
              </div>
              <span className="text-lg font-bold tracking-tight">C2C Rental</span>
            </Link>
            <p className="text-background/60 mb-5 max-w-sm text-sm leading-relaxed">
              Premium car rental experience with a curated fleet of vehicles.
              Drive with confidence.
            </p>
            
            {/* Newsletter */}
            <div className="space-y-2">
              <p className="text-sm font-medium">Subscribe to our newsletter</p>
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="Email..."
                  className="bg-background/10 border-background/20 text-background placeholder:text-background/40 focus:border-background/40 h-9"
                />
                <Button variant="secondary" size="icon" className="shrink-0 h-9 w-9">
                  <Mail className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h4 className="font-semibold mb-4 text-sm">Explore</h4>
            <ul className="space-y-2.5">
              {footerLinks.explore.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-background/60 hover:text-background transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm">Company</h4>
            <ul className="space-y-2.5">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-background/60 hover:text-background transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm">Support</h4>
            <ul className="space-y-2.5">
              {footerLinks.support.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="text-background/60 hover:text-background transition-colors text-sm"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Contact & Social */}
        <div className="mt-10 pt-8 border-t border-background/10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
            <div className="flex flex-wrap gap-5 text-sm text-background/60">
              <a href="tel:+15551234567" className="flex items-center gap-2 hover:text-background transition-colors">
                <Phone className="w-4 h-4" />
                +1 (555) 123-4567
              </a>
              <a href="mailto:info@c2crental.com" className="flex items-center gap-2 hover:text-background transition-colors">
                <Mail className="w-4 h-4" />
                info@c2crental.com
              </a>
              <span className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Surrey, Langley, Abbotsford BC
              </span>
            </div>

            <div className="flex gap-2">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.href}
                  aria-label={social.label}
                  className="w-9 h-9 rounded-lg bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors"
                >
                  <social.icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-8 pt-6 border-t border-background/10 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-background/40">
          <p>© 2024 C2C Rental. All rights reserved.</p>
          <div className="flex gap-5">
            <Link to="/terms" className="hover:text-background transition-colors">Terms</Link>
            <Link to="/privacy" className="hover:text-background transition-colors">Privacy</Link>
            <Link to="/legal" className="hover:text-background transition-colors">Legal</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
