import { Star } from "lucide-react";

const reviews = [
  {
    name: "Harpreet S.",
    initials: "HS",
    rating: 5,
    quote:
      "Booked an SUV for a Whistler weekend. Clean vehicle, no surprise charges, and the handover took ten minutes.",
  },
  {
    name: "Melissa R.",
    initials: "MR",
    rating: 5,
    quote:
      "They delivered the car to my door in Abbotsford. Pricing was exactly what the site quoted me.",
  },
  {
    name: "Daniel K.",
    initials: "DK",
    rating: 5,
    quote:
      "Rented monthly while my truck was in the shop. Support answered every call on the first ring.",
  },
];

export function Testimonials() {
  return (
    <section className="section-pad bg-background" aria-labelledby="reviews-heading">
      <div className="container-corp">
        <div className="text-center mb-10 md:mb-14">
          <span className="eyebrow">Customer Reviews</span>
          <h2 id="reviews-heading" className="heading-2 text-foreground">
            What drivers say about C2C
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reviews.map((review, i) => (
            <figure
              key={review.name}
              className="card-corp p-7 flex flex-col items-center text-center gap-4 corp-reveal"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div className="w-12 h-12 flex items-center justify-center bg-brand-tint text-brand text-sm font-semibold">
                {review.initials}
              </div>
              <figcaption className="text-[15px] font-semibold text-foreground">
                {review.name}
              </figcaption>
              <div className="flex items-center gap-1" aria-label={`${review.rating} out of 5 stars`}>
                {Array.from({ length: review.rating }).map((_, s) => (
                  <Star key={s} className="w-4 h-4 text-brand fill-brand" strokeWidth={1.5} />
                ))}
              </div>
              <blockquote className="text-sm text-muted-foreground leading-relaxed">
                “{review.quote}”
              </blockquote>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
