import { Search, CalendarCheck, KeyRound, MapPinned } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Choose your vehicle",
    copy: "Compare live availability across our Fraser Valley fleet.",
  },
  {
    icon: CalendarCheck,
    title: "Book in minutes",
    copy: "Transparent pricing, protection and extras in one flow.",
  },
  {
    icon: KeyRound,
    title: "Collect the keys",
    copy: "Pick up at any branch between 9:00 AM and 8:00 PM.",
  },
  {
    icon: MapPinned,
    title: "Or have it delivered",
    copy: "Flat $50 delivery anywhere inside our service area.",
  },
];

export function HowItWorks() {
  return (
    <section className="section-pad tint-band" aria-labelledby="how-it-works-heading">
      <div className="container-corp">
        <div className="mb-10 md:mb-14 max-w-2xl">
          <span className="eyebrow">How It Works</span>
          <h2 id="how-it-works-heading" className="heading-2 text-foreground">
            Four steps from search to steering wheel
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 border-l border-t border-border">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="border-r border-b border-border bg-card p-6 lg:p-8 corp-reveal"
              style={{ animationDelay: `${i * 70}ms` }}
            >
              <step.icon className="w-7 h-7 text-brand mb-6" strokeWidth={1.25} />
              <h3 className="text-[15px] lg:text-base font-semibold text-foreground mb-2 leading-snug">
                {step.title}
              </h3>
              <p className="text-[13px] lg:text-sm text-muted-foreground leading-relaxed">
                {step.copy}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
