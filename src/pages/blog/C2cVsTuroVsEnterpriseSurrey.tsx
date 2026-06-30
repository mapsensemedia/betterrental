import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Button } from "@/components/ui/button";

const SLUG = "c2c-vs-turo-vs-enterprise-surrey";
const TITLE = "C2C Rental vs Turo vs Enterprise in Surrey, BC: Which Is Best?";
const DESC = "Comparing C2C Rental, Turo, and Enterprise in Surrey BC: ICBC insurance coverage, pickup and delivery flexibility, and transparent pricing without hidden fees.";

export default function C2cVsTuroVsEnterpriseSurrey() {
  useEffect(() => {
    document.title = "C2C Rental vs Turo vs Enterprise in Surrey, BC | C2C Rental";
    const CANONICAL = `https://c2crental.ca/blog/${SLUG}`;

    let meta = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
    if (!meta) { meta = document.createElement("meta"); meta.setAttribute("name", "description"); document.head.appendChild(meta); }
    meta.setAttribute("content", DESC);

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) { canonical = document.createElement("link"); canonical.setAttribute("rel", "canonical"); document.head.appendChild(canonical); }
    canonical.setAttribute("href", CANONICAL);

    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) { robots = document.createElement("meta"); robots.setAttribute("name", "robots"); document.head.appendChild(robots); }
    robots.setAttribute("content", "index, follow");

    const ogTags = [
      { property: "og:title", content: TITLE + " | C2C Rental" },
      { property: "og:description", content: DESC },
      { property: "og:url", content: CANONICAL },
      { property: "og:type", content: "article" },
    ];
    ogTags.forEach(({ property, content }) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) { tag = document.createElement("meta"); tag.setAttribute("property", property); document.head.appendChild(tag); }
      tag.setAttribute("content", content);
    });

    const schema = {
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: TITLE,
      description: DESC,
      url: CANONICAL,
      datePublished: "2026-06-30",
      dateModified: "2026-06-30",
      author: { "@type": "Organization", name: "C2C Rental", "@id": "https://c2crental.ca/#localbusiness" },
      publisher: { "@id": "https://c2crental.ca/#localbusiness" },
      mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
      inLanguage: "en-CA",
    };
    const script = document.createElement("script");
    script.id = "blog-c2c-vs-turo-enterprise-jsonld";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => { canonical?.remove(); document.getElementById("blog-c2c-vs-turo-enterprise-jsonld")?.remove(); };
  }, []);

  return (
    <CustomerLayout>
      <article className="container-page py-12 md:py-20 max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-4">{TITLE}</h1>
        <p className="text-muted-foreground text-lg mb-10">
          If you're renting a car in Surrey, you've probably looked at Turo, Enterprise, and a handful of local operators like C2C Rental. They all rent vehicles, but the experience, the insurance, and the final bill can be very different. This guide compares the three on the things that actually matter to Surrey renters: ICBC coverage, pickup and delivery flexibility, and pricing transparency.
        </p>

        <section className="prose-section">
          <h2>Quick Comparison at a Glance</h2>
          <div className="overflow-x-auto -mx-4 px-4">
            <table className="w-full text-sm border border-border rounded-lg overflow-hidden">
              <thead className="bg-muted">
                <tr className="text-left">
                  <th className="p-3 font-semibold">Feature</th>
                  <th className="p-3 font-semibold">C2C Rental</th>
                  <th className="p-3 font-semibold">Turo</th>
                  <th className="p-3 font-semibold">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr><td className="p-3">ICBC owner's certificate on every vehicle</td><td className="p-3">Yes — commercial fleet</td><td className="p-3">Depends on host</td><td className="p-3">Yes</td></tr>
                <tr><td className="p-3">Delivery in Surrey, Langley, Abbotsford</td><td className="p-3">Yes — door-to-door</td><td className="p-3">Host-dependent</td><td className="p-3">Limited / extra fee</td></tr>
                <tr><td className="p-3">Transparent all-in pricing</td><td className="p-3">Yes — no airport or counter upsell</td><td className="p-3">Service + protection fees added at checkout</td><td className="p-3">Counter upsell common</td></tr>
                <tr><td className="p-3">Cross-border (US) travel allowed</td><td className="p-3">Yes — with prior notice</td><td className="p-3">Host-dependent</td><td className="p-3">Yes — with paperwork</td></tr>
                <tr><td className="p-3">Direct local support (call/text)</td><td className="p-3">Yes — Fraser Valley team</td><td className="p-3">App support + host</td><td className="p-3">Call centre</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="prose-section">
          <h2>Insurance &amp; ICBC Coverage</h2>
          <p>
            Every C2C Rental vehicle carries a commercial ICBC Owner's Certificate, so basic third-party liability and accident benefits are already in place the moment you drive off the lot. We also offer an optional damage waiver that reduces your deductible exposure if something goes wrong — important for renters who don't have their own ICBC Autoplan policy to extend.
          </p>
          <p>
            Turo is a peer-to-peer marketplace. Coverage in BC depends on the protection plan you pick at checkout <em>and</em> the host's own insurance situation. Quality and clarity vary trip-to-trip. Enterprise carries standard rental insurance and sells additional collision damage waivers, but the cost ramps up quickly when you add LDW, supplemental liability, and personal accident coverage at the counter.
          </p>
          <p>
            For a deeper read on how ICBC interacts with rentals in BC, see our guide to <Link to="/blog/icbc-car-rental-insurance-bc" className="text-primary hover:underline">how ICBC insurance works for car rentals in BC</Link>.
          </p>
        </section>

        <section className="prose-section">
          <h2>Pickup &amp; Delivery Flexibility</h2>
          <p>
            Surrey is spread out — from Newton to South Surrey to Cloverdale, getting to a rental counter without a car is its own headache. C2C Rental operates locally in Surrey Newton, Langley Centre, and Abbotsford Centre, and we deliver vehicles to your home, hotel, or workplace across the Fraser Valley. If you need a vehicle dropped off before an early YVR run, we can arrange it.
          </p>
          <p>
            Turo pickup depends entirely on the host: some meet you at a transit station, others want you to come to a residential address, and delivery fees and rules vary by listing. Enterprise has fixed branch hours and limited delivery — typically only inside a small radius and only for certain customers — so plan around their schedule, not yours.
          </p>
        </section>

        <section className="prose-section">
          <h2>Pricing &amp; Hidden Fees</h2>
          <p>
            The big difference shows up at checkout. C2C Rental publishes daily, weekly, and monthly rates that include the vehicle, the existing ICBC base coverage, and standard kilometres. There are no airport concession fees, no "facility charges," and no surprise line items added at the counter.
          </p>
          <p>
            Turo's nightly rate looks competitive until the trip fee, young-driver fee, and protection plan land on the order summary — the final total is often 30–40 percent higher than the headline number. Enterprise tends to display a low base rate too, then layers on LDW, PAI, fuel service, and frequently airport surcharges. For a worked example of how those add up across a week-long rental, read our <Link to="/blog/daily-vs-weekly-car-rental-surrey-bc" className="text-primary hover:underline">daily vs weekly car rental in Surrey BC</Link> breakdown.
          </p>
        </section>

        <section className="prose-section">
          <h2>When Each Option Makes Sense</h2>
          <ul className="list-disc pl-6 space-y-3 text-muted-foreground">
            <li><strong>Choose Turo</strong> if you want a very specific make/model for a short trip and you're comfortable coordinating directly with an individual owner.</li>
            <li><strong>Choose Enterprise</strong> if you need a one-way rental across provinces or if your employer has a corporate account that absorbs the upcharges.</li>
            <li><strong>Choose C2C Rental</strong> if you want a Fraser Valley local who picks up the phone, transparent all-in pricing, and a maintained fleet ready for daily, weekly, or monthly rentals in Surrey, Langley, or Abbotsford.</li>
          </ul>
        </section>

        <section className="prose-section">
          <h2>The Surrey Local Pick</h2>
          <p>
            Most Surrey renters aren't optimising for novelty — they need a reliable vehicle, fair pricing, and someone real to call if plans change. That's the gap C2C Rental fills. We're not a marketplace and not a call-centre chain; we're a Surrey-based team that knows the Lower Mainland and stands behind every rental.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/surrey">Browse cars in Surrey</Link></Button>
            <Button asChild variant="outline" size="lg"><Link to="/blog/car-rental-surrey-guide">Read the complete Surrey rental guide</Link></Button>
          </div>
        </section>

        <footer className="mt-12 pt-8 border-t border-border text-sm text-muted-foreground space-x-4">
          <span>Related:</span>
          <Link to="/blog/affordable-car-rental-surrey-langley-abbotsford-bc" className="text-primary hover:underline">Affordable rentals across Surrey, Langley &amp; Abbotsford</Link>
          <Link to="/blog/icbc-car-rental-insurance-bc" className="text-primary hover:underline">How ICBC insurance works for rentals</Link>
        </footer>
      </article>
    </CustomerLayout>
  );
}
