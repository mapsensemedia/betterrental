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
    <section className={cn("section-spacing bg-muted/40", className)}>
      <div className="container-page">
        {/* Header */}
        <div className="mb-8 md:mb-12">
          <h2 className="heading-2 text-foreground">Why Choose C2C Rental?</h2>
        </div>

        {/* Feature Cards — 2x2 on mobile, 4-across on desktop */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group card-premium p-5 md:p-6 flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-border/80 animate-fade-in"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              {/* Icon */}
              <feature.icon
                className="w-6 h-6 md:w-8 md:h-8 text-foreground/40"
                strokeWidth={1.5}
              />
              {/* Text */}
              <div>
                <h3 className="text-sm md:text-base font-semibold text-foreground mb-1 leading-snug">
                  {feature.title}
                </h3>
                <p className="text-xs md:text-sm text-muted-foreground leading-snug hidden sm:block">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
