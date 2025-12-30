import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PromoBannerProps {
  title: string;
  subtitle?: string;
  discount?: string;
  discountLabel?: string;
  ctaText?: string;
  ctaLink?: string;
  imageUrl?: string;
  className?: string;
}

export function PromoBanner({
  title,
  subtitle,
  discount,
  discountLabel,
  ctaText = "Book Now",
  ctaLink = "/search",
  imageUrl,
  className,
}: PromoBannerProps) {
  return (
    <section className={cn("relative overflow-hidden rounded-3xl bg-foreground", className)}>
      {/* Background Image */}
      {imageUrl && (
        <img
          src={imageUrl}
          alt=""
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
      )}

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-foreground via-foreground/80 to-transparent" />

      {/* Content */}
      <div className="relative z-10 px-8 py-16 md:px-16 md:py-20 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="max-w-lg">
          <h2 className="heading-2 text-card mb-4">{title}</h2>
          {subtitle && (
            <p className="text-card/80 mb-6">{subtitle}</p>
          )}
          <Button variant="hero" size="lg" asChild>
            <Link to={ctaLink}>{ctaText}</Link>
          </Button>
        </div>

        {/* Discount Badge */}
        {discount && (
          <div className="bg-primary text-primary-foreground rounded-2xl px-8 py-6 text-center">
            <div className="text-4xl font-bold">{discount}</div>
            {discountLabel && (
              <div className="text-sm mt-1 opacity-90">{discountLabel}</div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
