import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight } from "lucide-react";

const articles = [
  {
    slug: "daily-vs-weekly-car-rental-surrey-bc",
    title: "Daily vs Weekly Car Rental in Surrey BC: Which Saves You More?",
    excerpt: "Not sure whether to book a daily or weekly car rental in Surrey BC? Compare rates, fees, and real scenarios. Transparent pricing and no hidden fees.",
    category: "Pricing Guide",
    readLabel: "Compare daily vs weekly Surrey rental rates",
  },
  {
    slug: "affordable-car-rental-surrey-langley-abbotsford-bc",
    title: "Affordable Car Rental in Surrey, Langley & Abbotsford BC: A Local Guide",
    excerpt: "Find affordable, fully insured car rentals in Surrey, Langley, and Abbotsford BC without hidden fees. Transparent pricing, flexible pickup, and 24/7 support.",
    category: "Local Guide",
    readLabel: "Read the Surrey, Langley & Abbotsford rental guide",
  },
  {
    slug: "car-rental-surrey-guide",
    title: "The Complete Guide to Renting a Car in Surrey, BC",
    excerpt: "Everything Surrey residents need to know — ICBC coverage, age rules, best vehicle types, and how C2C Rental compares to the alternatives.",
    category: "City Guide",
    readLabel: "Read the complete Surrey car rental guide",
  },
  {
    slug: "icbc-car-rental-insurance-bc",
    title: "How ICBC Insurance Works for Car Rentals in BC",
    excerpt: "Confused about ICBC and rental car insurance? This guide explains owner's certificate coverage, damage waivers, and what renters are responsible for.",
    category: "Insurance",
    readLabel: "Learn how ICBC insurance works for BC rentals",
  },
  {
    slug: "best-road-trips-from-surrey-bc",
    title: "Best Road Trips You Can Take from Surrey, BC",
    excerpt: "Planning a road trip from Surrey? Discover the best drives from the Fraser Valley — Whistler, Okanagan, Harrison Hot Springs, and more.",
    category: "Travel",
    readLabel: "Explore the best road trips from Surrey",
  },
  {
    slug: "car-rental-tips-new-drivers-bc",
    title: "Car Rental Tips for New and Young Drivers in BC",
    excerpt: "New to driving in BC? Learn what you need to rent a car as a new or young driver — age rules, deposits, insurance options, and more.",
    category: "Tips",
    readLabel: "Read rental tips for new and young BC drivers",
  },
  {
    slug: "c2c-vs-turo-vs-enterprise-surrey",
    title: "C2C Rental vs Turo vs Enterprise in Surrey, BC: Which Is Best?",
    excerpt: "Compare C2C Rental, Turo, and Enterprise in Surrey BC on ICBC coverage, pickup and delivery flexibility, and transparent pricing without hidden fees.",
    category: "Comparison",
    readLabel: "Compare C2C Rental vs Turo vs Enterprise in Surrey",
  },
];

export default function BlogIndex() {
  useEffect(() => {
    document.title = "Car Rental Tips & Local Guides – C2C Rental Blog";
    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) { meta = document.createElement("meta"); meta.name = "description"; document.head.appendChild(meta); }
    meta.content = "Read C2C Rental's local guides for renting a car in Surrey, Langley, and Abbotsford, BC. Tips on ICBC insurance, airport runs, winter driving, and more.";

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) { canonical = document.createElement("link"); canonical.rel = "canonical"; document.head.appendChild(canonical); }
    canonical.href = "https://c2crental.com/blog";

    return () => { canonical?.remove(); };
  }, []);

  return (
    <CustomerLayout>
      <div className="container-page py-12 md:py-20">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
          Local Car Rental Guides for Surrey &amp; the Fraser Valley
        </h1>
        <p className="text-muted-foreground text-lg max-w-2xl mb-12">
          C2C Rental's blog covers everything you need to know about renting a car in Surrey, Langley, and Abbotsford — from ICBC rules to the best road trips from the Fraser Valley.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {articles.map((a) => (
            <Card key={a.slug} className="group hover:shadow-lg transition-shadow duration-200">
              <CardContent className="p-6 flex flex-col h-full">
                <Badge variant="secondary" className="w-fit mb-3 text-xs">{a.category}</Badge>
                <h2 className="text-xl font-semibold text-foreground mb-2 group-hover:text-primary transition-colors">{a.title}</h2>
                <p className="text-muted-foreground text-sm flex-1 mb-4">{a.excerpt}</p>
                <Link
                  to={`/blog/${a.slug}`}
                  aria-label={a.readLabel}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                >
                  {a.readLabel} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </CustomerLayout>
  );
}
