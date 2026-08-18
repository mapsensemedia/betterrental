import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle, ArrowLeft } from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { SEO } from "@/components/shared/SEO";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const SLUG = "daily-vs-weekly-car-rental-surrey-bc";
const CANONICAL = `https://c2crental.ca/blog/${SLUG}`;
const TITLE = "Daily vs Weekly Car Rental in Surrey BC: Which Saves You More? | C2C Rental";
const DESC = "Not sure whether to book a daily or weekly car rental in Surrey BC? Compare rates, fees, and real scenarios. C2C Rental offers affordable options with transparent pricing and no hidden fees.";

export default function DailyVsWeeklyCarRentalSurrey() {
  const [showStickyCta, setShowStickyCta] = useState(false);

  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: "Daily vs Weekly Car Rental in Surrey BC: How to Choose the Best Deal",
    description: DESC,
    url: CANONICAL,
    datePublished: "2025-06-08",
    dateModified: "2025-06-08",
    author: { "@type": "Organization", name: "C2C Rental", "@id": "https://c2crental.ca/#localbusiness" },
    publisher: { "@id": "https://c2crental.ca/#localbusiness" },
    mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
    keywords: "weekly car rental Surrey, daily car rental Surrey, car rental Surrey BC price, weekly car rental Lower Mainland, Surrey car rental deals",
    inLanguage: "en-CA",
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: "Is a weekly car rental in Surrey always cheaper than paying daily?", acceptedAnswer: { "@type": "Answer", text: "Not always. It depends on whether the provider offers genuine weekly discounts. With C2C Rental transparent pricing, you can compare both options directly with no hidden fees obscuring the real difference." } },
      { "@type": "Question", name: "Can I switch from a daily to a weekly rental after booking with C2C Rental?", acceptedAnswer: { "@type": "Answer", text: "As a local provider, C2C Rental is generally more flexible than large national chains. Contact them early in your rental period to discuss adjusting the rate structure." } },
      { "@type": "Question", name: "How far in advance should I book a weekly car rental in Surrey BC?", acceptedAnswer: { "@type": "Answer", text: "For peak periods such as June through August and holidays, booking 1 to 2 weeks ahead is recommended. Weekly rentals for specific vehicle types can sell out during busy months across the Lower Mainland." } },
      { "@type": "Question", name: "Does C2C Rental offer insurance for weekly rentals?", acceptedAnswer: { "@type": "Answer", text: "Yes. All C2C Rental vehicles are fully insured regardless of whether you book daily or weekly. Insurance is included and transparent, not an optional add-on." } },
      { "@type": "Question", name: "What vehicle types are best for a weekly rental in Surrey BC?", acceptedAnswer: { "@type": "Answer", text: "For most Surrey and Lower Mainland driving, a compact or mid-size sedan offers the best balance of cost, fuel efficiency, and parking convenience. For families or group trips, an SUV may be worth the higher weekly rate." } },
    ],
  };

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
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="container-page max-w-3xl mx-auto relative z-10">
          <Link to="/blog" className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white/90 transition-colors mb-8">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Blog
          </Link>
          <p className="text-[hsl(25,85%,55%)] font-semibold text-sm tracking-widest uppercase mb-4">Pricing Guide</p>
          <h1 className="text-3xl sm:text-4xl md:text-[2.75rem] leading-[1.15] font-semibold text-white mb-6">
            Daily vs Weekly Car Rental in Surrey&nbsp;BC: Which Option Saves You&nbsp;More?
          </h1>
          <p className="text-white/60 text-sm">Published June 8, 2025 · 9 min read</p>
        </div>
      </section>

      {/* ── ARTICLE BODY ──────────────────────────── */}
      <article className="bg-background">
        <div className="container-page max-w-3xl mx-auto py-14 md:py-20">
          <div className="blog-prose">

            <p className="lead">
              If you're renting a car in Surrey, BC, one of the first decisions you'll face is simple but often confusing: daily rate or weekly rate? The right answer depends on your trip length, how pricing is structured, and whether you're working with a local company like C2C Rental that gives you clear, upfront costs—or a global aggregator that hides fees until checkout.
            </p>
            <p>This guide breaks it down so you can make the right call every time.</p>

            {/* ── Section 1 ── */}
            <h2>How Car Rental Pricing Works in Surrey BC</h2>
            <p>Rental pricing in Surrey typically comes in two structures:</p>
            <ul>
              <li><strong>Daily rate:</strong> Charged per 24‑hour period. Flexible but can add up quickly for longer trips.</li>
              <li><strong>Weekly rate:</strong> A flat rate for 7 days, often representing a discount of 20–40% off the equivalent daily total.</li>
            </ul>
            <p>
              Here's the catch: a weekly rate isn't simply 7× the daily rate, and many rental companies—particularly large chains and aggregators—add fees during checkout that make direct comparisons difficult. Mandatory insurance options, fuel policies, one‑way charges, and taxes can significantly change your final total.
            </p>
            <p>
              This is why transparent pricing from a local provider like C2C Rental matters so much—you get the real number upfront, not after spending 20 minutes in a booking funnel.
            </p>

            {/* ── Section 2 ── */}
            <h2>When a Daily Rental in Surrey Makes Sense</h2>
            <p>Daily rentals are your best bet when:</p>
            <ul>
              <li>You need the car for 1 to 3 days</li>
              <li>Your plans are flexible and might change (extend or shorten the rental)</li>
              <li>You're handling local errands, medical appointments, or short business trips</li>
              <li>You want to avoid committing to a full week when you won't use all that time</li>
            </ul>
            <div className="border-l-[3px] border-[hsl(25,85%,55%)] pl-5 my-6 bg-[hsl(25,85%,55%)]/5 py-4 pr-4 rounded-r-lg">
              <p className="text-foreground font-medium mb-0">
                <strong>Pro tip:</strong> Even for short daily rentals, always ask for the all‑in total—including insurance and taxes—before confirming. A $35/day listing can easily become $60/day once mandatory fees are applied.
              </p>
            </div>

            {/* ── Section 3 ── */}
            <h2>When a Weekly Rental Is the Better Deal</h2>
            <p>Weekly rentals start making financial sense when:</p>
            <ul>
              <li>Your trip is approaching 5 or more days</li>
              <li>You have a fixed schedule and won't need to adjust the rental period</li>
              <li>You're renting for visiting family, temporary work, or extended errands</li>
              <li>You want simpler budgeting—one price, one confirmation, no daily math</li>
            </ul>

            <h3>The Math Behind Weekly Savings</h3>
            <p>Let's say C2C Rental offers a compact sedan at $45/day. If you need it for 7 days:</p>

            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm border border-border rounded-none overflow-hidden">
                <thead>
                  <tr className="bg-[hsl(220,30%,12%)] text-white">
                    <th className="text-left px-4 py-3 font-semibold">Option</th>
                    <th className="text-left px-4 py-3 font-semibold">Calculation</th>
                    <th className="text-left px-4 py-3 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border bg-white">
                    <td className="px-4 py-3 font-medium">7 × daily rate</td>
                    <td className="px-4 py-3 text-muted-foreground">7 × $45</td>
                    <td className="px-4 py-3 font-medium">$315</td>
                  </tr>
                  <tr className="border-b border-border bg-muted/30">
                    <td className="px-4 py-3 font-bold text-[hsl(25,85%,55%)]">Weekly flat rate</td>
                    <td className="px-4 py-3 text-muted-foreground">1 × $280</td>
                    <td className="px-4 py-3 font-bold text-[hsl(25,85%,55%)]">$280</td>
                  </tr>
                  <tr className="bg-[hsl(25,85%,55%)]/10">
                    <td className="px-4 py-3 font-bold">Weekly savings</td>
                    <td className="px-4 py-3" />
                    <td className="px-4 py-3 font-bold text-[hsl(25,85%,45%)]">$35</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p>
              The longer your rental, the more the weekly discount matters. For a 10‑day trip, you'd typically compare the weekly rate against 10 daily rates—or ask about a combined week + daily structure, which C2C Rental can help you navigate.
            </p>

            {/* ── Section 4 ── */}
            <h2>How C2C Rental Structures Daily and Weekly Rates</h2>
            <p>
              C2C Rental explicitly offers both affordable daily and weekly rates for drivers in Surrey, Langley, and Abbotsford—designed to serve real Lower Mainland use cases, not just tourist demand.
            </p>
            <p>What makes this different from booking through an aggregator:</p>
            <ul>
              <li><strong>Transparent pricing:</strong> Your quote includes everything—no surprise fees at pickup</li>
              <li><strong>Fully insured vehicles:</strong> Insurance isn't a confusing add‑on; it's built in</li>
              <li><strong>Local flexibility:</strong> If your plans change mid‑rental, a local team is far easier to work with than a national call centre</li>
            </ul>

            {/* ── Section 5: Scenarios ── */}
            <h2>Real‑World Scenarios for Surrey Drivers</h2>

            <div className="space-y-6 my-6">
              {[
                { title: "Scenario 1: Weekend road trip (2 days)", choice: "Daily rental", desc: "You need a car Friday evening through Sunday. A daily rate gives you full flexibility and you're not paying for days you won't use." },
                { title: "Scenario 2: Extended family visit (6 days)", choice: "Weekly rental", desc: "You'll be driving every day—airport runs, dinners, day trips around the Fraser Valley. A weekly rate gives you a lower average daily cost and one simple price to budget around." },
                { title: "Scenario 3: Car in the shop (7–14 days)", choice: "Weekly rental, possibly extended", desc: "Your vehicle is in for repairs and you need a replacement for 1–2 weeks. C2C Rental can structure this as weekly blocks, keeping costs predictable and lower than paying by the day." },
                { title: "Scenario 4: Temporary work contract (10 days)", choice: "Weekly + a few daily days", desc: "Ask C2C Rental directly—a combination of a weekly rate plus a few extra daily days is often more cost‑effective than paying 10 individual daily rates." },
              ].map((s) => (
                <div key={s.title} className="border border-border rounded-none p-5 bg-white">
                  <h4 className="font-semibold text-foreground mb-1">{s.title}</h4>
                  <p className="text-[hsl(25,85%,55%)] font-semibold text-sm mb-2">Best choice: {s.choice}</p>
                  <p className="text-muted-foreground text-[0.95rem] leading-relaxed mb-0">{s.desc}</p>
                </div>
              ))}
            </div>

            {/* ── Decision Guide Table ── */}
            <h2>Quick Decision Guide: Daily vs Weekly in Surrey</h2>

            <div className="overflow-x-auto my-6">
              <table className="w-full text-sm border border-border rounded-none overflow-hidden">
                <thead>
                  <tr className="bg-[hsl(220,30%,12%)] text-white">
                    <th className="text-left px-4 py-3 font-semibold">Your situation</th>
                    <th className="text-left px-4 py-3 font-semibold">Recommended choice</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { situation: "1–3 days", choice: "Daily", highlight: false },
                    { situation: "4 days", choice: "Compare both — ask C2C for a quote", highlight: true },
                    { situation: "5–7 days", choice: "Weekly", highlight: false },
                    { situation: "8–14 days", choice: "Weekly × 1–2 blocks", highlight: true },
                    { situation: "Uncertain schedule", choice: "Daily (flexibility over savings)", highlight: false },
                    { situation: "Fixed schedule", choice: "Weekly (savings over flexibility)", highlight: true },
                  ].map((row, i) => (
                    <tr key={row.situation} className={`border-b border-border ${i % 2 === 0 ? "bg-white" : "bg-muted/30"}`}>
                      <td className="px-4 py-3 font-medium">{row.situation}</td>
                      <td className={`px-4 py-3 ${row.highlight ? "font-bold text-[hsl(25,85%,55%)]" : "text-muted-foreground"}`}>{row.choice}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── CTA Banner ── */}
            <div className="my-10 rounded-none bg-[hsl(220,30%,12%)] p-8 md:p-10 text-center">
              <h3 className="text-xl md:text-2xl font-bold text-white mb-3">
                Book Your Rental Today
              </h3>
              <p className="text-white/60 mb-6 text-sm">Affordable daily &amp; weekly rates across the Fraser Valley.</p>
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
                { q: "Is a weekly car rental in Surrey always cheaper than paying daily?", a: "Not always—it depends on whether the provider offers genuine weekly discounts versus simply multiplying the daily rate. With C2C Rental's transparent pricing, you can compare both options directly with no hidden fees obscuring the real difference." },
                { q: "Can I switch from a daily to a weekly rental after booking with C2C Rental?", a: "As a local provider, C2C Rental is generally more flexible than large national chains. Contact them early in your rental if you want to extend and discuss adjusting the rate structure." },
                { q: "How far in advance should I book a weekly rental in Surrey BC?", a: "For peak periods (June–August, holidays), booking 1–2 weeks ahead is recommended. Weekly rentals for specific vehicle types can sell out during busy months across the Lower Mainland." },
                { q: "Does C2C Rental offer insurance for weekly rentals?", a: "Yes. All C2C Rental vehicles are fully insured regardless of whether you book daily or weekly—insurance is included and transparent, not an optional add‑on." },
                { q: "What vehicle types are best for a weekly rental in Surrey?", a: "For most Surrey and Lower Mainland driving, a compact or mid‑size sedan offers the best balance of cost, fuel efficiency, and parking convenience. For families or group trips, an SUV may be worth the higher weekly rate." },
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
                C2C Rental offers affordable daily and weekly car rentals in Surrey, Langley, Abbotsford, and across the Lower Mainland, BC. Fully insured vehicles, transparent pricing, and 24/7 support at{" "}
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
              Ready to book? Compare daily &amp; weekly rates instantly.
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
