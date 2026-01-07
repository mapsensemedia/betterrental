import { Calendar, Crown, Clock, Receipt } from "lucide-react";
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
        <div className="text-center mb-12">
          <h2 className="heading-2 text-foreground mb-3">Why Choose C2C Rental?</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Experience the difference with our customer-first approach
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group p-6 rounded-2xl border bg-card hover:shadow-lg transition-all duration-300 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                <feature.icon className="w-7 h-7 text-primary" />
              </div>
              <h3 className="font-semibold text-foreground text-lg mb-2">
                {feature.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
