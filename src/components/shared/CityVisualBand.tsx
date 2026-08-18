import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import fleetLineup from "@/assets/fleet-lineup.jpg";
import valleyHighway from "@/assets/valley-highway.jpg";
import keysHandover from "@/assets/abbotsford-keys-handover.jpg";

interface Stat {
  value: string;
  label: string;
}

interface CityVisualBandProps {
  city: string;
  /** Short headline for the visual break */
  title: string;
  /** One or two sentences, kept short on purpose */
  blurb: string;
  stats?: Stat[];
}

const defaultStats: Stat[] = [
  { value: "$45", label: "Daily rates from" },
  { value: "3", label: "Fraser Valley locations" },
  { value: "1–7 days", label: "Unlimited kilometres" },
];

/**
 * Full-bleed visual break used mid-page on city landing pages so the long
 * editorial content is split by imagery instead of running as one text block.
 */
export function CityVisualBand({ city, title, blurb, stats = defaultStats }: CityVisualBandProps) {
  return (
    <section className="bg-secondary/40 border-y border-border">
      <div className="container-corp py-14 md:py-20 space-y-10">
        <div className="grid gap-8 md:grid-cols-2 md:items-center">
          <div className="space-y-4">
            <span className="eyebrow">In and around {city}</span>
            <h2 className="heading-2 text-foreground">{title}</h2>
            <div className="h-px w-14 bg-accent" />
            <p className="text-muted-foreground leading-relaxed">{blurb}</p>
            <Link to="/search" className="btn-corp w-fit">
              See available vehicles <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <img
              src={fleetLineup}
              alt={`C2C Rental fleet ready for pickup in ${city}, BC`}
              loading="lazy"
              width={1600}
              height={1000}
              className="col-span-2 h-48 md:h-60 w-full object-cover border border-border"
            />
            <img
              src={valleyHighway}
              alt="Rental SUV on a Fraser Valley highway"
              loading="lazy"
              width={1600}
              height={1000}
              className="h-32 md:h-40 w-full object-cover border border-border"
            />
            <img
              src={keysHandover}
              alt="C2C Rental staff handing keys to a customer"
              loading="lazy"
              className="h-32 md:h-40 w-full object-cover border border-border"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 border-t border-border">
          {stats.map((s) => (
            <div key={s.label} className="py-6 sm:px-6 border-b sm:border-b-0 sm:border-r border-border last:border-0">
              <p className="text-3xl font-bold text-foreground">{s.value}</p>
              <p className="text-[13px] uppercase tracking-[0.12em] text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
