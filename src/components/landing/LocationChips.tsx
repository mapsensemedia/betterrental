import { Link } from "react-router-dom";
import { MapPin, ArrowRight, ExternalLink, Phone } from "lucide-react";
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
    <section className="section-pad tint-band" aria-labelledby="locations-heading">
      <div className="container-corp">
        <div className="mb-10 md:mb-14 max-w-2xl">
          <span className="eyebrow">Locations</span>
          <h2 id="locations-heading" className="heading-2 text-foreground">
            Branches across the Lower Mainland
          </h2>
          <p className="mt-4 text-[16px] text-muted-foreground leading-relaxed max-w-[52ch]">
            Pick up at any of our three counters, or have the car delivered to you.
          </p>
        </div>

        {/* Branch cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-14">
          {branches.map((branch, i) => (
            <div
              key={branch.label}
              className="card-corp bg-card p-7 lg:p-8 flex flex-col corp-reveal"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <span className="w-11 h-11 flex items-center justify-center bg-brand-tint text-brand mb-6">
                <MapPin className="w-5 h-5" strokeWidth={1.5} />
              </span>
              <h3 className="text-[17px] font-semibold text-foreground mb-1.5">{branch.label}</h3>
              <p className="text-sm text-muted-foreground mb-4">{branch.address}</p>
              <a
                href="tel:+16047634242"
                className="inline-flex items-center gap-2 text-sm text-foreground hover:text-brand mb-7"
              >
                <Phone className="w-3.5 h-3.5" strokeWidth={1.75} />
                +1 (604) 763-4242
              </a>

              <div className="mt-auto flex flex-wrap gap-3 pt-6 hairline">
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

        {/* Service area */}
        <div className="card-corp bg-card p-7 lg:p-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            <div className="max-w-md">
              <span className="eyebrow">Delivery service area</span>
              <h3 className="text-[20px] md:text-[22px] font-display font-semibold text-foreground leading-snug">
                We bring the car to you across the Fraser Valley
              </h3>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
                Flat $50 delivery within 50 km of any branch.
              </p>
              <Link to="/locations" className="btn-corp-outline mt-6">
                View all locations
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="flex flex-wrap gap-2.5 lg:max-w-[560px]">
              {serviceAreas.map((city) => (
                <span
                  key={city}
                  className="inline-flex items-center px-4 py-2 text-[13px] font-medium bg-brand-tint text-brand border border-brand/15"
                >
                  {city}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
