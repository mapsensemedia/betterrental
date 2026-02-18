import { Link } from "react-router-dom";
import { ArrowRight, Car, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CTABannerProps {
  className?: string;
}

export function CTABanner({ className }: CTABannerProps) {
  return (
    <section className={cn("py-8 md:py-16 bg-background", className)}>
      <div className="container-page">
        <div className="rounded-3xl bg-foreground text-background p-6 md:p-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            {/* Content */}
            <div className="max-w-xl">
              <Badge className="bg-primary text-primary-foreground mb-4 px-3 py-1.5">
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                New Feature Available
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Skip the Pickup — We Bring the Car to You!
              </h2>
              <p className="text-background/70 text-base md:text-lg mb-4">
                Experience our premium delivery service. Select "Bring Car to Me" at checkout and we'll deliver your vehicle right to your doorstep.
              </p>
              <div className="flex items-center gap-2 text-sm text-background/60">
                <Car className="w-4 h-4" />
                <span>Available within 50km of our locations</span>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-3">
              <Button 
                asChild 
                size="lg"
                className="bg-background text-foreground hover:bg-background/90"
              >
                <Link to="/search">
                  Browse Vehicles
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
              <Button 
                asChild 
                variant="outline" 
                size="lg"
                className="border-background/50 text-background bg-background/10 hover:bg-background/20 hover:text-background"
              >
                <Link to="/contact">
                  Contact Us
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
