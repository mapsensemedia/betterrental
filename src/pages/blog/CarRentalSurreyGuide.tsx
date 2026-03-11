import { useEffect } from "react";
import { Link } from "react-router-dom";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Button } from "@/components/ui/button";

const SLUG = "car-rental-surrey-guide";
const TITLE = "The Complete Guide to Renting a Car in Surrey, BC";
const DESC = "Everything Surrey residents need to know about renting a car locally — ICBC coverage, age rules, best vehicle types, and how C2C Rental compares to Turo and Enterprise.";

export default function CarRentalSurreyGuide() {
  useEffect(() => {
    document.title = "The Complete Guide to Renting a Car in Surrey, BC (2025) – C2C Rental";
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
      datePublished: "2025-01-01",
      dateModified: "2025-01-01",
      author: { "@type": "Organization", name: "C2C Rental", "@id": "https://c2crental.ca/#localbusiness" },
      publisher: { "@id": "https://c2crental.ca/#localbusiness" },
      mainEntityOfPage: { "@type": "WebPage", "@id": CANONICAL },
      inLanguage: "en-CA",
    };
    const script = document.createElement("script");
    script.id = "blog-surrey-guide-jsonld";
    script.type = "application/ld+json";
    script.textContent = JSON.stringify(schema);
    document.head.appendChild(script);

    return () => { canonical?.remove(); document.getElementById("blog-surrey-guide-jsonld")?.remove(); };
  }, []);

  return (
    <CustomerLayout>
      <article className="container-page py-12 md:py-20 max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">{TITLE}</h1>

        <section className="prose-section">
          <h2>Why Rent a Car in Surrey Instead of Using Transit?</h2>
          <p>
            Surrey is the second-largest city in British Columbia, stretching from the Pattullo Bridge in the north to the US border in the south. While the SkyTrain serves a few key corridors along King George Boulevard and into Guildford, huge swaths of the city — Newton, Cloverdale, South Surrey, and Grandview Heights — have limited rapid transit access. Bus routes exist but are slow, infrequent in the evenings, and impractical if you work shifts at a warehouse in Newton or need to get to a medical appointment across town.
          </p>
          <p>
            For many Surrey residents, relying on ride-hailing apps like Uber is not sustainable. A single 15-minute trip can cost $15–$25, and over a week those costs add up fast — easily surpassing the daily rate of an economy car rental. Renting a car gives you predictable costs, independence, and the ability to run errands, commute, and travel on your own schedule. For families juggling school drop-offs, grocery runs, and weekend activities, a rental car in Surrey is a practical, cost-effective solution.
          </p>
        </section>

        <section className="prose-section">
          <h2>What Type of Car Should You Rent in Surrey?</h2>
          <p>
            Your ideal rental depends on how you plan to use it. If you need a vehicle primarily for commuting along Highway 1 or King George Boulevard, an economy sedan is your best bet — affordable on fuel, easy to park, and available at C2C Rental from $45 per day. For weekend trips to Whistler, Manning Park, or the Coquihalla, an SUV with all-wheel drive gives you confidence on mountain roads, especially in winter. Families heading to the airport or travelling with kids and luggage should consider a minivan — spacious, comfortable, and ideal for those early-morning YVR runs.
          </p>
          <p>
            C2C Rental's fleet includes economy sedans, mid-size SUVs, and 7-seat minivans, all available for pickup or delivery across Surrey. Browse the full selection on our <Link to="/surrey" className="text-primary hover:underline">Surrey car rental page</Link>.
          </p>
        </section>

        <section className="prose-section">
          <h2>How ICBC Insurance Works for Car Rentals in BC</h2>
          <p>
            In British Columbia, every registered vehicle carries an ICBC Owner's Certificate that provides basic third-party liability and accident benefits. When you rent a car from C2C Rental, the vehicle itself is already insured under the owner's policy. However, as the renter, you are responsible for any deductible in the event of a claim, plus any damage not covered by the existing policy.
          </p>
          <p>
            If you have your own ICBC Autoplan policy on a personal vehicle, that coverage may extend to rental cars — but the details vary by policy type. We strongly recommend checking with your ICBC broker before your rental. For renters without their own ICBC policy, C2C Rental offers an optional damage waiver that reduces or eliminates your out-of-pocket liability in case of an accident. This is especially valuable for visitors, new residents, and anyone who does not own a personal vehicle.
          </p>
        </section>

        <section className="prose-section">
          <h2>C2C Rental vs Turo vs Enterprise in Surrey — What's the Difference?</h2>
          <p>
            Surrey residents have several car rental options, and they fall into three categories: national chains like Enterprise and Budget, peer-to-peer platforms like Turo, and local operators like C2C Rental. National chains offer reliability and brand recognition but often come with upsell pressure, airport surcharges, and rigid cancellation policies. Turo gives you variety and sometimes lower prices, but the experience depends entirely on the individual vehicle owner — pickup logistics, vehicle condition, and support quality are inconsistent.
          </p>
          <p>
            C2C Rental sits in the sweet spot. We are locally operated in Surrey with vehicles maintained to a consistent standard. Our pricing is transparent — no airport surcharges, no hidden fees, no upselling at the counter. You deal directly with a small, responsive team that knows the Lower Mainland. If you need to extend your rental, change your pickup location, or ask about winter tires, you get a real answer within minutes, not a call-centre queue.
          </p>
        </section>

        <section className="prose-section">
          <h2>Top 5 Reasons Surrey Locals Choose C2C Rental</h2>
          <ol className="list-decimal pl-6 space-y-3 text-muted-foreground">
            <li><strong>Transparent pricing.</strong> Our daily, weekly, and monthly rates include everything upfront. No surprise fees at checkout or return.</li>
            <li><strong>Local knowledge.</strong> We know Surrey's roads, traffic patterns, and parking quirks. We can recommend the right vehicle for your specific needs.</li>
            <li><strong>Flexible pickup and delivery.</strong> Pick up from our Surrey location or request delivery to your door — whichever works for your schedule.</li>
            <li><strong>Maintained fleet.</strong> Every vehicle is inspected between rentals. We do not list cars with deferred maintenance or cosmetic issues.</li>
            <li><strong>Real customer support.</strong> Call or text us directly. You will reach someone who can actually help — not an automated phone tree.</li>
          </ol>
        </section>

        <section className="prose-section">
          <h2>Ready to Rent a Car in Surrey?</h2>
          <p>
            Whether you need a car for a day, a week, or a month, C2C Rental has you covered. Browse our available vehicles, choose your dates, and book online in minutes.
          </p>
          <div className="mt-4">
            <Button asChild size="lg">
              <Link to="/surrey">Browse Cars in Surrey</Link>
            </Button>
          </div>
        </section>

        <footer className="mt-12 pt-8 border-t border-border text-sm text-muted-foreground space-x-4">
          <span>Related:</span>
          <Link to="/langley" className="text-primary hover:underline">Car Rental in Langley</Link>
          <Link to="/abbotsford" className="text-primary hover:underline">Car Rental in Abbotsford</Link>
        </footer>
      </article>
    </CustomerLayout>
  );
}
