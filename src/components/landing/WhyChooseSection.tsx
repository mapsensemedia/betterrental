import { CalendarDays, Crown, Clock, ReceiptText, ShieldCheck, Headphones } from "lucide-react";
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
  {
    icon: ShieldCheck,
    title: "Fully Insured Fleet",
    description: "ICBC-covered vehicles with protection plans available",
  },
  {
    icon: Headphones,
    title: "24/7 Support",
    description: "Reach a real person whenever you are on the road",
  },
];

interface WhyChooseSectionProps {
  className?: string;
}

export function WhyChooseSection({ className }: WhyChooseSectionProps) {
  return (
    <section className={cn("section-pad brand-band", className)} aria-labelledby="why-choose-heading">
      <div className="container-corp">
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] gap-12 lg:gap-20">
          {/* Left-aligned heading */}
          <div>
            <span className="eyebrow text-white/70">Why C2C</span>
            <h2 id="why-choose-heading" className="heading-2 text-white">
              Built for drivers who expect more
            </h2>
            <p className="mt-6 text-[15px] text-white/70 prose-measure">
              Every rental is backed by a maintained fleet, transparent pricing and staff across
              three branches in the Fraser Valley.
            </p>
          </div>

          {/* Two-column grid of thin outline icons beside short labels */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-8">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="flex items-start gap-4 corp-reveal"
                style={{ animationDelay: `${index * 60}ms` }}
              >
                <feature.icon className="w-6 h-6 text-white/80 shrink-0 mt-0.5" strokeWidth={1.25} />
                <div>
                  <h3 className="text-[15px] font-semibold text-white leading-snug mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-[13px] text-white/65 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
