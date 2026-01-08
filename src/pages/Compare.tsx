import { useMemo } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, X, Users, Fuel, Gauge, Check, Minus } from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useVehicle, type Vehicle } from "@/hooks/use-vehicles";
import { PriceDisclaimer } from "@/components/shared/PriceWithDisclaimer";
import { displayFuelType, displayTransmission } from "@/lib/utils";

const defaultFeatures = [
  "Air Conditioning",
  "Bluetooth",
  "Navigation",
  "Backup Camera",
  "Keyless Entry",
  "USB Charging",
  "Heated Seats",
  "Sunroof",
];

export default function Compare() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const ids = searchParams.get("ids")?.split(",").filter(Boolean) || [];

  // Fetch all vehicles
  const { data: vehicle1, isLoading: loading1 } = useVehicle(ids[0] || null);
  const { data: vehicle2, isLoading: loading2 } = useVehicle(ids[1] || null);
  const { data: vehicle3, isLoading: loading3 } = useVehicle(ids[2] || null);

  const vehicles = [vehicle1, vehicle2, vehicle3].filter(Boolean) as Vehicle[];
  const isLoading = loading1 || loading2 || loading3;

  const removeVehicle = (vehicleId: string) => {
    const newIds = ids.filter((id) => id !== vehicleId);
    if (newIds.length < 2) {
      navigate("/search");
    } else {
      setSearchParams({ ids: newIds.join(",") });
    }
  };

  // Collect all unique features across vehicles
  const allFeatures = useMemo(() => {
    const features = new Set<string>();
    vehicles.forEach((v) => {
      const vehicleFeatures = Array.isArray(v.featuresJson)
        ? (v.featuresJson as string[])
        : defaultFeatures;
      vehicleFeatures.forEach((f) => features.add(f));
    });
    return Array.from(features);
  }, [vehicles]);

  const getVehicleFeatures = (vehicle: Vehicle): string[] => {
    return Array.isArray(vehicle.featuresJson)
      ? (vehicle.featuresJson as string[])
      : defaultFeatures;
  };

  if (ids.length < 2) {
    return (
      <CustomerLayout>
        <PageContainer className="pt-28 pb-16">
          <div className="text-center py-16">
            <h2 className="text-xl font-semibold mb-2">Not Enough Vehicles</h2>
            <p className="text-muted-foreground mb-6">
              Select at least 2 vehicles to compare
            </p>
            <Button asChild>
              <Link to="/search">Browse Vehicles</Link>
            </Button>
          </div>
        </PageContainer>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout>
      <PageContainer className="pt-28 pb-16">
        {/* Back Button */}
        <Link
          to="/search"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Search
        </Link>

        <h1 className="heading-2 mb-8">Compare Vehicles</h1>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].slice(0, ids.length).map((i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="aspect-[4/3] rounded-2xl" />
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[768px]">
              {/* Vehicle Cards Row */}
              <div
                className="grid gap-4 mb-8"
                style={{
                  gridTemplateColumns: `repeat(${vehicles.length}, 1fr)`,
                }}
              >
                {vehicles.map((vehicle) => (
                  <div
                    key={vehicle.id}
                    className="relative rounded-2xl border border-border overflow-hidden bg-card"
                  >
                    {/* Remove Button */}
                    <button
                      onClick={() => removeVehicle(vehicle.id)}
                      className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-card/90 backdrop-blur-sm flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {/* Image */}
                    <div className="aspect-[4/3] bg-muted">
                      {vehicle.imageUrl ? (
                        <img
                          src={vehicle.imageUrl}
                          alt={`${vehicle.make} ${vehicle.model}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Gauge className="w-12 h-12 text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">
                            {vehicle.make} {vehicle.model}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {vehicle.year}
                          </p>
                        </div>
                        <Badge variant="secondary">{vehicle.category}</Badge>
                      </div>
                      <div className="text-2xl font-bold text-primary">
                        ${vehicle.dailyRate}<span className="text-destructive">*</span>
                        <span className="text-sm font-normal text-muted-foreground">
                          /day
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">*Price does not include taxes and fees</p>
                      <Button className="w-full mt-4" size="sm" asChild>
                        <Link to={`/vehicle/${vehicle.id}`}>View Details</Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Comparison Table */}
              <div className="rounded-2xl border border-border overflow-hidden">
                {/* Basic Specs */}
                <CompareSection title="Basic Specifications">
                  <CompareRow
                    label="Seats"
                    values={vehicles.map((v) => (
                      <div key={v.id} className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>{v.seats || 5}</span>
                      </div>
                    ))}
                  />
                  <CompareRow
                    label="Fuel Type"
                    values={vehicles.map((v) => (
                      <div key={v.id} className="flex items-center gap-2">
                        <Fuel className="w-4 h-4 text-muted-foreground" />
                        <span>{displayFuelType(v.fuelType)}</span>
                      </div>
                    ))}
                  />
                  <CompareRow
                    label="Transmission"
                    values={vehicles.map((v) => (
                      <div key={v.id} className="flex items-center gap-2">
                        <Gauge className="w-4 h-4 text-muted-foreground" />
                        <span>{displayTransmission(v.transmission)}</span>
                      </div>
                    ))}
                  />
                  <CompareRow
                    label="Year"
                    values={vehicles.map((v) => (
                      <span key={v.id}>{v.year}</span>
                    ))}
                  />
                </CompareSection>

                {/* Pricing */}
                <CompareSection title="Pricing">
                  <CompareRow
                    label="Daily Rate"
                    values={vehicles.map((v) => (
                      <span key={v.id} className="font-semibold text-primary">
                        ${v.dailyRate}*/day
                      </span>
                    ))}
                  />
                  <CompareRow
                    label="3-Day Total"
                    values={vehicles.map((v) => (
                      <span key={v.id}>${(v.dailyRate * 3 * 1.1).toFixed(0)}*</span>
                    ))}
                  />
                  <CompareRow
                    label="7-Day Total"
                    values={vehicles.map((v) => (
                      <span key={v.id}>${(v.dailyRate * 7 * 1.1).toFixed(0)}*</span>
                    ))}
                  />
                  <div className="p-3 bg-muted/50">
                    <PriceDisclaimer variant="summary" />
                  </div>
                </CompareSection>

                {/* Features */}
                <CompareSection title="Features">
                  {allFeatures.map((feature) => (
                    <CompareRow
                      key={feature}
                      label={feature}
                      values={vehicles.map((v) => {
                        const vehicleFeatures = getVehicleFeatures(v);
                        const hasFeature = vehicleFeatures.includes(feature);
                        return (
                          <span key={v.id}>
                            {hasFeature ? (
                              <Check className="w-5 h-5 text-success" />
                            ) : (
                              <Minus className="w-5 h-5 text-muted-foreground/30" />
                            )}
                          </span>
                        );
                      })}
                    />
                  ))}
                </CompareSection>
              </div>
            </div>
          </div>
        )}
      </PageContainer>
    </CustomerLayout>
  );
}

function CompareSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="bg-muted px-4 py-3 font-semibold text-sm">{title}</div>
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

function CompareRow({
  label,
  values,
}: {
  label: string;
  values: React.ReactNode[];
}) {
  return (
    <div
      className="grid items-center px-4 py-3"
      style={{
        gridTemplateColumns: `200px repeat(${values.length}, 1fr)`,
      }}
    >
      <div className="text-sm text-muted-foreground">{label}</div>
      {values.map((value, idx) => (
        <div key={idx} className="text-sm text-center">
          {value}
        </div>
      ))}
    </div>
  );
}
