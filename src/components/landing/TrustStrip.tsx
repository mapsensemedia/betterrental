import { CheckCircle, Shield, Clock, DollarSign } from "lucide-react";
import { cn } from "@/lib/utils";

const trustItems = [
  {
    icon: CheckCircle,
    title: "Seamless booking",
    description: "Quick and easy reservation process",
  },
  {
    icon: Shield,
    title: "Premium privileges",
    description: "Exclusive benefits for regular customers",
  },
  {
    icon: Clock,
    title: "Flexible cancellation",
    description: "Change or cancel up to 72 hours before pickup",
  },
  {
    icon: DollarSign,
    title: "No recharging fees",
    description: "Transparent pricing with no hidden costs",
  },
];

interface TrustStripProps {
  className?: string;
}

export function TrustStrip({ className }: TrustStripProps) {
  return (
    <div className={cn("py-12 bg-card border-y border-border", className)}>
      <div className="container-page">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {trustItems.map((item, index) => (
            <div
              key={item.title}
              className="flex items-start gap-4 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
