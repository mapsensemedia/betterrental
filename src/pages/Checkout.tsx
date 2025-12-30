import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  Clock,
  Shield,
  CreditCard,
  ChevronRight,
  Check,
  MapPin,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { CustomerLayout } from "@/components/layout/CustomerLayout";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import bmwImage from "@/assets/cars/bmw-i4.jpg";

const vehicle = {
  id: "1",
  make: "BMW",
  model: "i4 M50",
  year: 2024,
  dailyRate: 280,
  depositAmount: 500,
  imageUrl: bmwImage,
};

const addOns = [
  {
    id: "1",
    name: "GPS Navigation",
    description: "Premium GPS with live traffic",
    dailyRate: 15,
    oneTimeFee: 0,
  },
  {
    id: "2",
    name: "Child Seat",
    description: "ISOFIX compatible",
    dailyRate: 12,
    oneTimeFee: 0,
  },
  {
    id: "3",
    name: "Additional Driver",
    description: "Add an extra authorized driver",
    dailyRate: 20,
    oneTimeFee: 0,
  },
  {
    id: "4",
    name: "Premium Insurance",
    description: "Zero deductible coverage",
    dailyRate: 45,
    oneTimeFee: 0,
  },
  {
    id: "5",
    name: "Prepaid Fuel",
    description: "Start full, return empty",
    dailyRate: 0,
    oneTimeFee: 75,
  },
];

export default function Checkout() {
  const [searchParams] = useSearchParams();
  const [selectedAddOns, setSelectedAddOns] = useState<string[]>([]);
  const [holdTimer] = useState(15 * 60); // 15 minutes in seconds
  const [step, setStep] = useState(1);

  const days = 3;
  const basePrice = vehicle.dailyRate * days;
  const addOnPrice = selectedAddOns.reduce((acc, id) => {
    const addOn = addOns.find((a) => a.id === id);
    return acc + (addOn ? addOn.dailyRate * days + addOn.oneTimeFee : 0);
  }, 0);
  const subtotal = basePrice + addOnPrice;
  const taxAmount = subtotal * 0.1;
  const total = subtotal + taxAmount;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const toggleAddOn = (id: string) => {
    setSelectedAddOns((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <CustomerLayout>
      <PageContainer className="pt-28 pb-12">
        {/* Hold Timer Banner */}
        <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Vehicle reserved for you</p>
              <p className="text-sm text-muted-foreground">
                Complete checkout before the timer expires
              </p>
            </div>
          </div>
          <div className="text-2xl font-bold text-primary">
            {formatTime(holdTimer)}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Progress Steps */}
            <div className="flex items-center gap-4">
              {["Add-ons", "Details", "Payment"].map((label, idx) => (
                <div key={label} className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step > idx + 1
                        ? "bg-success text-success-foreground"
                        : step === idx + 1
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step > idx + 1 ? <Check className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span
                    className={
                      step >= idx + 1
                        ? "font-medium"
                        : "text-muted-foreground"
                    }
                  >
                    {label}
                  </span>
                  {idx < 2 && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground mx-2" />
                  )}
                </div>
              ))}
            </div>

            {/* Step 1: Add-ons */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h2 className="heading-3 mb-2">Enhance your rental</h2>
                  <p className="text-muted-foreground">
                    Add extras to make your trip more comfortable
                  </p>
                </div>

                <div className="grid gap-4">
                  {addOns.map((addOn) => (
                    <div
                      key={addOn.id}
                      onClick={() => toggleAddOn(addOn.id)}
                      className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                        selectedAddOns.includes(addOn.id)
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Checkbox
                            checked={selectedAddOns.includes(addOn.id)}
                          />
                          <div>
                            <p className="font-medium">{addOn.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {addOn.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {addOn.dailyRate > 0 && (
                            <p className="font-medium">
                              ${addOn.dailyRate}/day
                            </p>
                          )}
                          {addOn.oneTimeFee > 0 && (
                            <p className="font-medium">
                              ${addOn.oneTimeFee} one-time
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  variant="hero"
                  size="lg"
                  className="w-full"
                  onClick={() => setStep(2)}
                >
                  Continue to Details
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            )}

            {/* Step 2: Details */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h2 className="heading-3 mb-2">Your details</h2>
                  <p className="text-muted-foreground">
                    Enter your information to complete the booking
                  </p>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>First Name</Label>
                    <Input placeholder="John" />
                  </div>
                  <div className="space-y-2">
                    <Label>Last Name</Label>
                    <Input placeholder="Doe" />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" placeholder="john@example.com" />
                  </div>
                  <div className="space-y-2">
                    <Label>Phone</Label>
                    <Input type="tel" placeholder="+1 (555) 123-4567" />
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setStep(1)}
                  >
                    Back
                  </Button>
                  <Button
                    variant="hero"
                    size="lg"
                    className="flex-1"
                    onClick={() => setStep(3)}
                  >
                    Continue to Payment
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Payment */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h2 className="heading-3 mb-2">Payment</h2>
                  <p className="text-muted-foreground">
                    Complete your booking securely
                  </p>
                </div>

                <div className="p-6 rounded-2xl border border-border">
                  <div className="flex items-center gap-3 mb-4">
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                    <span className="font-medium">Card Details</span>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Card Number</Label>
                      <Input placeholder="4242 4242 4242 4242" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Expiry Date</Label>
                        <Input placeholder="MM/YY" />
                      </div>
                      <div className="space-y-2">
                        <Label>CVC</Label>
                        <Input placeholder="123" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Terms */}
                <div className="flex items-start gap-3">
                  <Checkbox id="terms" />
                  <label htmlFor="terms" className="text-sm text-muted-foreground">
                    I agree to the rental terms, cancellation policy, and confirm
                    that I have a valid driver's license.
                  </label>
                </div>

                <div className="flex gap-4">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setStep(2)}
                  >
                    Back
                  </Button>
                  <Button variant="hero" size="lg" className="flex-1" asChild>
                    <Link to="/dashboard">
                      <Shield className="w-4 h-4 mr-2" />
                      Complete Booking
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar - Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-28 p-6 bg-card rounded-3xl border border-border shadow-soft">
              <h3 className="font-semibold mb-4">Order Summary</h3>

              {/* Vehicle */}
              <div className="flex gap-4 mb-6">
                <img
                  src={vehicle.imageUrl}
                  alt={`${vehicle.make} ${vehicle.model}`}
                  className="w-24 h-16 object-cover rounded-xl"
                />
                <div>
                  <p className="font-medium">
                    {vehicle.make} {vehicle.model}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {vehicle.year}
                  </p>
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-2 mb-6">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span>Jan 15 - Jan 18, 2024 ({days} days)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span>Downtown Premium Hub</span>
                </div>
              </div>

              <Separator className="mb-6" />

              {/* Pricing */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    ${vehicle.dailyRate} × {days} days
                  </span>
                  <span>${basePrice}</span>
                </div>
                {selectedAddOns.length > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Add-ons</span>
                    <span>${addOnPrice}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Taxes & fees</span>
                  <span>${taxAmount.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Security deposit</span>
                  <span className="text-muted-foreground">
                    ${vehicle.depositAmount} (refundable)
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total</span>
                  <span>${total.toFixed(0)}</span>
                </div>
              </div>

              {/* Notice */}
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <p>
                  Free cancellation up to 72 hours before pickup. Deposit
                  refunded within 7-10 business days after return.
                </p>
              </div>
            </div>
          </div>
        </div>
      </PageContainer>
    </CustomerLayout>
  );
}
