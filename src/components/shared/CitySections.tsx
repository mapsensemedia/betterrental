import { ReactNode } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, MapPin, HelpCircle, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

/* ------------------------------------------------------------------ */
/* Section shell                                                       */
/* ------------------------------------------------------------------ */

interface SectionShellProps {
  eyebrow?: string;
  title: string;
  intro?: string;
  children: ReactNode;
  tinted?: boolean;
  className?: string;
}

export function CitySection({ eyebrow, title, intro, children, tinted, className }: SectionShellProps) {
  return (
    <section
      className={[
        "py-12 md:py-16",
        tinted ? "bg-secondary/40 border-y border-border" : "bg-background",
        className ?? "",
      ].join(" ")}
    >
      <div className="container-corp space-y-8">
        <div className="max-w-2xl space-y-3">
          {eyebrow && <span className="eyebrow">{eyebrow}</span>}
          <h2 className="heading-2 text-foreground">{title}</h2>
          <div className="h-px w-14 bg-accent" />
          {intro && <p className="text-muted-foreground leading-relaxed">{intro}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Simple claim tiles (bullet lists turned into cards)                 */
/* ------------------------------------------------------------------ */

export function CityClaimGrid({ items, columns = 2 }: { items: string[]; columns?: 2 | 3 }) {
  return (
    <ul
      className={[
        "grid grid-cols-1 gap-px bg-border border border-border",
        columns === 3 ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2",
      ].join(" ")}
    >
      {items.map((item) => (
        <li key={item} className="flex items-start gap-3 bg-card p-5">
          <CheckCircle2 className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <span className="text-sm text-muted-foreground leading-relaxed">{item}</span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/* Icon tiles (requirements, deposits, insurance)                      */
/* ------------------------------------------------------------------ */

export interface CityTile {
  icon: LucideIcon;
  title: string;
  detail: string;
}

export function CityTileGrid({ tiles }: { tiles: CityTile[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
      {tiles.map((t) => (
        <div key={t.title} className="bg-card p-5 space-y-2">
          <div className="h-9 w-9 bg-accent/10 flex items-center justify-center">
            <t.icon className="h-[18px] w-[18px] text-accent" />
          </div>
          <h3 className="font-semibold text-foreground text-sm">{t.title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">{t.detail}</p>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Routes + location: two-column band                                  */
/* ------------------------------------------------------------------ */

interface CityRoutesAndLocationProps {
  routesTitle: string;
  routes: string[];
  locationName: string;
  address: string;
  phone?: string;
  locationBlurb: string;
  deliveryBlurb?: string;
  mapUrl: string;
  image?: string;
  imageAlt?: string;
}

export function CityRoutesAndLocation({
  routesTitle,
  routes,
  locationName,
  address,
  phone = "+1 (604) 763-4242",
  locationBlurb,
  deliveryBlurb,
  mapUrl,
  image,
  imageAlt,
}: CityRoutesAndLocationProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
      <div className="space-y-5">
        <h3 className="text-lg font-semibold text-foreground">{routesTitle}</h3>
        <ul className="border border-border divide-y divide-border">
          {routes.map((r) => (
            <li key={r} className="flex items-start gap-3 p-4 bg-card">
              <span className="mt-1.5 h-1.5 w-1.5 bg-accent shrink-0" />
              <span className="text-sm text-muted-foreground">{r}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="space-y-5">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <MapPin className="h-5 w-5 text-accent" /> Pickup &amp; delivery area
        </h3>
        <Card className="overflow-hidden">
          {image && (
            <img
              src={image}
              alt={imageAlt ?? locationName}
              loading="lazy"
              className="h-40 w-full object-cover border-b border-border"
            />
          )}
          <CardContent className="p-5 space-y-3">
            <p className="font-semibold text-foreground">{locationName}</p>
            <p className="text-sm text-muted-foreground">{address}</p>
            <p className="text-sm text-muted-foreground">{phone}</p>
            <p className="text-sm text-muted-foreground leading-relaxed pt-1">{locationBlurb}</p>
            {deliveryBlurb && (
              <p className="text-sm text-muted-foreground leading-relaxed">{deliveryBlurb}</p>
            )}
            <Button asChild variant="outline" size="sm" className="mt-1">
              <a href={mapUrl} target="_blank" rel="noopener noreferrer">
                <MapPin className="mr-2 h-4 w-4" /> View on Google &amp; get directions
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Booking steps with supporting image                                 */
/* ------------------------------------------------------------------ */

export interface CityStep {
  icon: LucideIcon;
  title: string;
  detail: string;
}

export function CityStepsWithImage({
  steps,
  image,
  imageAlt,
  note,
}: {
  steps: CityStep[];
  image: string;
  imageAlt: string;
  note?: string;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-start">
      <img
        src={image}
        alt={imageAlt}
        loading="lazy"
        className="order-2 lg:order-1 w-full h-full max-h-[480px] object-cover border border-border"
      />
      <ol className="order-1 lg:order-2 border border-border divide-y divide-border">
        {steps.map((s, i) => (
          <li key={s.title} className="flex items-start gap-4 p-5 bg-card">
            <span className="flex items-center justify-center h-9 w-9 bg-primary text-primary-foreground text-sm font-bold shrink-0">
              {i + 1}
            </span>
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                <s.icon className="h-4 w-4 text-accent" /> {s.title}
              </h3>
              <p className="text-sm text-muted-foreground">{s.detail}</p>
            </div>
          </li>
        ))}
        {note && <li className="p-5 bg-card text-sm text-muted-foreground">{note}</li>}
      </ol>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* FAQ with sidebar contact card                                       */
/* ------------------------------------------------------------------ */

export function CityFaq({
  items,
  city,
}: {
  items: { q: string; a: string }[];
  city: string;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-8 lg:gap-12 items-start">
      <Accordion type="single" collapsible className="w-full border border-border divide-y divide-border bg-card">
        {items.map((faq, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="border-0 px-5">
            <AccordionTrigger className="text-left text-foreground font-medium">{faq.q}</AccordionTrigger>
            <AccordionContent className="text-muted-foreground">{faq.a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <Card>
        <CardContent className="p-5 space-y-3">
          <HelpCircle className="h-5 w-5 text-accent" />
          <p className="font-semibold text-foreground">Still have a question?</p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Our {city} team answers rental, insurance and deposit questions before you book.
          </p>
          <p className="text-sm text-muted-foreground">+1 (604) 763-4242</p>
          <Button asChild variant="outline" size="sm">
            <Link to="/contact">Contact our team</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
