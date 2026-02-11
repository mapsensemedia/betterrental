import { CalendarDays, Crown, Clock, ReceiptText, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

const features = [
  {
    icon: CalendarDays,
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
    description: "Free cancellation anytime before pickup",
  },
  {
    icon: ReceiptText,
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
              {/* Content */}
              <div className="absolute inset-0 p-5 flex flex-col justify-between">
                {/* Title & Description at top */}
                <div>
                  <h3 className="text-xl font-semibold text-background mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-background/60 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Icon at bottom left, Arrow at bottom right */}
                <div className="flex items-end justify-between">
                  {/* Large outline icon */}
                  <feature.icon 
                    className="w-16 h-16 text-background/50" 
                    strokeWidth={1.5}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
