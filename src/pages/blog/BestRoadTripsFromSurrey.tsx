import { Link } from "react-router-dom";
import { SEO } from "@/components/shared/SEO";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Button } from "@/components/ui/button";

const SLUG = "best-road-trips-from-surrey-bc";
const TITLE = "Best Road Trips You Can Take from Surrey, BC";
const DESC = "Planning a road trip from Surrey? Discover the best drives from the Fraser Valley — Whistler, Okanagan, Harrison Hot Springs, and more. Rent with C2C Rental.";

export default function BestRoadTripsFromSurrey() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: TITLE,
    description: DESC,
    url: `https://c2crental.ca/blog/${SLUG}`,
    datePublished: "2025-01-01",
    dateModified: "2025-01-01",
    author: { "@type": "Organization", name: "C2C Rental", "@id": "https://c2crental.ca/#localbusiness" },
    publisher: { "@id": "https://c2crental.ca/#localbusiness" },
    mainEntityOfPage: { "@type": "WebPage", "@id": `https://c2crental.ca/blog/${SLUG}` },
    inLanguage: "en-CA",
  };

  return (
    <CustomerLayout>
      <SEO
        title={`Best Road Trips from Surrey, BC — Rent a Car and Go | C2C Rental`}
        description={DESC}
        path={`/blog/${SLUG}`}
        type="article"
        jsonLd={jsonLd}
      />
      <header className="page-band">
        <div className="container-corp">
          <span className="eyebrow">Guide</span>
          <h1 className="heading-2 max-w-3xl">{TITLE}</h1>
        </div>
      </header>
      <article className="container-corp py-16 md:py-24 max-w-3xl">
        <p className="text-muted-foreground text-lg mb-10">
          Surrey sits at the crossroads of some of British Columbia's best driving routes. Whether you're heading to the mountains, the coast, or wine country, you can be on the road in minutes. C2C Rental makes it easy with affordable daily rates and a fleet ready for anything from a quick day trip to a multi-day adventure.
        </p>

        <section className="prose-section">
          <h2>Whistler from Surrey (2.5 Hours)</h2>
          <p>
            The drive from Surrey to Whistler is one of the most scenic in North America. Take Highway 1 west through Vancouver, then follow the Sea-to-Sky Highway (Highway 99) north along Howe Sound. You'll pass Shannon Falls, the Stawamus Chief, and Brandywine Falls before arriving in Whistler Village.
          </p>
          <p>
            In winter, Whistler Blackcomb offers world-class skiing and snowboarding. In summer, it transforms into a mountain biking, hiking, and patio destination. An SUV with all-wheel drive is the best choice for this trip, especially from November through April when the Sea-to-Sky is subject to snow and ice. Budget about $40–$50 in fuel each way. Browse SUVs on our <Link to="/surrey" className="text-primary hover:underline">Surrey page</Link>.
          </p>
        </section>

        <section className="prose-section">
          <h2>Harrison Hot Springs (1.5 Hours)</h2>
          <p>
            Harrison Hot Springs is a favourite weekend escape for Fraser Valley families. From Surrey, take Highway 1 east to the Agassiz–Rosedale exit, then follow Highway 9 north to Harrison. The drive is straightforward and scenic, passing through Chilliwack's farmland and along the Fraser River.
          </p>
          <p>
            Once there, soak in the natural hot springs at the public pool or the Harrison Hot Springs Resort. Harrison Lake is beautiful for kayaking in summer, and the town hosts Sasquatch Days and a popular sandcastle competition each fall. A minivan is ideal if you're bringing the family — plenty of room for kids, towels, and a cooler.
          </p>
        </section>

        <section className="prose-section">
          <h2>Kelowna &amp; the Okanagan (4 Hours)</h2>
          <p>
            The Okanagan is BC's wine country and lake destination, and it's a surprisingly accessible drive from Surrey. Head east on Highway 1 through Chilliwack and Hope, then take the Okanagan Connector (Highway 97C) through the mountains to Kelowna. The total drive is about four hours, making it perfect for a long weekend.
          </p>
          <p>
            In summer, Kelowna offers beach days on Okanagan Lake, winery tours, and cycling along the Kettle Valley Rail Trail. The best time to visit is June through September when the orchards and vineyards are at their peak. An SUV handles the mountain grades comfortably and gives you space for wine purchases on the way home. Budget about $70–$80 in fuel each way.
          </p>
        </section>

        <section className="prose-section">
          <h2>Vancouver Island (Ferry from Tsawwassen — 1 Hour Drive)</h2>
          <p>
            Tsawwassen ferry terminal is just 30–40 minutes from central Surrey. BC Ferries runs regular sailings to Swartz Bay, which puts you 30 minutes from downtown Victoria. A two or three-day trip gives you time to explore the Royal BC Museum, Butchart Gardens, Fisherman's Wharf, and the scenic Malahat Drive.
          </p>
          <p>
            Book your ferry in advance during summer — sailings fill up fast, especially on long weekends. Any vehicle in the C2C Rental fleet works for this trip since Vancouver Island roads are well-maintained year-round. Just factor in the ferry fare — about $70–$90 for a standard vehicle with driver.
          </p>
        </section>

        <section className="prose-section">
          <h2>Manning Provincial Park (2 Hours)</h2>
          <p>
            Manning Park is a hidden gem for hikers, campers, and nature lovers. From Surrey, head east on Highway 1 to Hope, then continue south on Highway 3. The park sits high in the Cascade Mountains and offers everything from easy lakeside walks to challenging alpine scrambles.
          </p>
          <p>
            In winter, Manning Park Resort operates a small ski hill — great for families and beginners. The Lightning Lake trail network is spectacular in fall when the larches turn gold. An SUV or AWD vehicle is recommended, especially in winter when Highway 3 can be snowy and winding.
          </p>
        </section>

        <section className="prose-section">
          <h2>US Day Trips — Bellingham &amp; Mount Vernon (45 min)</h2>
          <p>
            The Peace Arch border crossing is just 25 minutes from central Surrey, making Bellingham, Washington a quick and easy day trip. Bellingham's Fairhaven district has great restaurants and shops, and the Chuckanut Drive between Bellingham and Mount Vernon is one of the most beautiful coastal drives in the Pacific Northwest.
          </p>
          <p>
            <strong>Important:</strong> If you plan to drive a C2C Rental vehicle across the US border, you must notify us in advance. Cross-border travel requires additional insurance documentation, and not all vehicles are approved for US trips. Let us know your plans when booking so we can prepare the right paperwork.
          </p>
        </section>

        <section className="prose-section">
          <h2>Ready to Hit the Road?</h2>
          <p>
            Browse available vehicles in Surrey, Langley, or Abbotsford and start planning your next road trip from the Fraser Valley.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button asChild size="lg"><Link to="/surrey">Cars in Surrey</Link></Button>
            <Button asChild variant="outline" size="lg"><Link to="/langley">Cars in Langley</Link></Button>
            <Button asChild variant="outline" size="lg"><Link to="/abbotsford">Cars in Abbotsford</Link></Button>
          </div>
        </section>
      </article>
    </CustomerLayout>
  );
}
