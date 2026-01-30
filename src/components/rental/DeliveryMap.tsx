/**
 * DeliveryMap - Shows route from customer location to nearest dealership
 */
import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { useMapboxToken } from "@/hooks/use-mapbox-token";
import { cn } from "@/lib/utils";
import "mapbox-gl/dist/mapbox-gl.css";

interface DeliveryMapProps {
  customerLat: number;
  customerLng: number;
  dealershipLat: number;
  dealershipLng: number;
  dealershipName: string;
  className?: string;
  onRouteCalculated?: (distanceKm: number, durationMins: number) => void;
}

export function DeliveryMap({
  customerLat,
  customerLng,
  dealershipLat,
  dealershipLng,
  dealershipName,
  className,
  onRouteCalculated,
}: DeliveryMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const { data: mapboxToken, isLoading: tokenLoading } = useMapboxToken();
  const [isLoading, setIsLoading] = useState(true);
  const [routeInfo, setRouteInfo] = useState<{
    distance: number;
    duration: number;
  } | null>(null);

  useEffect(() => {
    if (!mapboxToken || !mapContainer.current || map.current) return;

    const initMap = async () => {
      try {
        // Dynamic import mapbox-gl
        const mapboxgl = (await import("mapbox-gl")).default;
        mapboxgl.accessToken = mapboxToken;

        // Create map
        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [
            (customerLng + dealershipLng) / 2,
            (customerLat + dealershipLat) / 2,
          ],
          zoom: 10,
        });

        // Add navigation controls
        map.current.addControl(
          new mapboxgl.NavigationControl({ visualizePitch: false }),
          "top-right"
        );

        // Wait for map to load
        map.current.on("load", async () => {
          // Add customer marker (blue)
          new mapboxgl.Marker({ color: "#3b82f6" })
            .setLngLat([customerLng, customerLat])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 }).setText("Your Location")
            )
            .addTo(map.current);

          // Add dealership marker (green)
          new mapboxgl.Marker({ color: "#22c55e" })
            .setLngLat([dealershipLng, dealershipLat])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 }).setText(dealershipName)
            )
            .addTo(map.current);

          // Fetch and display route
          try {
            const response = await fetch(
              `https://api.mapbox.com/directions/v5/mapbox/driving/${customerLng},${customerLat};${dealershipLng},${dealershipLat}?geometries=geojson&access_token=${mapboxToken}`
            );

            if (response.ok) {
              const data = await response.json();
              const route = data.routes[0];

              if (route) {
                // Add route to map
                map.current.addSource("route", {
                  type: "geojson",
                  data: {
                    type: "Feature",
                    properties: {},
                    geometry: route.geometry,
                  },
                });

                map.current.addLayer({
                  id: "route",
                  type: "line",
                  source: "route",
                  layout: {
                    "line-join": "round",
                    "line-cap": "round",
                  },
                  paint: {
                    "line-color": "#dc2626",
                    "line-width": 5,
                    "line-opacity": 0.8,
                  },
                });

                // Calculate distance and duration
                const distanceKm = route.distance / 1000;
                const durationMins = Math.ceil(route.duration / 60);

                setRouteInfo({
                  distance: distanceKm,
                  duration: durationMins,
                });

                if (onRouteCalculated) {
                  onRouteCalculated(distanceKm, durationMins);
                }

                // Fit bounds to show entire route
                const coordinates = route.geometry.coordinates;
                const bounds = coordinates.reduce(
                  (bounds: any, coord: [number, number]) => {
                    return bounds.extend(coord);
                  },
                  new mapboxgl.LngLatBounds(coordinates[0], coordinates[0])
                );

                map.current.fitBounds(bounds, {
                  padding: 50,
                });
              }
            }
          } catch (error) {
            console.error("Error fetching route:", error);
          }

          setIsLoading(false);
        });
      } catch (error) {
        console.error("Error initializing map:", error);
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
  }, [
    mapboxToken,
    customerLat,
    customerLng,
    dealershipLat,
    dealershipLng,
    dealershipName,
    onRouteCalculated,
  ]);

  if (tokenLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center bg-muted rounded-xl",
          className
        )}
        style={{ minHeight: "300px" }}
      >
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
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
        className="w-full h-full"
        style={{ minHeight: className?.includes("h-[") ? undefined : "350px" }}
      />
    </div>
  );
}
