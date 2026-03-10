import { useEffect } from "react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Link } from "react-router-dom";
import { Car, Users, Mountain, Baby, CheckCircle2, MapPin, ClipboardList, Shield, HelpCircle, ArrowRight } from "lucide-react";

const vehicleCards = [
  {
    icon: Car,
    category: "Economy & Compact Cars",
    example: "Toyota Corolla",
    rate: "$45–$65/day",
    useCase: "City driving, errands, solo commuters, YVR airport runs",
  },
  {
    icon: Users,
    category: "Midsize & Full-Size Sedans",
    example: "Honda Accord",
    rate: "$65–$85/day",
    useCase: "Longer drives, small families, business travel",
  },
  {
    icon: Mountain,
    category: "SUVs & Crossovers",
    example: "Toyota RAV4",
    rate: "$75–$110/day",
    useCase: "Road trips, Whistler, winter conditions, moving loads",
  },
  {
    icon: Baby,
    category: "Minivans & 7-Seat Vehicles",
    example: "Toyota Sienna",
    rate: "$85–$120/day",
    useCase: "Family trips, group travel, airport runs, events",
  },
];

const faqItems = [
  {
    q: "What documents do I need to rent a car in Surrey with C2C Rental?",
    a: "You will need a valid driver's licence, a credit card in the renter's name for the security deposit, and in some cases proof of insurance or additional ID. International drivers may need their passport and, depending on their home country, an International Driving Permit.",
  },
  {
    q: "Can I rent a car if I'm a new or young driver in BC?",
    a: "We consider applications from new and younger drivers on a case-by-case basis. Age minimums, additional deposits, or extra insurance may apply. Contact us with your details and we will confirm eligibility before you book.",
  },
  {
    q: "Do you offer long-term or monthly car rentals in Surrey?",
    a: "Yes. We provide weekly and monthly rental options for Surrey residents, students, and workers who need a car for longer periods. Long-term rentals often come with better rates and more flexible kilometre packages.",
  },
  {
    q: "Can I use a C2C Rental vehicle for rideshare or delivery work?",
    a: "Use of our vehicles for rideshare and delivery platforms (Uber, Lyft, SkipTheDishes, DoorDash) depends on the vehicle and our insurance rules. You must disclose your planned use at booking so we can confirm what is allowed and what coverage is required.",
  },
  {
    q: "Are winter tires included on rentals in Surrey?",
    a: "During the winter season and for trips to areas requiring winter tires, we can provide vehicles with appropriate tires, subject to availability. Let us know your travel dates and destination when booking.",
  },
  {
    q: "Can I drive outside Surrey or out of province?",
    a: "Most rentals can be used throughout Metro Vancouver and within British Columbia, but out-of-province travel must be approved in advance. Always confirm your route with our team so your insurance and contract stay valid.",
  },
  {
    q: "What happens if I get a ticket or toll during my rental?",
    a: "Tickets, tolls, and parking fines are the renter's responsibility. If we receive notices after your rental, we may charge the amount due plus an administrative fee to the card on file.",
  },
  {
    q: "How do damage inspections work at pickup and drop-off?",
    a: "We complete a walk-around inspection with photos at both pickup and drop-off so there is a clear record of the vehicle's condition. Any new damage not noted at pickup is assessed according to our damage policy and your coverage.",
  },
];

const bookingSteps = [
  "Choose your dates and vehicle type online or by phone",
  "Share your driver details (licence, age, additional drivers)",
  "Review your quote — insurance options, deposit, mileage limits",
  "Confirm your booking and receive digital agreement",
  "Pick up your vehicle in Surrey, complete walk-around inspection, and drive away",
];

