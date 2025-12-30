import { MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";

const locations = [
  { id: "1", name: "Downtown Premium Hub", address: "123 Main Street", city: "New York" },
  { id: "2", name: "Airport Terminal", address: "1 Airport Boulevard", city: "New York" },
  { id: "3", name: "Beverly Hills Lounge", address: "456 Rodeo Drive", city: "Los Angeles" },
];

export default function Locations() {
  return (
    <CustomerLayout>
      <PageContainer className="pt-28">
        <h1 className="heading-2 mb-8">Our Locations</h1>
        <div className="grid md:grid-cols-3 gap-6">
          {locations.map((loc) => (
            <Link key={loc.id} to={`/location/${loc.id}`} className="p-6 bg-card rounded-2xl border border-border hover:border-primary transition-colors">
              <MapPin className="w-8 h-8 text-primary mb-4" />
              <h3 className="font-semibold mb-1">{loc.name}</h3>
              <p className="text-sm text-muted-foreground">{loc.address}, {loc.city}</p>
            </Link>
          ))}
        </div>
      </PageContainer>
    </CustomerLayout>
  );
}
