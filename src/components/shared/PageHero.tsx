import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  image: string;
  imageAlt: string;
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Buttons / links rendered under the copy */
  actions?: ReactNode;
  /** Extra bottom padding when a card overlaps the hero */
  overlap?: boolean;
  /** Set on the first hero of a page for LCP */
  priority?: boolean;
  className?: string;
}

/**
 * Full-bleed photo hero matching the homepage corporate direction:
 * left-anchored copy over a soft directional scrim.
 */
export function PageHero({
  image,
  imageAlt,
  eyebrow,
  title,
  subtitle,
  actions,
  overlap = false,
  priority = false,
  className,
}: PageHeroProps) {
  return (
    <section className={cn("relative isolate overflow-hidden", className)}>
      <img
        src={image}
        alt={imageAlt}
        width={1920}
        height={1088}
        loading={priority ? "eager" : "lazy"}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(100deg, hsl(0 0% 0% / 0.78) 0%, hsl(0 0% 0% / 0.55) 42%, hsl(0 0% 0% / 0.18) 72%, hsl(0 0% 0% / 0.32) 100%)",
        }}
      />
      <div
        className={cn(
          "relative container-corp pt-24 md:pt-28",
          overlap ? "pb-36 md:pb-44" : "pb-16 md:pb-24"
        )}
      >
        <div className="corp-reveal max-w-2xl">
          {eyebrow && <span className="eyebrow text-white/75">{eyebrow}</span>}
          <h1 className="text-white font-display font-semibold leading-[1.08] tracking-tight text-[2.1rem] sm:text-[2.6rem] md:text-[3rem]">
            {title}
          </h1>
          {subtitle && (
            <p className="mt-5 text-[15px] md:text-[16px] text-white/80 leading-relaxed max-w-[52ch]">
              {subtitle}
            </p>
          )}
          {actions && <div className="mt-8 flex flex-wrap items-center gap-3">{actions}</div>}
        </div>
      </div>
    </section>
  );
}
