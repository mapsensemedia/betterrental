/**
 * DeliveryAddressAutocomplete - Mapbox-powered address autocomplete
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useMapboxToken } from "@/hooks/use-mapbox-token";

interface Suggestion {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
  text: string;
}

interface DeliveryAddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (address: string, lat: number, lng: number, placeName: string) => void;
  placeholder?: string;
  className?: string;
}

export function DeliveryAddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Enter your address",
  className,
}: DeliveryAddressAutocompleteProps) {
  const { data: mapboxToken, isLoading: tokenLoading } = useMapboxToken();
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch suggestions from Mapbox Geocoding API
  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (!mapboxToken || query.length < 3) {
        setSuggestions([]);
        return;
      }

      setIsSearching(true);
      try {
        // Focus search on British Columbia, Canada
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            query
          )}.json?access_token=${mapboxToken}&country=ca&bbox=-140,48,-114,60&types=address,place&limit=5`
        );

        if (response.ok) {
          const data = await response.json();
          setSuggestions(
            data.features.map((f: any) => ({
              id: f.id,
              place_name: f.place_name,
              center: f.center,
              text: f.text,
            }))
          );
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error("Geocoding error:", error);
      } finally {
        setIsSearching(false);
      }
    },
    [mapboxToken]
  );

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (value.length >= 3) {
      debounceRef.current = setTimeout(() => {
        fetchSuggestions(value);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value, fetchSuggestions]);

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (suggestion: Suggestion) => {
    onChange(suggestion.place_name);
    onSelect(
      suggestion.place_name,
      suggestion.center[1], // lat
      suggestion.center[0], // lng
      suggestion.place_name
    );
    setShowSuggestions(false);
    setSuggestions([]);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          placeholder={tokenLoading ? "Loading..." : placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          disabled={tokenLoading}
          className="h-12 pl-10 pr-10 rounded-xl"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-[100] w-full mt-1 bg-background border border-border rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSelect(suggestion)}
              className="w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted transition-colors border-b border-border last:border-b-0"
            >
              <MapPin className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-sm text-foreground">
                {suggestion.place_name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
