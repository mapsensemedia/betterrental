import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CTABannerProps {
  className?: string;
}

export function CTABanner({ className }: CTABannerProps) {
  return (
    <section className={cn("py-16 bg-background", className)}>
      <div className="container-page">
        <div className="rounded-3xl bg-foreground text-background p-8 md:p-12">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">
            {/* Content */}
            <div className="max-w-xl">
              <Badge className="bg-primary text-primary-foreground mb-4 px-3 py-1.5">
                <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                Premium Experience
              </Badge>
              <h2 className="text-2xl md:text-3xl font-bold mb-4">
                Ready to hit the road?
              </h2>
              <p className="text-background/70 text-base md:text-lg">
                Browse our extensive fleet and find the perfect vehicle for your next adventure. 
                Flexible booking, no hidden fees, and 24/7 support.
              </p>
            </div>

            {/* Buttons */}
            <div className="flex flex-wrap gap-3">
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
                className="border-background/30 text-background hover:bg-background/10 hover:text-background"
              >
                <Link to="/locations">
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
