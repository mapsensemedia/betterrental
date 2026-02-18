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
        <div className="mb-6 md:mb-12">
          <h2 className="heading-2 text-foreground">Why Choose C2C Rental?</h2>
        </div>

        {/* Feature Cards — horizontal on mobile, grid on desktop */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative rounded-2xl overflow-hidden bg-foreground animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Content */}
              <div className="p-4 md:p-5 flex flex-col gap-2 md:aspect-[4/3]">
                {/* Icon — smaller on mobile */}
                <feature.icon
                  className="w-7 h-7 md:w-10 md:h-10 text-background/50"
                  strokeWidth={1.5}
                />
                {/* Title & Description */}
                <div>
                  <h3 className="text-sm md:text-xl font-semibold text-background mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-xs md:text-sm text-background/60 leading-snug hidden sm:block">
                    {feature.description}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
