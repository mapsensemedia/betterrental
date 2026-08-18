import { SEO } from "@/components/shared/SEO";
import { Link } from "react-router-dom";
import { Shield, DollarSign, CalendarRange, Car, MapPin, CheckCircle, ArrowRight, Snowflake, FileCheck } from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageHero } from "@/components/shared/PageHero";
import { TrustMarquee } from "@/components/landing/TrustMarquee";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import aboutHero from "@/assets/hero-suv-mountains.jpg";
import counterImg from "@/assets/abbotsford-counter-handshake.jpg";
import keysImg from "@/assets/abbotsford-keys-handover.jpg";
import fleetImg from "@/assets/city-surrey.jpg";

const differentiators = [
  {
    icon: MapPin,
    title: "Local & Independent",
    description: "We're not a franchise or a platform. We're a Surrey-based team that knows the Fraser Valley, understands ICBC rules, and picks up the phone.",
  },
  {
    icon: DollarSign,
    title: "Transparent Pricing",
    description: "The rate you see is the rate you pay. No surprise add-ons at pickup, no confusing insurance upsells, no fine-print fees.",
  },
  {
    icon: CalendarRange,
    title: "Flexible for Real Life",
    description: "Daily, weekly, and monthly terms. Replacement rentals coordinated with body shops. Options for new drivers and newcomers — not just perfect-record renters.",
  },
];

const stats = [
  { value: "3", label: "Cities Served" },
  { value: "4.8★", label: "Average Rating" },
  { value: "500+", label: "Rentals Completed" },
  { value: "Same-Day", label: "Availability" },
];

const fleetCategories = [
  { icon: Car, label: "Economy Sedans" },
  { icon: Car, label: "Midsize Cars" },
  { icon: Car, label: "SUVs & Crossovers" },
  { icon: Car, label: "Minivans" },
];

const ABOUT_TITLE = "About C2C Rental — Surrey, Langley & Abbotsford BC";
const ABOUT_DESC = "Local Surrey-based car rental serving the Fraser Valley. Transparent pricing, flexible pickup, and a friendlier alternative to Turo and Enterprise.";

const aboutSchema = {
  "@context": "https://schema.org",
  "@type": "AboutPage",
  name: "About C2C Rental",
  url: "https://c2crental.ca/about",
  description: "C2C Rental is a Surrey-based local car rental platform serving Surrey, Langley, and Abbotsford, BC with affordable, transparent, ICBC-compliant rentals.",
  publisher: {
    "@type": "Organization",
    name: "C2C Rental",
    url: "https://c2crental.ca",
  },
};

