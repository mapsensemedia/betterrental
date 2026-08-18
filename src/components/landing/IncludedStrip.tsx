import { ShieldCheck, Clock, Route, Headphones } from "lucide-react";

const items = [
  {
    icon: Route,
    title: "Unlimited kilometres",
    body: "Every rental from 1 to 7 days includes unlimited kilometres across British Columbia.",
  },
  {
    icon: ShieldCheck,
    title: "Protection options",
    body: "Choose the coverage level that suits your trip — clearly priced, no upsell pressure.",
  },
  {
    icon: Clock,
    title: "Flexible changes",
    body: "Extend, shorten, or switch vehicles mid-rental and pay only the difference.",
  },
  {
    icon: Headphones,
    title: "Local support",
    body: "Speak to the branch handling your booking, seven days a week.",
  },
];

/**
 * Typographic band that separates the two image-led promo banners.
 */
export function IncludedStrip() {
  return (
    <section className="section-pad bg-background" aria-labelledby="included-heading">
      <div className="container-corp">
        <div className="max-w-2xl mb-10 md:mb-14">
          <span className="eyebrow">Included as standard</span>
          <h2 id="included-heading" className="heading-2 text-foreground">
            What every C2C rental comes with
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-10 gap-y-10">
          {items.map((item) => (
            <div key={item.title} className="pt-6 border-t border-border">
              <item.icon className="w-6 h-6 text-brand mb-5" strokeWidth={1.25} />
              <h3 className="text-[16px] font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
