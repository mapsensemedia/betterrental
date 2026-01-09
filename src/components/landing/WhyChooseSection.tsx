import { Calendar, Crown, Clock, Receipt, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: Calendar,
    title: "Seamless Booking",
    description: "Book online in minutes with our streamlined process",
  },
  {
    icon: Crown,
    title: "Premium Privileges",
    description: "Enjoy exclusive perks and priority service",
  },
  {
    icon: Clock,
    title: "Flexible Cancellation",
    description: "Free cancellation up to 24 hours before pickup",
  },
  {
    icon: Receipt,
    title: "No Hidden Fees",
    description: "Transparent pricing with everything included",
  },
];

interface WhyChooseSectionProps {
  className?: string;
}

export function WhyChooseSection({ className }: WhyChooseSectionProps) {
  return (
    <section className={cn("section-spacing bg-background", className)}>
      <div className="container-page">
        {/* Header */}
        <div className="mb-12">
          <h2 className="heading-2 text-foreground">Why Choose C2C Rental?</h2>
        </div>

        {/* Feature Cards - matching Browse by Brand style */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative aspect-[4/3] rounded-2xl overflow-hidden bg-foreground animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Gradient Overlay for depth */}
              <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground/95 to-foreground/80" />
              
              {/* Icon as subtle background element */}
              <div className="absolute bottom-4 left-4 opacity-10">
                <feature.icon className="w-24 h-24 text-background" />
              </div>

              {/* Content */}
              <div className="absolute inset-0 p-5 flex flex-col justify-between">
                {/* Title & Description at top */}
                <div>
                  <h3 className="text-xl font-semibold text-background mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-background/70 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Arrow Button at bottom right */}
                <div className="flex justify-end">
                  <div className="w-10 h-10 rounded-full bg-background/20 flex items-center justify-center transition-all duration-300 group-hover:bg-background/30 group-hover:scale-110">
                    <ArrowUpRight className="w-5 h-5 text-background" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