const SurreyPage = () => {
  useEffect(() => {
    document.title = "Car Rental in Surrey, BC | Affordable & Local – C2C Rental";
    
    // Set meta description
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.setAttribute("name", "description");
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", "Looking for car rental in Surrey, BC? C2C Rental offers economy cars, SUVs, and minivans starting from $45/day. Serving Newton, Guildford, Surrey Central, Cloverdale, and more.");

    // Set canonical
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", "https://c2crental.com/surrey");

    // Open Graph tags
    const ogTags = [
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "C2C Rental" },
      { property: "og:title", content: "Car Rental in Surrey, BC | Affordable & Local – C2C Rental" },
      { property: "og:description", content: "Economy cars, SUVs, and minivans from $45/day in Surrey, BC. No hidden fees. Book with C2C Rental today." },
      { property: "og:url", content: "https://c2crental.com/surrey" },
      { property: "og:image", content: "https://c2crental.com/og-surrey.jpg" },
    ];

    ogTags.forEach(({ property, content }) => {
      let tag = document.querySelector(`meta[property="${property}"]`);
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", property);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    });

    // LocalBusiness + CarRental JSON-LD
    const localBusinessSchema = {
      "@context": "https://schema.org",
      "@type": ["LocalBusiness", "CarRental"],
      "@id": "https://c2crental.com/#organization",
      "name": "C2C Rental",
      "url": "https://c2crental.com",
      "logo": "https://c2crental.com/logo.png",
      "image": "https://c2crental.com/og-image.jpg",
      "description": "C2C Rental is a local peer-to-peer car rental platform serving Surrey, Langley, and Abbotsford, BC. Affordable daily, weekly, and monthly vehicle rentals with no hidden fees.",
      "telephone": "+1-604-763-4242",
      "address": {
        "@type": "PostalAddress",
        "streetAddress": "6786 King George Blvd",
        "addressLocality": "Surrey",
        "addressRegion": "BC",
        "postalCode": "V3W 4Z1",
        "addressCountry": "CA"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": 49.1565,
        "longitude": -122.8487
      },
      "areaServed": [
        { "@type": "City", "name": "Surrey" },
        { "@type": "City", "name": "Langley" },
        { "@type": "City", "name": "Abbotsford" }
      ],
      "serviceArea": {
        "@type": "AdministrativeArea",
        "name": "Fraser Valley, British Columbia"
      },
      "priceRange": "$$",
      "openingHoursSpecification": [
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
          "opens": "08:00",
          "closes": "18:00"
        },
        {
          "@type": "OpeningHoursSpecification",
          "dayOfWeek": "Sunday",
          "opens": "11:00",
          "closes": "17:00"
        }
      ],
      "sameAs": [
        "https://www.instagram.com/c2crental",
        "https://www.facebook.com/c2crental"
      ]
    };

    // FAQPage JSON-LD
    const faqPageSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What documents do I need to rent a car in Surrey with C2C Rental?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "You will need a valid driver's licence, a credit card in the renter's name for the security deposit, and in some cases proof of insurance or additional ID. International drivers may need their passport and, depending on their home country, an International Driving Permit."
          }
        },
        {
          "@type": "Question",
          "name": "Can I rent a car if I'm a new or young driver in BC?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "We consider applications from new and younger drivers on a case-by-case basis. Age minimums, additional deposits, or extra insurance may apply. Contact us with your details and we will confirm eligibility before you book."
          }
        },
        {
          "@type": "Question",
          "name": "Do you offer long-term or monthly car rentals in Surrey?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. We provide weekly and monthly rental options for Surrey residents, students, and workers who need a car for longer periods. Long-term rentals often come with better rates and more flexible kilometre packages."
          }
        },
        {
          "@type": "Question",
          "name": "Can I use a C2C Rental vehicle for rideshare or delivery work?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Use of our vehicles for rideshare and delivery platforms (Uber, Lyft, SkipTheDishes, DoorDash) depends on the vehicle and our insurance rules. You must disclose your planned use at booking so we can confirm what is allowed and what coverage is required."
          }
        },
        {
          "@type": "Question",
          "name": "Are winter tires included on rentals in Surrey?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "During the winter season and for trips to areas requiring winter tires, we can provide vehicles with appropriate tires, subject to availability. Let us know your travel dates and destination when booking."
          }
        },
        {
          "@type": "Question",
          "name": "Can I drive outside Surrey or out of province?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Most rentals can be used throughout Metro Vancouver and within British Columbia, but out-of-province travel must be approved in advance. Always confirm your route with our team so your insurance and contract stay valid."
          }
        },
        {
          "@type": "Question",
          "name": "What happens if I get a ticket or toll during my rental?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Tickets, tolls, and parking fines are the renter's responsibility. If we receive notices after your rental, we may charge the amount due plus an administrative fee to the card on file."
          }
        },
        {
          "@type": "Question",
          "name": "How do damage inspections work at pickup and drop-off?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "We complete a walk-around inspection with photos at both pickup and drop-off so there is a clear record of the vehicle's condition. Any new damage not noted at pickup is assessed according to our damage policy and your coverage."
          }
        }
      ]
    };

    const schemas = [
      { id: "surrey-localbusiness-jsonld", data: localBusinessSchema },
      { id: "surrey-faqpage-jsonld", data: faqPageSchema },
    ];

    schemas.forEach(({ id, data }) => {
      let script = document.getElementById(id);
      if (!script) {
        script = document.createElement("script");
        script.id = id;
        script.setAttribute("type", "application/ld+json");
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(data);
    });

    return () => {
      schemas.forEach(({ id }) => {
        document.getElementById(id)?.remove();
      });
      canonical?.remove();
    };
  }, []);

  return (
    <CustomerLayout>
      <PageContainer className="max-w-4xl mx-auto space-y-16">
        {/* H1 + Intro */}
        <section className="space-y-6">
          <h1 className="text-3xl md:text-4xl font-bold text-foreground leading-tight">
            Car Rental in Surrey, BC – Affordable, Local &amp; Hassle-Free
          </h1>
          <p className="text-base md:text-lg text-muted-foreground leading-relaxed">
            Need a reliable car rental in Surrey without surprise fees or complicated rules? C2C Rental is a local Surrey-based car rental service offering affordable daily, weekly, and monthly rentals for commuters, families, students, and visitors. Book online in minutes, pick up in Surrey, and hit the road with clear pricing, flexible insurance options, and real local support. Whether you need a compact car for your daily commute through Newton and Guildford, or a spacious SUV for a weekend trip to Whistler, we have the right vehicle at the right price — with no hidden fees or last-minute upsells at the counter.
          </p>
        </section>

        {/* Why Choose C2C */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-accent" />
            Why Choose C2C Rental in Surrey?
          </h2>
          <ul className="space-y-3 text-muted-foreground">
            {[
              "Local Surrey-based team that understands 604 traffic, parking, and ICBC rules",
              "Competitive rates with no hidden add-ons at the counter",
              "Flexible terms: daily, weekly, long-term and replacement rentals",
              "Simple digital contracts, fast check-in, easy extensions by phone or online",
              "Options for new drivers, students, and visitors (subject to licence and insurance checks)",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Vehicle Cards */}
        <section className="space-y-6">
          <h2 className="text-2xl font-bold text-foreground">Our Vehicles Available in Surrey</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {vehicleCards.map((v) => (
              <Card key={v.category} className="flex flex-col justify-between hover:shadow-md transition-shadow">
                <CardContent className="p-5 space-y-3 flex-1">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center">
                      <v.icon className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-base">{v.category}</h3>
                      <p className="text-sm text-muted-foreground">{v.example}</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">{v.useCase}</p>
                  <p className="text-lg font-bold text-foreground">{v.rate}</p>
                </CardContent>
                <div className="px-5 pb-5">
                  <Button asChild className="w-full" size="default">
                    <Link to="/search">Book Now <ArrowRight className="ml-1 h-4 w-4" /></Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">
            All vehicles are regularly maintained, cleaned before each rental, and equipped for Lower Mainland weather. Car seats, extra storage, and winter tires available on request.
          </p>
        </section>

        {/* Popular Trips */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold text-foreground">Popular Surrey Trips &amp; Use Cases</h2>
          <ul className="space-y-3 text-muted-foreground">
            {[
              "Commuting between Surrey, Langley, and Delta when your own car is in the shop",
              "Airport trips to YVR (20 min) or Abbotsford International (45 min)",
              "Visiting Vancouver, Burnaby, or Metro Vancouver",
              "Weekend drives to Whistler (2.5 hrs), Harrison Hot Springs, Cultus Lake, or the Okanagan",
              "Temporary wheels for newcomers, international students, and workers waiting on their own vehicle",
              "US border crossings via Peace Arch or Pacific Highway",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Pickup & Service Area */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="h-6 w-6 text-accent" />
            Surrey Pickup, Delivery &amp; Service Area
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            We serve drivers across Surrey, including Newton, Guildford, Fleetwood, Cloverdale, Whalley/Surrey Central, and South Surrey. Depending on your booking and vehicle, we can arrange convenient pickup from our Surrey location or limited local delivery (subject to availability and fee). We also coordinate with body shops for insurance replacement rentals.
          </p>
        </section>

        {/* Simple Booking Process */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-accent" />
            Simple Booking Process
          </h2>
          <ol className="space-y-4">
            {bookingSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-4">
                <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary text-primary-foreground text-sm font-bold shrink-0">
                  {i + 1}
                </span>
                <span className="text-muted-foreground pt-1">{step}</span>
              </li>
            ))}
          </ol>
          <p className="text-sm text-muted-foreground italic">
            Extensions, changes, and early returns are usually simple — contact us as early as possible so we can adjust your booking.
          </p>
        </section>

        {/* Insurance, Deposits & Requirements */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-accent" />
            Insurance, Deposits &amp; Requirements in Surrey
          </h2>
          <ul className="space-y-3 text-muted-foreground">
            {[
              "Valid full driver's licence required (BC or accepted international licence)",
              "Minimum age: 21 (25 for premium vehicles)",
              "Must hold a valid licence for minimum 2 years",
              "Security deposit taken on a valid credit card at pickup",
              "All C2C vehicles covered under ICBC owner's certificate",
              "Optional damage waiver available at checkout",
              "Winter tires installed November–March on all AWD/4WD vehicles",
              "US border crossings: contact C2C before booking for cross-border insurance documentation",
              "Clear policy on fuel, kilometres, tolls, tickets, and damage inspections",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground italic">
            Our team will walk you through exact requirements before you confirm — no surprises.
          </p>
        </section>

        {/* FAQ */}
        <section className="space-y-5">
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <HelpCircle className="h-6 w-6 text-accent" />
            Frequently Asked Questions – Car Rental in Surrey, BC
          </h2>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((faq, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left text-foreground font-medium">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

        {/* Cross-links */}
        <section className="text-sm text-muted-foreground">
          C2C Rental also serves:{" "}
          <Link to="/langley" className="text-accent underline underline-offset-2 hover:text-accent/80">Langley</Link>
          {" "}and{" "}
          <Link to="/abbotsford" className="text-accent underline underline-offset-2 hover:text-accent/80">Abbotsford</Link>
        </section>

        {/* CTA Banner */}
        <section className="rounded-xl bg-primary text-primary-foreground p-8 md:p-12 text-center space-y-4">
          <h2 className="text-2xl md:text-3xl font-bold">Ready to book your Surrey car rental?</h2>
          <p className="text-primary-foreground/80 max-w-lg mx-auto">
            Browse available vehicles now — no hidden fees, local support, and flexible terms.
          </p>
          <Button asChild variant="hero" size="xl">
            <Link to="/search">View Available Cars in Surrey <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
          <p className="text-sm text-primary-foreground/60 pt-2">
            <Link to="/contact" className="underline underline-offset-2 hover:text-primary-foreground/90">Questions? Contact our team →</Link>
          </p>
        </section>
      </PageContainer>
    </CustomerLayout>
  );
};

export default SurreyPage;
