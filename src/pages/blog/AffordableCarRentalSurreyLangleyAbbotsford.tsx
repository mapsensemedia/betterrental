import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, ArrowLeft } from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { SEO } from "@/components/shared/SEO";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const TITLE = "Affordable Car Rental in Surrey, Langley & Abbotsford BC (No Hidden Fees) | C2C Rental";
const DESC = "Find affordable, fully insured car rentals in Surrey, Langley, and Abbotsford, BC—without hidden fees. C2C Rental offers transparent pricing, flexible pickup, and 24/7 support across the Lower Mainland.";

const SLUG = "affordable-car-rental-surrey-langley-abbotsford-bc";
const CANONICAL = `https://c2crental.ca/blog/${SLUG}`;

export default function AffordableCarRentalSurreyLangleyAbbotsford() {
  const [showStickyCta, setShowStickyCta] = useState(false);

  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: "Affordable Car Rental in Surrey, Langley & Abbotsford BC (Without Hidden Fees)",
    description: DESC,
    url: CANONICAL,
    datePublished: "2025-06-01",
    dateModified: "2025-06-01",
    author: { "@type": "Organization", name: "C2C Rental", "@id": "https://c2crental.ca/#localbusiness" },
    publisher: { "@id": "https://c2crental.ca/#localbusiness" },
    mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
    keywords: "affordable car rental Surrey BC, cheap car rental Langley, affordable car rental Abbotsford, transparent pricing car rental, fully insured car rental Lower Mainland",
    inLanguage: "en-CA",
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "Is it cheaper to rent a car locally in Surrey than from the airport?", acceptedAnswer: { "@type": "Answer", text: "Yes. Airport rentals carry additional concession fees and higher base rates. Local providers in Surrey, Langley, and Abbotsford like C2C Rental avoid these surcharges, making the total cost substantially lower for most renters who do not need airport pickup." } },
      { "@type": "Question", name: "Does C2C Rental include insurance in the quoted price?", acceptedAnswer: { "@type": "Answer", text: "Yes. C2C Rental vehicles are fully insured and that is reflected in the pricing upfront. You will not face confusing insurance add-ons or surprise charges at pickup." } },
      { "@type": "Question", name: "How far in advance should I book a car rental in Surrey BC?", acceptedAnswer: { "@type": "Answer", text: "Booking at least 1 to 2 weeks in advance is recommended, especially during summer or holidays when demand across the Lower Mainland is highest." } },
      { "@type": "Question", name: "Does C2C Rental serve areas outside Surrey?", acceptedAnswer: { "@type": "Answer", text: "Yes. C2C Rental serves Surrey, Langley, Abbotsford, and the broader Lower Mainland BC. Contact C2C Rental directly to confirm pickup availability in your specific area." } },
      { "@type": "Question", name: "What is the difference between a daily and weekly rental rate with C2C Rental?", acceptedAnswer: { "@type": "Answer", text: "C2C Rental offers both daily and weekly rates. For trips of 5 days or more, the weekly rate typically works out to a lower average daily cost. Contact C2C Rental for a custom quote." } },
    ],
  };

  // Sticky CTA on scroll
  useEffect(() => {
    const handleScroll = () => setShowStickyCta(window.scrollY > 600);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <CustomerLayout>
      <SEO
        title={TITLE}
        description={DESC}
        path={`/blog/${SLUG}`}
        type="article"
        jsonLd={[blogSchema, faqSchema]}
      />
      {/* ── HERO ──────────────────────────────────── */}
      <section className="relative bg-[hsl(220,30%,12%)] pt-28 pb-20 md:pt-36 md:pb-28 overflow-hidden">
        {/* subtle texture */}
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="container-page max-w-3xl mx-auto relative z-10">
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90 transition-colors mb-8">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Blog
          </Link>
          <p className="text-[hsl(25,85%,55%)] font-semibold text-sm tracking-widest uppercase mb-4">Local Guide</p>
          <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] leading-[1.15] font-extrabold text-white mb-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Affordable Car Rental in Surrey, Langley, and Abbotsford&nbsp;BC: A&nbsp;Local&nbsp;Guide
          </h1>
          <p className="text-white/60 text-sm">Published June 1, 2025 · 8 min read</p>
        </div>
      </section>

      {/* ── ARTICLE BODY ──────────────────────────── */}
      <article className="bg-[hsl(40,20%,97%)]">
        <div className="container-page max-w-3xl mx-auto py-14 md:py-20">
          <div className="blog-prose">

            <p className="lead">
              Finding an affordable rental car in Surrey, Langley, or Abbotsford can feel overwhelming when search results are dominated by international brands and price comparison sites. Yet for everyday trips, visiting family, or business errands around the Lower Mainland, a local provider with transparent pricing consistently delivers better value and a smoother experience—and that's exactly what C2C Rental was built to offer.
            </p>

            {/* ── Section 1 ── */}
            <h2>Why Local Car Rental Beats Big‑Box Brands for Everyday Trips</h2>
            <p>
              Large national brands prioritize airports and major travel hubs. Their Surrey‑, Langley‑, and Abbotsford‑area listings often come with significant fees, surge pricing, and limited flexibility for local use.
            </p>
            <p>
              C2C Rental is different. As a local car rental company serving Surrey, Langley, Abbotsford, and the broader Lower Mainland, C2C Rental is built around the needs of residents and regional travellers—not international tourists passing through YVR. That means:
            </p>
            <ul>
              <li>No confusing upsells at the counter</li>
              <li>Flexible pickup that works around your schedule</li>
              <li>24/7 customer support from people who know the area</li>
              <li>Transparent, upfront pricing—what you see is what you pay</li>
            </ul>
            <p>
              For many locals, the goal is straightforward: a clean, reliable, fully insured car at a fair price. That's the gap C2C Rental fills.
            </p>

            {/* ── Section 2 ── */}
            <h2>What "Affordable" Really Means in Surrey, Langley, and Abbotsford</h2>
            <p>
              "Affordable" is more than a low headline rate. Aggregator sites frequently advertise attractive daily prices but stack on mandatory fees, insurance, taxes, and surcharges at checkout—sometimes doubling the original quote. For most drivers, the real question is: <em>what does this rental actually cost me, door to door?</em>
            </p>

            <h3>Daily vs Weekly Rates</h3>
            <p>Whether you need a car for one day or two weeks, understanding rate structure matters:</p>

            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
                <thead>
                  <tr className="bg-[hsl(220,30%,12%)] text-white">
                    <th className="text-left px-4 py-3 font-semibold">Rental Length</th>
                    <th className="text-left px-4 py-3 font-semibold">Best Option</th>
                    <th className="text-left px-4 py-3 font-semibold">Why</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border bg-white">
                    <td className="px-4 py-3 font-medium">1–3 days</td>
                    <td className="px-4 py-3">Daily rate</td>
                    <td className="px-4 py-3 text-muted-foreground">Full flexibility, no overcommitment</td>
                  </tr>
                  <tr className="border-b border-border bg-muted/30">
                    <td className="px-4 py-3 font-medium">4–6 days</td>
                    <td className="px-4 py-3">Compare both</td>
                    <td className="px-4 py-3 text-muted-foreground">Weekly discount may apply</td>
                  </tr>
                  <tr className="bg-white">
                    <td className="px-4 py-3 font-medium">7+ days</td>
                    <td className="px-4 py-3">Weekly rate</td>
                    <td className="px-4 py-3 text-muted-foreground">Lower average daily cost, simpler budgeting</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              C2C Rental offers competitive daily and weekly rates for customers in Surrey, Langley, and Abbotsford—designed for how real Lower Mainland drivers actually use their vehicles.
            </p>

            <h3>Fees, Insurance, and Deposits</h3>
            <p>When comparing rental options, always look at the all‑in total, not just the daily rate. Watch for:</p>
            <ul>
              <li>Additional driver fees</li>
              <li>Young driver surcharges</li>
              <li>One‑way rental fees</li>
              <li>Mandatory insurance tiers added at the counter</li>
              <li>Security deposit amounts and hold durations</li>
            </ul>
            <p>
              C2C Rental keeps this simple: fully insured vehicles with transparent pricing means no last‑minute surprises about coverage or hidden add‑ons.
            </p>

            {/* ── Section 3 ── */}
            <h2>How C2C Rental Keeps Pricing Transparent</h2>

            <h3>No Hidden Fees and Fully Insured Vehicles</h3>
            <p>
              C2C Rental's core promise is clear: what you're quoted is what you pay. Vehicles come fully insured, which means you won't be pressured into confusing insurance packages at pickup. This makes it easy to compare C2C Rental with competitors on a true like‑for‑like basis.
            </p>
            <p>
              For renters in Surrey, Langley, and Abbotsford, this level of clarity is rare—and genuinely valuable.
            </p>

            <h3>Flexible Pickup and 24/7 Support</h3>
            <p>
              Life doesn't follow a 9‑to‑5 schedule, and neither does C2C Rental. Whether you need a vehicle for an early morning start, a late‑night arrival, or a last‑minute booking, C2C Rental's flexible pickup options and round‑the‑clock support mean you're never left stranded.
            </p>
            <p>
              Got a flat tire at 11pm? A schedule change mid‑rental? C2C Rental's local team is available to help—making the difference between a stressful situation and a minor inconvenience.
            </p>

            {/* ── Section 4 ── */}
            <h2>Tips to Save Money on Your Next Car Rental in the Lower Mainland</h2>
            <ol>
              <li><strong>Book early, especially in summer.</strong> Rental rates across Surrey and the Lower Mainland rise during peak travel months (June–August). Locking in a rate early protects you from last‑minute price spikes.</li>
              <li><strong>Always compare total costs.</strong> A $29/day headline rate can balloon to $75/day once mandatory fees and insurance are added. Get the full quote from C2C Rental and compare apples to apples.</li>
              <li><strong>Right‑size your vehicle.</strong> A compact or mid‑size car is ideal for city driving in Surrey, Langley, and Abbotsford—better fuel efficiency, easier parking, lower rate.</li>
              <li><strong>Ask about weekly deals.</strong> If you're renting for 5 or more days, ask C2C Rental directly about weekly pricing. The per‑day savings can be significant.</li>
              <li><strong>Look local first.</strong> Local providers like C2C Rental often beat national brands on total price because they don't carry the overhead of airport locations and global marketing spend.</li>
            </ol>

            {/* ── Section 5 ── */}
            <h2>When to Choose C2C Rental for Your Trip</h2>
            <p>C2C Rental is the right choice when you want:</p>
            <div className="grid gap-3 my-6">
              {[
                "Transparent pricing with no hidden fees",
                "Fully insured vehicles included in your quote",
                "Flexible pickup across Surrey, Langley, Abbotsford, and the Lower Mainland",
                "24/7 local support",
                "Affordable daily and weekly rates built for residents, not tourists",
              ].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <CheckCircle className="w-5 h-5 text-[hsl(25,85%,55%)] shrink-0 mt-0.5" />
                  <span className="text-foreground">{item}</span>
                </div>
              ))}
            </div>
            <p>
              Whether you're visiting family, running business errands, dealing with a car in the shop, or exploring the Fraser Valley, C2C Rental makes it easy, affordable, and stress‑free.
            </p>

            {/* ── CTA Banner ── */}
            <div className="my-10 rounded-2xl bg-[hsl(220,30%,12%)] p-8 md:p-10 text-center">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-3" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Book Your Rental Today
              </h3>
              <p className="text-white/60 mb-6 text-sm">Affordable, fully insured car rental across the Fraser Valley.</p>
              <Button asChild size="lg" className="bg-[hsl(25,85%,55%)] hover:bg-[hsl(25,85%,48%)] text-white font-semibold px-8">
                <Link to="/search">
                  Browse Vehicles <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>

            {/* ── FAQ Section ── */}
            <h2>Frequently Asked Questions</h2>

            <div className="space-y-6 my-6">
              {[
                { q: "Is it cheaper to rent a car locally than from an airport in Surrey or Vancouver?", a: "Airport rentals carry additional concession fees and higher base rates. Local providers in Surrey, Langley, and Abbotsford like C2C Rental avoid these surcharges, making the total cost substantially lower for most renters who don't need airport pickup." },
                { q: "Does C2C Rental include insurance in the quoted price?", a: "Yes. C2C Rental's vehicles are fully insured, and that's reflected in the pricing upfront—so you won't face confusing insurance add‑ons or surprise charges at pickup." },
                { q: "How far in advance should I book a car rental in Surrey?", a: "Booking at least 1–2 weeks in advance is recommended, especially during summer or holidays when demand across the Lower Mainland is highest. For weekly rentals or specific vehicle types, earlier is better." },
                { q: "Does C2C Rental serve areas outside Surrey?", a: "Yes. C2C Rental serves Surrey, Langley, Abbotsford, and the broader Lower Mainland. Contact C2C Rental directly to confirm pickup availability in your specific area." },
                { q: "What's the difference between a daily and weekly rental rate with C2C Rental?", a: "C2C Rental offers both daily and weekly rates. For trips of 5 days or more, the weekly rate typically works out to a lower average daily cost. Contact C2C Rental for a custom quote that covers your exact dates." },
              ].map((faq) => (
                <div key={faq.q} className="border-l-[3px] border-[hsl(25,85%,55%)] pl-5">
                  <h4 className="font-semibold text-foreground mb-2">{faq.q}</h4>
                  <p className="text-muted-foreground text-[0.95rem] leading-relaxed">{faq.a}</p>
                </div>
              ))}
            </div>

            {/* ── Footer blurb ── */}
            <div className="border-t border-border pt-8 mt-12">
              <p className="text-muted-foreground text-sm leading-relaxed italic">
                C2C Rental is a local car rental provider serving Surrey, Langley, Abbotsford, and the Lower Mainland, BC. Affordable rates, fully insured vehicles, transparent pricing, and 24/7 support—available at{" "}
                <Link to="/" className="text-[hsl(25,85%,55%)] hover:underline font-medium not-italic">c2crental.ca</Link>.
              </p>
            </div>

          </div>
        </div>
      </article>

      {/* ── STICKY CTA ── */}
      {showStickyCta && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          className="fixed bottom-0 inset-x-0 z-50 bg-[hsl(220,30%,12%)]/95 backdrop-blur-sm border-t border-white/10 py-3 px-4 md:px-0"
        >
          <div className="container-page flex items-center justify-between gap-4 max-w-3xl mx-auto">
            <p className="text-white text-sm font-medium hidden sm:block">
              Ready to book? Transparent pricing, no hidden fees.
            </p>
            <Button asChild size="sm" className="bg-[hsl(25,85%,55%)] hover:bg-[hsl(25,85%,48%)] text-white font-semibold px-6 ml-auto">
              <Link to="/search">
                Book Now <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Link>
            </Button>
          </div>
        </motion.div>
      )}
    </CustomerLayout>
  );
}
