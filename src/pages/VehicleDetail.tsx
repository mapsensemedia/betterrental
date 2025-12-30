import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import {
  MapPin,
  Calendar,
  Users,
  Fuel,
  Gauge,
  Check,
  ChevronLeft,
  ChevronRight,
  Shield,
  Star,
} from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import bmwImage from "@/assets/cars/bmw-i4.jpg";
import audiImage from "@/assets/cars/audi-a7.jpg";

const vehicle = {
  id: "1",
  make: "BMW",
  model: "i4 M50",
  year: 2024,
  category: "Electric",
  dailyRate: 280,
  depositAmount: 500,
  images: [bmwImage, audiImage],
  seats: 5,
  fuelType: "Electric",
  transmission: "Automatic",
  features: [
    "Electric Powertrain",
    "Autopilot",
    "Premium Sound",
    "Panoramic Roof",
    "Wireless Charging",
    "Heated Seats",
    "Navigation",
    "Backup Camera",
  ],
  description:
    "Experience the future of driving with the BMW i4 M50. This all-electric sedan combines luxury with sustainable performance, offering an exhilarating driving experience with zero emissions.",
  location: {
    name: "Downtown Premium Hub",
    address: "123 Main Street, New York, NY",
  },
};

export default function VehicleDetail() {
  const { id } = useParams();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [selectedDays, setSelectedDays] = useState(3);

  const subtotal = vehicle.dailyRate * selectedDays;
  const taxAmount = subtotal * 0.1;
  const total = subtotal + taxAmount;

  return (
    <CustomerLayout>
      <PageContainer className="pt-28 pb-32">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-foreground">
            Home
          </Link>
          <span>/</span>
          <Link to="/search" className="hover:text-foreground">
            Vehicles
          </Link>
          <span>/</span>
          <span className="text-foreground">
            {vehicle.make} {vehicle.model}
          </span>
        </nav>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column - Images & Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Gallery */}
            <div className="relative rounded-3xl overflow-hidden bg-muted aspect-[16/10]">
              <img
                src={vehicle.images[currentImageIndex]}
                alt={`${vehicle.make} ${vehicle.model}`}
                className="w-full h-full object-cover"
              />

              {/* Navigation Arrows */}
              <button
                onClick={() =>
                  setCurrentImageIndex((i) =>
                    i === 0 ? vehicle.images.length - 1 : i - 1
                  )
                }
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={() =>
                  setCurrentImageIndex((i) =>
                    i === vehicle.images.length - 1 ? 0 : i + 1
                  )
                }
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card/80 backdrop-blur-sm flex items-center justify-center hover:bg-card transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              {/* Badges */}
              <div className="absolute top-4 left-4 flex gap-2">
                <Badge variant="featured">Featured</Badge>
                <Badge variant="secondary">{vehicle.category}</Badge>
              </div>

              {/* Image Dots */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                {vehicle.images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      idx === currentImageIndex ? "bg-card" : "bg-card/50"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Title & Quick Specs */}
            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="heading-2 mb-2">
                    {vehicle.year} {vehicle.make} {vehicle.model}
                  </h1>
                  <div className="flex items-center gap-4 text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-warning fill-warning" />
                      <span>4.9</span>
                      <span>(128 reviews)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{vehicle.location.name}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Specs */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-muted text-center">
                  <Users className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-semibold">{vehicle.seats} Seats</p>
                </div>
                <div className="p-4 rounded-2xl bg-muted text-center">
                  <Fuel className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-semibold">{vehicle.fuelType}</p>
                </div>
                <div className="p-4 rounded-2xl bg-muted text-center">
                  <Gauge className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-semibold">{vehicle.transmission}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <h2 className="heading-4 mb-4">About this vehicle</h2>
              <p className="text-muted-foreground leading-relaxed">
                {vehicle.description}
              </p>
            </div>

            {/* Features */}
            <div>
              <h2 className="heading-4 mb-4">Features</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {vehicle.features.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-2 p-3 rounded-xl bg-muted"
                  >
                    <Check className="w-4 h-4 text-success" />
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Location & Map Placeholder */}
            <div>
              <h2 className="heading-4 mb-4">Pickup Location</h2>
              <div className="rounded-2xl overflow-hidden border border-border">
                <div className="h-48 bg-muted flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-muted-foreground">Map preview</p>
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-semibold">{vehicle.location.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {vehicle.location.address}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Booking Card */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 p-6 bg-card rounded-3xl border border-border shadow-soft">
              {/* Price */}
              <div className="text-center mb-6">
                <div className="text-3xl font-bold">
                  ${vehicle.dailyRate}
                  <span className="text-lg font-normal text-muted-foreground">
                    /day
                  </span>
                </div>
              </div>

              <Separator className="mb-6" />

              {/* Date Selection */}
              <div className="space-y-4 mb-6">
                <div className="p-4 rounded-xl border border-border">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Pick-up Date
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="date"
                      className="flex-1 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
                <div className="p-4 rounded-xl border border-border">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Return Date
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <input
                      type="date"
                      className="flex-1 bg-transparent focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Pricing Breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    ${vehicle.dailyRate} × {selectedDays} days
                  </span>
                  <span>${subtotal}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxes & fees</span>
                  <span>${taxAmount.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Security deposit
                  </span>
                  <span className="text-muted-foreground">
                    ${vehicle.depositAmount} (refundable)
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>${total.toFixed(0)}</span>
                </div>
              </div>

              {/* CTA */}
              <Button variant="hero" size="xl" className="w-full" asChild>
                <Link to={`/checkout?vehicle=${id}`}>Reserve Now</Link>
              </Button>

              <p className="text-center text-sm text-muted-foreground mt-4">
                Free cancellation up to 72 hours before pickup
              </p>

              {/* Trust Badges */}
              <div className="mt-6 pt-6 border-t border-border">
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Shield className="w-5 h-5 text-success" />
                  <span>Comprehensive insurance included</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>

      {/* Mobile Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border lg:hidden">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-2xl font-bold">${vehicle.dailyRate}</span>
            <span className="text-muted-foreground">/day</span>
          </div>
          <Button variant="hero" size="lg" asChild>
            <Link to={`/checkout?vehicle=${id}`}>Reserve Now</Link>
          </Button>
        </div>
      </div>
    </CustomerLayout>
  );
}
