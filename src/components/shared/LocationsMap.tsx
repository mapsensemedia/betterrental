/**
 * LocationsMap - Interactive map showing all rental locations
 */
import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin } from "lucide-react";
import { useMapboxToken } from "@/hooks/use-mapbox-token";
import { cn } from "@/lib/utils";
import "mapbox-gl/dist/mapbox-gl.css";

interface Location {
  id: string;
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
}

interface LocationsMapProps {
  locations: Location[];
  className?: string;
  onLocationClick?: (locationId: string) => void;
}

export function LocationsMap({
  locations,
  className,
  onLocationClick,
}: LocationsMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const { data: mapboxToken, isLoading: tokenLoading, error: tokenError } = useMapboxToken();
  const [isLoading, setIsLoading] = useState(true);

  // Filter locations with valid coordinates
  const validLocations = locations.filter(
    (loc) => loc.lat !== null && loc.lng !== null
  );

  useEffect(() => {
    if (!mapboxToken || !mapContainer.current || map.current) return;
    if (validLocations.length === 0) {
      setIsLoading(false);
      return;
    }

    const initMap = async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        mapboxgl.accessToken = mapboxToken;

        // Calculate center from all locations
        const avgLat =
          validLocations.reduce((sum, loc) => sum + (loc.lat || 0), 0) /
          validLocations.length;
        const avgLng =
          validLocations.reduce((sum, loc) => sum + (loc.lng || 0), 0) /
          validLocations.length;

        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [avgLng, avgLat],
          zoom: 10,
        });

        map.current.addControl(
          new mapboxgl.NavigationControl({ visualizePitch: false }),
          "top-right"
        );

        map.current.on("load", () => {
          // Add markers for each location
          validLocations.forEach((location) => {
            if (!location.lat || !location.lng) return;

            const el = document.createElement("div");
            el.className = "locations-map-marker";
            el.innerHTML = `
              <div class="w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"></path>
                  <circle cx="12" cy="10" r="3"></circle>
                </svg>
              </div>
            `;

            if (onLocationClick) {
              el.addEventListener("click", () => onLocationClick(location.id));
            }

            const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
              <div class="p-2">
                <p class="font-semibold text-sm">${location.name}</p>
                <p class="text-xs text-gray-600">${location.address}</p>
              </div>
            `);

            new mapboxgl.Marker(el)
              .setLngLat([location.lng, location.lat])
              .setPopup(popup)
              .addTo(map.current);
          });

          // Fit bounds to show all markers
          if (validLocations.length > 1) {
            const bounds = new mapboxgl.LngLatBounds();
            validLocations.forEach((loc) => {
              if (loc.lat && loc.lng) {
                bounds.extend([loc.lng, loc.lat]);
              }
            });
            map.current.fitBounds(bounds, { padding: 60 });
          }

          setIsLoading(false);
        });
      } catch (error) {
        console.error("Error initializing locations map:", error);
        setIsLoading(false);
      }
    };

    initMap();

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [mapboxToken, validLocations, onLocationClick]);

  if (tokenLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted rounded-xl",
          className
        )}
        style={{ minHeight: "400px" }}
      >
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (tokenError || validLocations.length === 0) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center bg-muted rounded-xl",
          className
        )}
        style={{ minHeight: "400px" }}
      >
        <MapPin className="w-10 h-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          {tokenError ? "Map unavailable" : "No locations with coordinates"}
        </p>
      </div>
    );
  }

  return (
    <div className={cn("relative rounded-xl overflow-hidden", className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/50 z-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
      <div
        ref={mapContainer}
        className="w-full"
        style={{ height: "400px" }}
      />
    </div>
  );
}
