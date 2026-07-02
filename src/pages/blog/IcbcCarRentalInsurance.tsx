import { Link } from "react-router-dom";
import { SEO } from "@/components/shared/SEO";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { Button } from "@/components/ui/button";

const SLUG = "icbc-car-rental-insurance-bc";
const TITLE = "How ICBC Insurance Works for Car Rentals in BC";
const DESC = "How ICBC insurance works for rental cars in BC: owner's certificate coverage, damage waivers, and what renters are responsible for.";

export default function IcbcCarRentalInsurance() {
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
        title={`How ICBC Insurance Works for Car Rentals in BC – C2C Rental`}
        description={DESC}
        path={`/blog/${SLUG}`}
        type="article"
        jsonLd={jsonLd}
      />
      <article className="container-page py-12 md:py-20 max-w-3xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-8">{TITLE}</h1>

        <section className="prose-section">
          <h2>What Insurance Covers a Rental Car in BC?</h2>
          <p>
            In British Columbia, vehicle insurance is managed through ICBC — the Insurance Corporation of British Columbia. Every registered vehicle in the province carries an Owner's Certificate, which provides basic third-party liability coverage, accident benefits, and underinsured motorist protection. When you rent a car from C2C Rental, the vehicle is already covered under the owner's ICBC policy for these basics.
          </p>
          <p>
            However, the owner's certificate does not eliminate the renter's financial exposure. If you are at fault in an accident, the renter is typically responsible for the deductible — which can range from $300 to $1,000 or more depending on the policy. Damage to the rental vehicle beyond what ICBC covers, such as vandalism, theft, or single-vehicle incidents, may also fall to the renter unless additional coverage is in place.
          </p>
          <p>
            If you already have an ICBC Autoplan policy on your own vehicle, your coverage may extend to rental cars. This depends on the specifics of your policy — contact your ICBC broker before renting to confirm what is and isn't covered.
          </p>
        </section>

        <section className="prose-section">
          <h2>What Is an Optional Damage Waiver and Do You Need One?</h2>
          <p>
            An optional damage waiver (sometimes called a collision damage waiver or CDW) is an add-on you can purchase at the time of booking. It reduces or eliminates your out-of-pocket cost if the rental vehicle is damaged during your rental period. For renters who do not have their own ICBC Autoplan policy — including visitors from other provinces or countries — this is highly recommended.
          </p>
          <p>
            Even if you have your own ICBC coverage, a damage waiver can be worth it for peace of mind. Making a claim on your personal ICBC policy can affect your future premiums, so some renters prefer to pay the waiver fee upfront rather than risk a rate increase. C2C Rental offers multiple protection tiers — our team can help you choose the right one based on your trip length, vehicle type, and personal insurance situation.
          </p>
        </section>

        <section className="prose-section">
          <h2>Age, Licence, and Experience Requirements in BC</h2>
          <p>
            To rent a car in British Columbia, most rental companies — including C2C Rental — require renters to be at least 21 years old with a minimum of two years of licensed driving experience. For premium vehicles, SUVs, and higher-value cars, the minimum age is typically 25. Renters under 25 may be subject to an additional young driver surcharge and a higher security deposit.
          </p>
          <p>
            You must hold a full, valid driver's licence — not a learner's (L) permit. Novice (N) licence holders may be considered on a case-by-case basis depending on the vehicle class and trip details. International visitors need a valid licence from their home country, a passport, and in some cases an International Driving Permit (IDP).
          </p>
        </section>

        <section className="prose-section">
          <h2>What Renters Are Responsible For</h2>
          <p>
            Regardless of your insurance coverage, renters are always responsible for: fuel (return the vehicle at the same level as pickup), tolls and bridge charges, parking tickets, traffic violations, and any towing costs resulting from misuse of the vehicle. If the vehicle is returned with interior damage, excessive dirt, or odour (including smoke), cleaning fees will apply.
          </p>
          <p>
            In the event of an accident, renters must immediately contact C2C Rental and, if required, the police. Failure to report an incident can void your damage waiver and leave you liable for the full cost of repairs.
          </p>
        </section>

        <section className="prose-section">
          <h2>Cross-Border Rentals — What Changes at the US Border?</h2>
          <p>
            If you plan to drive your rental vehicle into the United States — even for a quick day trip to Bellingham or Point Roberts — you must notify C2C Rental in advance. Cross-border travel requires additional insurance documentation, including a non-owner insurance certificate that confirms liability coverage valid in the US. Not all vehicles in our fleet are approved for cross-border use, so advance notice ensures we can assign the right vehicle and paperwork.
          </p>
          <p>
            Driving a rental vehicle across the border without prior authorization can void your insurance coverage entirely, leaving you personally liable for any incident that occurs on US soil.
          </p>
        </section>

        <section className="prose-section">
          <h2>Winter Tires — What the Law Says in BC</h2>
          <p>
            British Columbia requires winter tires or chains on most highway routes from October 1 through April 30. This includes Highway 1 through the Fraser Canyon, the Coquihalla (Highway 5), Highway 3 through Manning Park, and the Sea-to-Sky Highway to Whistler. Tires must be rated M+S (mud and snow) or bear the mountain-snowflake symbol, with a minimum tread depth of 3.5 mm.
          </p>
          <p>
            C2C Rental equips vehicles with appropriate winter tires during the regulated season, subject to availability. If you are planning a winter trip to Whistler, Kelowna, or any mountain destination, let us know your dates when booking so we can ensure the right vehicle is ready. Driving on regulated routes without proper tires can result in fines up to $121 — and more importantly, puts you and other drivers at risk.
          </p>
        </section>

        <section className="prose-section">
          <h2>Ready to Book?</h2>
          <p>
            Now that you understand how ICBC insurance works for rental cars in BC, you can book with confidence. Browse our available vehicles and choose the protection level that's right for you.
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