export default function About() {


  return (
    <CustomerLayout>
      <SEO title={ABOUT_TITLE} description={ABOUT_DESC} path="/about" jsonLd={aboutSchema} />
      {/* Hero */}
      <PageHero
        image={aboutHero}
        imageAlt="C2C Rental SUV parked with Fraser Valley mountains at sunset"
        eyebrow="Who we are"
        priority
        title={<>About C2C Rental — Built for Fraser Valley Drivers</>}
        subtitle="A Surrey-based team renting dependable cars across Surrey, Langley and Abbotsford — with pricing you can read in one line."
        actions={
          <>
            <Link to="/search" className="btn-corp">
              Browse vehicles <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/contact"
              className="btn-corp-outline !text-white !border-white/40 hover:!border-white hover:!text-white"
            >
              Talk to us
            </Link>
          </>
        }
      />

      <TrustMarquee region="British Columbia" />

      {/* Section 1: Our Story */}
      <section className="section-corp bg-background">
        <div className="container-corp">
          <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-start">
            <div>
              <span className="eyebrow">Our story</span>
              <h2 className="heading-2 text-foreground mb-6">Built as the local alternative</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  C2C Rental started because we saw a gap in the Fraser Valley car rental market that nobody was filling. The big national chains serve the airports and downtown corridors, but their pricing is opaque, their upselling is relentless, and their support is a phone tree. Peer-to-peer platforms give you variety, but the experience depends entirely on the individual car owner.
                </p>
                <p>
                  Based in Surrey, we serve drivers across the Fraser Valley — from Newton and Guildford to Langley Township and Abbotsford's airport corridor. Our fleet is maintained to a consistent standard, our pricing is straightforward, and every vehicle carries a valid ICBC owner's certificate. No hidden fees. No surprise charges at the counter.
                </p>
                <p>
                  Our renters are commuters between vehicles, newcomers to BC settling in, students at KPU and UFV, families who need a second vehicle for a week, and workers whose car is in the shop. We work with body shops on replacement rentals and with drivers who just need honest, affordable transportation.
                </p>
              </div>
            </div>
            <div className="grid gap-4">
              <img
                src={counterImg}
                alt="C2C Rental team member handing keys to a customer at the counter"
                width={1920}
                height={1088}
                loading="lazy"
                className="w-full h-[220px] md:h-[300px] object-cover"
              />
              <div className="grid grid-cols-2 gap-4">
                <img
                  src={keysImg}
                  alt="Customer receiving rental car keys"
                  width={1920}
                  height={1088}
                  loading="lazy"
                  className="w-full h-[140px] md:h-[180px] object-cover"
                />
                <img
                  src={fleetImg}
                  alt="Clean rental SUV ready for pickup in Surrey"
                  width={1920}
                  height={1088}
                  loading="lazy"
                  className="w-full h-[140px] md:h-[180px] object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* Section 2: What Makes Us Different */}
      <section className="section-corp bg-brand-tint">
        <div className="container-corp">
          <span className="eyebrow">Why C2C</span>
          <h2 className="heading-2 text-foreground mb-12">What Makes Us Different</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {differentiators.map((d) => (
              <Card key={d.title} className="rounded-none border-border shadow-none">
                <CardContent className="p-8">
                  <div className="w-12 h-12 rounded-none bg-primary/10 flex items-center justify-center mb-4">
                    <d.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground text-lg mb-2">{d.title}</h3>
                  <p className="text-sm text-muted-foreground">{d.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Our Service Area */}
      <section className="section-corp bg-background">
        <div className="container-corp">
          <span className="eyebrow">Coverage</span>
          <h2 className="heading-2 text-foreground mb-6">Our Service Area</h2>
          <p className="text-muted-foreground leading-relaxed mb-8 max-w-[65ch]">
            C2C Rental serves drivers across Surrey — including Newton, Guildford, Cloverdale, Fleetwood, Whalley, and South Surrey — as well as Langley (Township and City) and Abbotsford (including the airport corridor). Whether you need a car for a day or a month, we have options across the Fraser Valley.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { city: "Surrey", href: "/surrey", img: fleetImg, note: "Newton · King George Blvd" },
              { city: "Langley", href: "/langley", img: langleyImg, note: "Langley Centre · 96 Ave" },
              { city: "Abbotsford", href: "/abbotsford", img: abbotsfordImg, note: "Abbotsford Centre · YXX" },
            ].map((loc) => (
              <Link
                key={loc.city}
                to={loc.href}
                className="group block rounded-none border border-border bg-card overflow-hidden hover:border-primary/40 hover:shadow-corp-lg transition-all"
              >
                <img
                  src={loc.img}
                  alt={`Car rental in ${loc.city}, BC`}
                  width={1920}
                  height={1088}
                  loading="lazy"
                  className="w-full h-[150px] object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="p-5">
                  <span className="flex items-center gap-2 font-semibold text-foreground">
                    <MapPin className="w-4 h-4 text-primary" />
                    {loc.city}
                  </span>
                  <p className="mt-1 text-sm text-muted-foreground">{loc.note}</p>
                </div>
              </Link>
            ))}
          </div>

        </div>
      </section>

      {/* Section 4: Our Fleet */}
      <section className="section-corp bg-brand-tint">
        <div className="container-corp">
          <span className="eyebrow">Our fleet</span>
          <h2 className="heading-2 text-foreground mb-6">Our Fleet</h2>
          <p className="text-muted-foreground leading-relaxed mb-8 max-w-[65ch]">
            Our fleet includes economy sedans, midsize cars, SUVs and crossovers, and minivans — all regularly maintained, cleaned before every rental, and equipped for BC driving conditions. Winter tires available November through March on AWD vehicles.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {fleetCategories.map((cat) => (
              <div key={cat.label} className="flex items-center gap-3 rounded-none border border-border bg-card p-5">
                <cat.icon className="w-8 h-8 text-primary" />
                <span className="text-sm font-medium text-foreground">{cat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5: By the Numbers */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container-corp">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl md:text-4xl font-bold mb-1">{stat.value}</div>
                <div className="text-sm text-primary-foreground/70">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6: ICBC & Insurance Compliance */}
      <section className="section-corp bg-background">
        <div className="container-corp">
          <div className="flex items-start gap-4 rounded-none border border-border bg-card p-8">
            <div className="w-12 h-12 rounded-none bg-primary/10 flex items-center justify-center shrink-0">
              <FileCheck className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground mb-3">ICBC &amp; Insurance Compliance</h2>
              <p className="text-muted-foreground leading-relaxed">
                Every C2C Rental vehicle is covered under a valid ICBC owner's certificate. We operate in full compliance with BC motor vehicle and insurance regulations. Renters receive clear documentation at pickup, including insurance details, damage inspection records, and full contract terms. We encourage renters to review their own ICBC coverage before booking and to ask our team any questions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="section-corp bg-brand-tint border-t border-border">
        <div className="container-corp">
          <h2 className="heading-2 text-foreground mb-4">
            Ready to rent with a local team that actually knows Surrey?
          </h2>
          <div className="flex flex-wrap gap-4 mt-8">
            <Button asChild size="lg">
              <Link to="/surrey">Browse Vehicles <ArrowRight className="w-4 h-4 ml-2" /></Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/contact">Contact Us</Link>
            </Button>
          </div>
        </div>
      </section>
    </CustomerLayout>
  );
}
