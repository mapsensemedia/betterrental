import { Link } from "react-router-dom";
import { ArrowRight, Car, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";


interface CTABannerProps {
  className?: string;
}

export function CTABanner({ className }: CTABannerProps) {
  return (
    <section className={cn("py-10 md:py-16 bg-muted/40", className)}>
      <div className="container-page">
        {/* Dark featured module with system radius */}
        <div className="rounded-2xl bg-foreground text-background p-8 md:p-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            {/* Content */}
            <div className="max-w-xl">
              {/* Label — small, crisp pill */}
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-background/15 text-background/80 mb-5">
                <Sparkles className="w-3 h-3" />
                New Feature
              </span>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-3">
                Skip the Pickup — We Bring the Car to You
              </h2>
              <p className="text-background/65 text-sm md:text-base leading-relaxed mb-4">
                Select "Bring Car to Me" at checkout and we'll deliver right to your door. Available within 50 km of our locations.
              </p>
              <div className="flex items-center gap-2 text-xs text-background/50">
                <Car className="w-3.5 h-3.5" />
                <span>Surrey · Langley · Abbotsford</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to="/search"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[14px] text-sm font-semibold bg-background text-foreground transition-all duration-200 hover:bg-background/90"
              >
                Browse Vehicles
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-[14px] text-sm font-semibold border border-background/30 text-background bg-transparent transition-all duration-200 hover:bg-background/10"
              >
                Contact Us
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
