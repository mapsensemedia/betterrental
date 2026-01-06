import { useMemo } from "react";
import { Check, FileText, CreditCard, Car, Clock, Flag, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface BookingProgressStepperProps {
  bookingStatus: string;
  hasLicenseVerified: boolean;
  hasAgreementGenerated: boolean;
  hasAgreementSigned: boolean;
  hasPayment: boolean;
  hasWalkaround: boolean;
}

interface Step {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: "completed" | "current" | "upcoming";
}

export function BookingProgressStepper({
  bookingStatus,
  hasLicenseVerified,
  hasAgreementGenerated,
  hasAgreementSigned,
  hasPayment,
  hasWalkaround,
}: BookingProgressStepperProps) {
  const steps = useMemo<Step[]>(() => {
    // Determine step statuses based on booking state
    const isActive = bookingStatus === "active";
    const isCompleted = bookingStatus === "completed";
    const isCancelled = bookingStatus === "cancelled";

    if (isCancelled) {
      return [
        { id: "cancelled", label: "Cancelled", icon: <Flag className="h-4 w-4" />, status: "completed" },
      ];
    }

    const stepDefinitions = [
      {
        id: "license",
        label: "License",
        icon: <Shield className="h-4 w-4" />,
        isComplete: hasLicenseVerified,
      },
      {
        id: "agreement",
        label: "Agreement",
        icon: <FileText className="h-4 w-4" />,
        isComplete: hasAgreementSigned,
      },
      {
        id: "payment",
        label: "Payment",
        icon: <CreditCard className="h-4 w-4" />,
        isComplete: hasPayment,
      },
      {
        id: "pickup",
        label: "Pickup",
        icon: <Car className="h-4 w-4" />,
        isComplete: hasWalkaround && (isActive || isCompleted),
      },
      {
        id: "active",
        label: "Active",
        icon: <Clock className="h-4 w-4" />,
        isComplete: isActive || isCompleted,
      },
      {
        id: "return",
        label: "Return",
        icon: <Flag className="h-4 w-4" />,
        isComplete: isCompleted,
      },
    ];

    // Find the first incomplete step to mark as current
    let foundCurrent = false;
    return stepDefinitions.map((step) => {
      if (step.isComplete) {
        return { ...step, status: "completed" as const };
      } else if (!foundCurrent) {
        foundCurrent = true;
        return { ...step, status: "current" as const };
      } else {
        return { ...step, status: "upcoming" as const };
      }
    });
  }, [bookingStatus, hasLicenseVerified, hasAgreementSigned, hasPayment, hasWalkaround]);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-center flex-1">
            {/* Step Circle */}
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all",
                  step.status === "completed" && "bg-primary border-primary text-primary-foreground",
                  step.status === "current" && "border-primary text-primary bg-primary/10",
                  step.status === "upcoming" && "border-muted-foreground/30 text-muted-foreground/50 bg-muted"
                )}
              >
                {step.status === "completed" ? (
                  <Check className="h-5 w-5" />
                ) : (
                  step.icon
                )}
              </div>
              <span
                className={cn(
                  "text-xs mt-2 font-medium text-center",
                  step.status === "completed" && "text-primary",
                  step.status === "current" && "text-foreground",
                  step.status === "upcoming" && "text-muted-foreground/50"
                )}
              >
                {step.label}
              </span>
            </div>

            {/* Connector Line */}
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-2 mt-[-1.5rem]",
                  step.status === "completed" ? "bg-primary" : "bg-muted-foreground/20"
                )}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}