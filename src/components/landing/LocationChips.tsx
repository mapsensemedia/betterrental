import { Link } from "react-router-dom";
import { MapPin, ArrowRight, ExternalLink } from "lucide-react";
import { GBP_LINKS } from "@/constants/gbpLinks";

const branches = [
  { label: "Surrey Newton", address: "6786 King George Blvd", href: "/surrey", gbp: GBP_LINKS.surrey },
  { label: "Langley Centre", address: "20178 96 Ave", href: "/langley", gbp: GBP_LINKS.langley },
  { label: "Abbotsford Centre", address: "32835 South Fraser Way", href: "/abbotsford", gbp: GBP_LINKS.abbotsford },
];

const serviceAreas = [
  "Surrey", "Langley", "Abbotsford", "Delta", "White Rock", "Cloverdale",
  "Mission", "Chilliwack", "Burnaby", "Richmond", "Vancouver", "Coquitlam",
];

export function LocationChips() {
  return (
    <section className="section-pad bg-background" aria-labelledby="locations-heading">
      <div className="container-corp">
        <div className="mb-10 md:mb-14 max-w-2xl">
          <span className="eyebrow">Locations</span>
          <h2 id="locations-heading" className="heading-2 text-foreground">
            Branches across the Lower Mainland
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 border-l border-t border-border mb-10">
          {branches.map((branch) => (
            <div key={branch.label} className="border-r border-b border-border bg-card p-6 lg:p-8">
              <MapPin className="w-6 h-6 text-brand mb-5" strokeWidth={1.25} />
              <h3 className="text-base font-semibold text-foreground mb-1">{branch.label}</h3>
              <p className="text-sm text-muted-foreground mb-5">{branch.address}</p>
              <div className="flex flex-wrap gap-3">
                <Link to={branch.href} className="chip-corp">
                  Rent here
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
                <a href={branch.gbp} target="_blank" rel="noopener noreferrer" className="chip-corp">
                  Google
                  <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                </a>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-4">
          Service area
        </p>
        <div className="flex flex-wrap gap-2 mb-10">
          {serviceAreas.map((city) => (
            <span key={city} className="chip-corp">{city}</span>
          ))}
        </div>

        <Link to="/locations" className="btn-corp-outline">
          View all locations
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </section>
  );
}
