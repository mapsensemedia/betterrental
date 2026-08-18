import { Star, ExternalLink } from "lucide-react";
import { GBP_LINKS } from "@/constants/gbpLinks";

interface Review {
  name: string;
  meta: string;
  when: string;
  text: string;
  color: string;
}

const reviews: Review[] = [
  {
    name: "Manjinder Singh",
    meta: "Local Guide · 13 reviews · 29 photos",
    when: "2 weeks ago",
    text:
      "Just dropped the car off right now, had really good experience. Car was super clean and a special thanks to Karan he helped us alot and guided us for the best. Will return to rent in future for sure and will recommend this place to everyone. Thanks",
    color: "hsl(215 70% 45%)",
  },
  {
    name: "Vishal Randhawa",
    meta: "3 reviews · 1 photo",
    when: "a month ago",
    text:
      "Had a great experience renting with this rental place, Karan really helped me alot. They got wide variety of selection as well.",
    color: "hsl(152 58% 30%)",
  },
  {
    name: "Fizza Arshad",
    meta: "3 reviews",
    when: "a month ago",
    text:
      "We rented a car from this company. The staff is very professional. Also affordable and great services. Highly recommended.",
    color: "hsl(340 55% 45%)",
  },
  {
    name: "Pahuldeep Singh",
    meta: "Local Guide · 16 reviews · 1 photo",
    when: "a month ago",
    text:
      "Had a great experience renting through Karan. He gave me a really good deal! Will be coming back for sure 💯",
    color: "hsl(25 75% 45%)",
  },
  {
    name: "Gurjeet Singh",
    meta: "2 reviews",
    when: "2 months ago",
    text:
      "I rented a car from this company and had a great experience. The vehicle was clean, well-maintained, and ready on time. The staff were friendly and professional, and the rental process was quick and easy. I would recommend this company to anyone looking for a reliable car rental service.",
    color: "hsl(265 45% 45%)",
  },
  {
    name: "Gagan Khehra",
    meta: "3 reviews · 1 photo",
    when: "2 months ago",
    text:
      "Had a really good experience renting cars with them, really good team they have. Adding to this do come here and talk to Karan he got great sense of humour. Very happy and good guy. Highly recommended.",
    color: "hsl(195 60% 35%)",
  },
  {
    name: "Bluey B",
    meta: "4 reviews",
    when: "2 months ago",
    text:
      "Amazing service! The staff were friendly, accommodating, and very professional. The car was clean, and the pricing was affordable. I had to cancel my reservation last minute because of unexpected circumstances, and they kindly waived the cancellation fee. Highly recommended",
    color: "hsl(0 0% 30%)",
  },
  {
    name: "Harpreet Bawa",
    meta: "12 reviews · Edited",
    when: "a month ago",
    text:
      "I recently rented a vehicle from C2C Rental and had an excellent experience from start to finish.",
    color: "hsl(45 70% 35%)",
  },
  {
    name: "Boris Molade",
    meta: "6 reviews · 2 photos",
    when: "2 months ago",
    text:
      "Had a fantastic time renting a car here. It was reliable and the customer service was excellent. Highly recommended",
    color: "hsl(120 30% 35%)",
  },
  {
    name: "Harpreet",
    meta: "1 review",
    when: "5 months ago",
    text:
      "I had a fantastic experience renting a car from here. The staff, especially Karan, were super helpful and made the whole process smooth. The car was clean and in great condition too. Highly recommend their service 😊",
    color: "hsl(300 35% 40%)",
  },
  {
    name: "Avalon T",
    meta: "Local Guide · 47 reviews",
    when: "2 months ago",
    text:
      "Staff were polite and efficient. They quickly picked me up at the body repair shop and drove me back promptly after it was repaired. The car I was given was clean and was an excellent premium car — an Audi. As it was a hybrid I didn't need to pay for any gas so that was a plus.",
    color: "hsl(180 40% 30%)",
  },
];

function GoogleG({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.8-6.8C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.2C12.4 13.6 17.7 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-2.8-.4-4.1H24v8.4h12.5c-.3 2.1-1.6 5.2-4.6 7.3l7.7 6c4.5-4.2 6.5-10.2 6.5-17.6z" />
      <path fill="#FBBC05" d="M10.5 28.6A14.5 14.5 0 0 1 9.7 24c0-1.6.3-3.2.8-4.6l-7.9-6.2A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.9-6.2z" />
      <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.6-5.8l-7.7-6c-2.1 1.4-4.8 2.4-7.9 2.4-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.2C6.5 42.6 14.6 48 24 48z" />
    </svg>
  );
}

function Stars() {
  return (
    <div className="flex items-center gap-0.5" aria-label="5 out of 5 stars">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className="w-[15px] h-[15px]" style={{ color: "#FBBC05", fill: "#FBBC05" }} strokeWidth={0} />
      ))}
    </div>
  );
}

export function Testimonials() {
  return (
    <section className="section-pad bg-background" aria-labelledby="reviews-heading">
      <div className="container-corp">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-10 md:mb-14">
          <div className="max-w-2xl">
            <span className="eyebrow">Customer reviews</span>
            <h2 id="reviews-heading" className="heading-2 text-foreground">
              What drivers say about C2C Rental
            </h2>
          </div>

          <div className="card-corp px-6 py-5 flex items-center gap-5 shrink-0">
            <GoogleG className="w-8 h-8" />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[22px] font-semibold text-foreground font-display leading-none">5.0</span>
                <Stars />
              </div>
              <a
                href={GBP_LINKS.surrey}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-brand"
              >
                Google reviews
                <ExternalLink className="w-3.5 h-3.5 opacity-60" />
              </a>
            </div>
          </div>
        </div>

        <div className="scroll-row pb-2">
          {reviews.map((review, i) => (
            <figure
              key={review.name}
              className="card-corp w-[300px] sm:w-[340px] shrink-0 p-6 flex flex-col gap-4 corp-reveal"
              style={{ animationDelay: `${Math.min(i, 5) * 60}ms` }}
            >
              <div className="flex items-start gap-3">
                <span
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold shrink-0"
                  style={{ backgroundColor: review.color }}
                  aria-hidden="true"
                >
                  {review.name.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <figcaption className="text-[15px] font-semibold text-foreground truncate">
                    {review.name}
                  </figcaption>
                  <p className="text-[12px] text-muted-foreground truncate">{review.meta}</p>
                </div>
                <GoogleG className="w-4 h-4 mt-1 shrink-0" />
              </div>

              <div className="flex items-center gap-2">
                <Stars />
                <span className="text-[12px] text-muted-foreground">{review.when}</span>
              </div>

              <blockquote className="text-[14px] text-muted-foreground leading-relaxed">
                {review.text}
              </blockquote>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
