import { useEffect, useRef, useState } from "react";
import { SEO } from "@/components/shared/SEO";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { CheckCircle, ShieldCheck, RefreshCw, Wallet, ArrowRight, Users, Cog, Car } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

// Photography sourced from the existing C2C Rental site library
import heroImg from "@/assets/hero-suv-mountains.jpg";
import howItWorksImg from "@/assets/fleet-lineup.jpg";
import breakImg from "@/assets/valley-highway.jpg";
import closingImg from "@/assets/hero-car.jpg";
import compactImg from "@/assets/categories/economy-versa.jpg";
import midsizeImg from "@/assets/categories/midsize-corolla.jpg";
import suvImg from "@/assets/categories/midsize-suv-rav4.jpg";
import premiumImg from "@/assets/categories/audi.jpg";

// Client-confirmed indicative monthly pricing (CAD)
const TIERS = [
  {
    id: "Compact",
    name: "Compact",
    price: "from $749 CAD / month",
    image: compactImg,
    alt: "Nissan Versa compact sedan from the C2C Rental fleet, front three-quarter view",
    specs: ["5 seats", "Automatic", "Front-wheel drive"],
  },
  {
    id: "Midsize",
    name: "Midsize",
    price: "from $829 CAD / month",
    image: midsizeImg,
    alt: "Toyota Corolla midsize sedan from the C2C Rental fleet, front three-quarter view",
    specs: ["5 seats", "Automatic", "Front-wheel drive"],
  },
  {
    id: "SUV",
    name: "SUV",
    price: "from $949 CAD / month",
    image: suvImg,
    alt: "Toyota RAV4 mid-size SUV from the C2C Rental fleet, front three-quarter view",
    specs: ["5 seats", "Automatic", "All-wheel drive"],
  },
  {
    id: "Premium",
    name: "Premium",
    price: "from $1,149 CAD / month",
    image: premiumImg,
    alt: "Audi premium sedan from the C2C Rental fleet, front three-quarter view",
    specs: ["5 seats", "Automatic", "All-wheel drive"],
  },
];

const VALUE_CARDS = [
  {
    icon: Wallet,
    title: "No long-term debt",
    body: "No loan, no lease, no down payment. One monthly fee.",
  },
  {
    icon: RefreshCw,
    title: "Full flexibility",
    body: "Month to month. Change vehicle or cancel with notice.",
  },
  {
    icon: ShieldCheck,
    title: "Everything included",
    body: "Insurance, maintenance, roadside and swaps in one bill.",
  },
];

const STEPS = [
  { n: "01", title: "Choose your class", body: "Pick a vehicle class and your city." },
  { n: "02", title: "Confirm your details", body: "Licence, insurance history and a short check." },
  { n: "03", title: "Collect or have it delivered", body: "Pick up locally or we deliver to you." },
  { n: "04", title: "Change or cancel monthly", body: "Swap classes or stop with notice. No penalty." },
];

const INCLUDED = [
  "Insurance",
  "Scheduled maintenance",
  "Roadside assistance",
  "Seasonal tire changeover",
  "Vehicle swaps",
];

const NOT_INCLUDED = ["Fuel", "Tolls", "Parking", "Traffic fines", "Cleaning beyond fair wear"];

const AUDIENCES = [
  { title: "New to BC", body: "Building credit or waiting on a licence transfer." },
  { title: "Between vehicles", body: "Waiting on a delivery or an insurance claim." },
  { title: "Don't want to own", body: "Wants a car without a six-year commitment." },
];

