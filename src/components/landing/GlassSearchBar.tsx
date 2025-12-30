import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Calendar, Clock, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface GlassSearchBarProps {
  className?: string;
}

export function GlassSearchBar({ className }: GlassSearchBarProps) {
  const navigate = useNavigate();
  const [rentalType, setRentalType] = useState<"distance" | "hourly" | "flat">("distance");

  const handleSearch = () => {
    navigate("/search");
  };

  return (
    <div className={cn("glass rounded-2xl p-6 shadow-xl", className)}>
      {/* Rental Type Tabs */}
      <div className="flex justify-center mb-6">
        <div className="inline-flex bg-muted rounded-full p-1">
          {(["distance", "hourly", "flat"] as const).map((type) => (
            <button
              key={type}
              onClick={() => setRentalType(type)}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-all",
                rentalType === type
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {type === "distance" ? "Distance" : type === "hourly" ? "Hourly" : "Flat Rate"}
            </button>
          ))}
        </div>
      </div>

      {/* Search Fields */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        {/* Pick Up Address */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Pick Up Address
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="From: address, airport, hotel..."
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Drop Off Address */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Drop Off Address
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="From: address, airport, hotel..."
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Pick Up Date */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Pick Up Date
          </label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="date"
              className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Pick Up Time */}
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Pick Up Time
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="time"
                defaultValue="10:00"
                className="w-full h-12 pl-10 pr-4 rounded-xl border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            <Button onClick={handleSearch} className="h-12 px-8" variant="hero">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
