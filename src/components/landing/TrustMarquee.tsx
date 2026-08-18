import { cn } from "@/lib/utils";

const partners = [
  "ICBC Coverage",
  "Visa",
  "Mastercard",
  "American Express",
  "Interac",
  "Google Reviews",
  "Worldline Secure Payments",
  "CAA Roadside Ready",
];

interface TrustMarqueeProps {
  className?: string;
  region?: string;
}

/**
 * Slim full-width trust band with a slow horizontal logo marquee.
 */
export function TrustMarquee({ className, region = "British Columbia" }: TrustMarqueeProps) {
  const items = [...partners, ...partners];

  return (
    <section className={cn("bg-background border-y border-border py-7", className)} aria-label="Trusted partners">
      <p className="text-center text-[13px] text-muted-foreground mb-5 px-5">
        Trusted by drivers across {region}
      </p>
      <div className="relative overflow-hidden">
        <div className="corp-marquee-track">
          {items.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="shrink-0 px-8 text-[13px] font-semibold uppercase tracking-[0.12em] text-foreground/45 whitespace-nowrap"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