const FAQS = [
  {
    q: "Is this a lease?",
    a: "No. A subscription is a monthly service that bundles the vehicle with insurance, maintenance and roadside support. There is no financing and no long-term commitment.",
  },
  {
    q: "What's the minimum term?",
    a: "There is no fixed term. The subscription renews monthly and you can end it with notice.",
  },
  {
    q: "Who insures the vehicle?",
    a: "C2C arranges the insurance and it is included in your monthly fee, so you don't take out a separate policy.",
  },
  {
    q: "Is there a mileage limit?",
    a: "Each plan includes a monthly kilometre allowance, and anything beyond it is billed at a per-kilometre rate shown on your plan before you sign up.",
  },
  {
    q: "What credit or licence checks apply?",
    a: "You'll need a valid full driver's licence and a clean enough driving record. We run a short identity and eligibility check before your vehicle is released.",
  },
  {
    q: "Which cities are launching first?",
    a: "We're starting in the Lower Mainland and using waitlist demand to decide the launch order. Registering interest helps put your city first.",
  },
  {
    q: "Can I switch vehicles?",
    a: "Yes. Swapping to another class is part of the service — request the change with notice and we move you across when a vehicle is available.",
  },

];

const CITIES = [
  "Surrey",
  "Langley",
  "Abbotsford",
  "Vancouver",
  "Burnaby",
  "Richmond",
  "Coquitlam",
  "Chilliwack",
  "Other",
];

const BUDGETS = [
  "Under $800 / month",
  "$800 – $1,000 / month",
  "$1,000 – $1,250 / month",
  "$1,250+ / month",
  "Not sure yet",
];

const TIMEFRAMES = ["Now", "1–3 months", "3–6 months", "Just exploring"];

export default function Subscription() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    vehicleClass: "",
    budget: "",
    timeframe: "",
    consent: false,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [stickyHidden, setStickyHidden] = useState(false);
  const waitlistRef = useRef<HTMLDivElement | null>(null);

  // Hide the mobile sticky CTA while the waitlist form is on screen
  useEffect(() => {
    const el = waitlistRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setStickyHidden(entry.isIntersecting),
      { threshold: 0.05 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const scrollToWaitlist = (tier?: string) => {
    if (tier) setForm((p) => ({ ...p, vehicleClass: tier }));
    document.getElementById("waitlist")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email || !form.phone || !form.city) {
      toast.error("Please add your name, email, phone and city.");
      return;
    }
    if (!form.consent) {
      toast.error("Please confirm we can contact you about early access.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke("send-contact-email", {
        body: {
          name: form.name,
          email: form.email,
          phone: form.phone || undefined,
          subject: `Subscription waitlist — ${form.city}`,
          message: [
            "Vehicle subscription early-access waitlist registration.",
            `City: ${form.city}`,
            `Vehicle class: ${form.vehicleClass || "Not specified"}`,
            `Monthly budget: ${form.budget || "Not specified"}`,
            `Needed: ${form.timeframe || "Not specified"}`,
            "Consented to contact: Yes",
          ].join("\n"),
        },
      });
      if (error) throw error;
      trackEvent("contact_form_submitted", {
        inquiry_type: "subscription_waitlist",
        location: form.city,
        vehicle_class: form.vehicleClass,
        budget: form.budget,
        timeframe: form.timeframe,
      });
      setIsSubmitted(true);
    } catch (err) {
      console.error("Waitlist form error:", err);
      toast.error("Something went wrong. Please try again or call us directly.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <CustomerLayout>
      <SEO
        title="Car Subscription in British Columbia | C2C Transport"
        description="One monthly payment covering the vehicle, insurance and maintenance. Month to month, no loan. Join the BC early-access waitlist."
        path="/subscription"
        jsonLd={faqSchema}
      />

      {/* 1. HERO */}
      <section className="relative isolate overflow-hidden">
        <img
          src={heroImg}
          alt="Dark SUV on a mountain highway in British Columbia at first light"
          width={1920}
          height={1088}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(100deg, hsl(0 0% 0% / 0.82) 0%, hsl(0 0% 0% / 0.6) 45%, hsl(0 0% 0% / 0.22) 78%, hsl(0 0% 0% / 0.4) 100%)",
          }}
        />
        <div className="relative container-corp pt-16 sm:pt-24 md:pt-32 pb-12 sm:pb-16 md:pb-28">
          <div className="max-w-2xl">
            <span className="eyebrow !text-white/75">Coming soon to British Columbia</span>
            <h1 className="text-white font-display font-semibold leading-[1.15] tracking-tight text-[2.1rem] sm:text-[2.6rem] md:text-[3.1rem]">
              One monthly payment. One car. No loan.
            </h1>
            <p className="mt-5 text-[16px] md:text-[17px] leading-[1.65] text-white/80 max-w-[52ch]">
              Insurance, maintenance and roadside included. Swap or cancel monthly.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button type="button" onClick={() => scrollToWaitlist()} className="btn-corp w-full sm:w-auto justify-center">
                Join the waitlist <ArrowRight className="w-4 h-4" />
              </button>
              <a
                href="#how-it-works"
                className="btn-corp-outline w-full sm:w-auto justify-center !text-white !border-white/40 hover:!border-white hover:!text-white"
              >
                How it works
              </a>
            </div>
            <p className="mt-6 text-[13px] leading-relaxed text-white/60 max-w-[54ch]">
              Launching in the Lower Mainland — register early access and help us decide which
              cities open first.
            </p>
          </div>
        </div>
      </section>

      {/* 8. WAITLIST FORM */}
      <section id="waitlist" className="section-corp bg-background scroll-mt-24">
        <div className="container-corp" ref={waitlistRef}>
          <div className="max-w-[720px]">
            <span className="eyebrow">Early access</span>
            <h2 className="heading-2 text-foreground mb-3">Join the waitlist</h2>
            <p className="text-[16px] leading-[1.65] text-muted-foreground max-w-[65ch] mb-10">
              Tell us what you'd need and where. Registering interest does not create a booking or
              obligation.
            </p>

            {isSubmitted ? (
              <div className="border border-border p-6 sm:p-8 md:p-10">
                <CheckCircle className="w-8 h-8 text-primary" strokeWidth={1.5} />
                <h3 className="mt-5 font-display text-xl font-semibold text-foreground">
                  You're on the list. We'll be in touch as cities open.
                </h3>
              </div>
            ) : (
              <div className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="sub-name">Full name *</Label>
                    <Input
                      id="sub-name"
                      value={form.name}
                      onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                      className="h-12 rounded-none text-[16px]"
                      placeholder="Jane Smith"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sub-email">Email *</Label>
                    <Input
                      id="sub-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                      className="h-12 rounded-none text-[16px]"
                      placeholder="jane@example.com"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="sub-phone">Phone *</Label>
                    <Input
                      id="sub-phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                      className="h-12 rounded-none text-[16px]"
                      placeholder="(604) 123-4567"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>City *</Label>
                    <Select
                      value={form.city}
                      onValueChange={(v) => setForm((p) => ({ ...p, city: v }))}
                    >
                      <SelectTrigger className="h-12 rounded-none text-[16px]">
                        <SelectValue placeholder="Select your city" />
                      </SelectTrigger>
                      <SelectContent>
                        {CITIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4 sm:gap-5">
                  <div className="space-y-2">
                    <Label>Vehicle class</Label>
                    <Select
                      value={form.vehicleClass}
                      onValueChange={(v) => setForm((p) => ({ ...p, vehicleClass: v }))}
                    >
                      <SelectTrigger className="h-12 rounded-none text-[16px]">
                        <SelectValue placeholder="Select a class" />
                      </SelectTrigger>
                      <SelectContent>
                        {TIERS.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Monthly budget range</Label>
                    <Select
                      value={form.budget}
                      onValueChange={(v) => setForm((p) => ({ ...p, budget: v }))}
                    >
                      <SelectTrigger className="h-12 rounded-none text-[16px]">
                        <SelectValue placeholder="Select a range" />
                      </SelectTrigger>
                      <SelectContent>
                        {BUDGETS.map((b) => (
                          <SelectItem key={b} value={b}>
                            {b}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>When would you need it</Label>
                  <Select
                    value={form.timeframe}
                    onValueChange={(v) => setForm((p) => ({ ...p, timeframe: v }))}
                  >
                    <SelectTrigger className="h-12 rounded-none text-[16px]">
                      <SelectValue placeholder="Select a timeframe" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEFRAMES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <label className="flex items-start gap-3 pt-2 cursor-pointer">
                  <Checkbox
                    checked={form.consent}
                    onCheckedChange={(v) => setForm((p) => ({ ...p, consent: v === true }))}
                    className="rounded-none mt-0.5"
                    aria-label="Consent to be contacted"
                  />
                  <span className="text-[15px] leading-[1.65] text-muted-foreground max-w-[60ch]">
                    I agree to be contacted by C2C about vehicle subscription early access. This
                    does not create a booking or obligation.
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="btn-corp mt-2 w-full sm:w-auto justify-center disabled:opacity-60"
                >
                  {isSubmitting ? "Sending…" : <>Join the waitlist <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2. THREE-UP VALUE BAND */}
      <section className="section-corp bg-background">
        <div className="container-corp">
          <span className="eyebrow">Why subscribe</span>
          <h2 className="heading-2 text-foreground mb-10">A car without the commitment</h2>
          <div className="grid md:grid-cols-3 gap-px bg-border">
            {VALUE_CARDS.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-background p-7 md:p-8">
                <Icon className="w-7 h-7 text-primary" strokeWidth={1.25} />
                <h3 className="mt-6 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground">
                  {title}
                </h3>
                <p className="mt-3 text-[16px] leading-[1.65] text-muted-foreground max-w-[40ch]">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 3. INDICATIVE PRICING ROW */}
      <section className="section-corp bg-brand-tint border-t border-border">
        <div className="container-corp">
          <span className="eyebrow">Indicative pricing</span>
          <h2 className="heading-2 text-foreground mb-10">Choose a class</h2>
        </div>
        <div className="container-corp">
          <div className="-mx-5 px-5 md:mx-0 md:px-0 overflow-x-auto snap-x snap-mandatory">
            <div className="flex gap-px bg-border w-max md:w-full">
              {TIERS.map((tier) => (
                <article
                  key={tier.id}
                  className="snap-start bg-background w-[278px] sm:w-[320px] md:w-auto md:flex-1 flex flex-col"
                >
                  <img
                    src={tier.image}
                    alt={tier.alt}
                    loading="lazy"
                    width={640}
                    height={420}
                    className="w-full aspect-[4/3] object-cover"
                  />
                  <div className="p-6 flex flex-col flex-1">
                    <h3 className="font-display text-lg font-semibold text-foreground">
                      {tier.name}
                    </h3>
                    <p className="mt-1 text-[15px] text-foreground/80">{tier.price}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {tier.specs.map((spec, i) => (
                        <span
                          key={spec}
                          className="inline-flex items-center gap-1.5 border border-border px-2.5 py-1 text-[12px] text-muted-foreground"
                        >
                          {i === 0 ? (
                            <Users className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                          ) : i === 1 ? (
                            <Cog className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                          ) : (
                            <Car className="w-3.5 h-3.5 text-primary" strokeWidth={1.5} />
                          )}
                          {spec}
                        </span>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => scrollToWaitlist(tier.id)}
                      className="btn-corp mt-6 w-full justify-center"
                    >
                      Register interest
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
          <p className="mt-6 text-[14px] leading-[1.65] text-muted-foreground max-w-[65ch]">
            Indicative pricing only. Final rates, terms and availability confirmed at launch.
            Registering interest does not create a booking or obligation.
          </p>
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section id="how-it-works" className="bg-foreground text-background">
        <div className="grid lg:grid-cols-2">
          <img
            src={howItWorksImg}
            alt="Line-up of C2C vehicles ready for collection"
            loading="lazy"
            width={1200}
            height={900}
            className="w-full h-64 lg:h-full object-cover"
          />
          <div className="px-5 md:px-10 py-16 lg:py-[120px] max-w-[640px]">
            <span className="eyebrow !text-white/75">How it works</span>
            <h2 className="font-display text-[1.8rem] md:text-[2.2rem] font-semibold leading-[1.15] tracking-tight">
              Four steps, then drive
            </h2>
            <ol className="mt-10 divide-y divide-white/15 border-t border-white/15">
              {STEPS.map((s) => (
                <li key={s.n} className="flex gap-5 py-6">
                  <span className="font-display text-sm font-semibold text-primary pt-1">{s.n}</span>
                  <div>
                    <h3 className="text-[17px] font-semibold">{s.title}</h3>
                    <p className="mt-1.5 text-[16px] leading-[1.65] text-background/70 max-w-[46ch]">
                      {s.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* 5. WHAT'S INCLUDED */}
      <section className="section-corp bg-background">
        <div className="container-corp">
          <span className="eyebrow">What's included</span>
          <h2 className="heading-2 text-foreground mb-10">One bill, clearly defined</h2>
          <div className="grid md:grid-cols-2 gap-10 md:gap-16">
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground pb-4 border-b border-border">
                Included in your monthly fee
              </h3>
              <ul className="divide-y divide-border">
                {INCLUDED.map((item) => (
                  <li key={item} className="py-4 flex items-start gap-3 text-[16px] text-foreground">
                    <CheckCircle className="w-4 h-4 text-primary mt-1 shrink-0" strokeWidth={1.5} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground pb-4 border-b border-border">
                Not included
              </h3>
              <ul className="divide-y divide-border">
                {NOT_INCLUDED.map((item) => (
                  <li key={item} className="py-4 text-[16px] text-muted-foreground">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 6. FULL-BLEED IMAGE BREAK */}
      <img
        src={breakImg}
        alt="Highway running through the Fraser Valley on a clear day"
        loading="lazy"
        width={1920}
        height={900}
        className="w-full h-[45vh] object-cover"
      />

      {/* 7. WHO IT'S FOR */}
      <section className="section-corp bg-brand-tint border-t border-border">
        <div className="container-corp">
          <span className="eyebrow">Who it's for</span>
          <h2 className="heading-2 text-foreground mb-10">Built for changing plans</h2>
          <div className="grid md:grid-cols-3 gap-px bg-border">
            {AUDIENCES.map((a) => (
              <div key={a.title} className="bg-background p-7 md:p-8">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground">
                  {a.title}
                </h3>
                <p className="mt-3 text-[16px] leading-[1.65] text-muted-foreground max-w-[40ch]">
                  {a.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* 9. FAQ */}
      <section className="section-corp bg-brand-tint border-t border-border">
        <div className="container-corp">
          <span className="eyebrow">Questions</span>
          <h2 className="heading-2 text-foreground mb-10">Subscription FAQ</h2>
          <Accordion type="single" collapsible className="max-w-[820px] border-t border-border">
            {FAQS.map((f, i) => (
              <AccordionItem key={f.q} value={`faq-${i}`} className="border-b border-border">
                <AccordionTrigger className="text-left text-[17px] font-semibold text-foreground hover:no-underline py-5">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-[16px] leading-[1.65] text-muted-foreground max-w-[65ch] pb-6">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* 10. CLOSING CTA BAND */}
      <section className="relative isolate overflow-hidden">
        <img
          src={closingImg}
          alt="Clean sedan parked at dusk"
          loading="lazy"
          width={1920}
          height={900}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/75" />
        <div className="relative container-corp py-20 md:py-28 text-center">
          <span className="eyebrow !text-white/75">Early access</span>
          <h2 className="font-display text-white text-[1.9rem] md:text-[2.4rem] font-semibold leading-[1.15] tracking-tight max-w-[26ch] mx-auto">
            Help us decide which city opens first
          </h2>
          <div className="mt-8 flex justify-center">
            <a href="#waitlist" className="btn-corp">
              Join the waitlist <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* Mobile sticky CTA */}
      <div
        className={`md:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background p-3 transition-transform duration-200 ${
          stickyHidden || isSubmitted ? "translate-y-full" : "translate-y-0"
        }`}
      >
        <button
          type="button"
          onClick={() => scrollToWaitlist()}
          className="btn-corp w-full justify-center min-h-[44px]"
        >
          Join the waitlist
        </button>
      </div>
      <div className="md:hidden h-[72px]" aria-hidden="true" />
    </CustomerLayout>
  );
}
