import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import type { StepCompletion } from "@/lib/ops-steps";
import { 
  CheckCircle2, 
  XCircle, 
  Key,
  AlertCircle,
  ArrowRight,
  Check,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StepHandoverProps {
  booking: any;
  completion: StepCompletion;
  onActivate: () => void;
  isBookingCompleted?: boolean;
}

export function StepHandover({ booking, completion, onActivate, isBookingCompleted }: StepHandoverProps) {
  const isRentalActive = booking?.status === "active";
  const isCompleted = booking?.status === "completed" || isBookingCompleted;
  
  // UPDATED: Prerequisites for handover - simplified flow
  const allPrerequisitesMet = 
    completion.checkin.govIdVerified &&
    completion.checkin.licenseOnFile &&
    completion.checkin.nameMatches &&
    completion.checkin.licenseNotExpired &&
    completion.checkin.ageVerified &&
    completion.payment.paymentComplete &&
    completion.payment.depositCollected &&
    completion.agreement.agreementSigned &&
    completion.walkaround.inspectionComplete &&
    completion.photos.photosComplete;
    
  const prerequisites = [
    { label: "Gov ID Verified", complete: completion.checkin.govIdVerified },
    { label: "License On File", complete: completion.checkin.licenseOnFile },
    { label: "Name Matches", complete: completion.checkin.nameMatches },
    { label: "License Not Expired", complete: completion.checkin.licenseNotExpired },
    { label: "Age Verified (21+)", complete: completion.checkin.ageVerified },
    { label: "Payment Collected", complete: completion.payment.paymentComplete },
    { label: "Deposit Held (manual)", complete: completion.payment.depositCollected },
    { label: "Agreement Signed (manual)", complete: completion.agreement.agreementSigned },
    { label: "Walkaround Complete (staff)", complete: completion.walkaround.inspectionComplete },
    { label: "Handover Photos", complete: completion.photos.photosComplete },
  ];
  
  const incompleteItems = prerequisites.filter(p => !p.complete);
  
  return (
    <div className="space-y-4">
      {/* Prerequisites Checklist */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Handover Prerequisites</CardTitle>
            </div>
            <Badge 
              className={allPrerequisitesMet 
                ? "bg-emerald-500/10 text-emerald-600" 
                : "bg-amber-500/10 text-amber-600"
              }
            >
              {prerequisites.filter(p => p.complete).length}/{prerequisites.length}
            </Badge>
          </div>
          <CardDescription>
            All items must be complete before activating the rental
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {prerequisites.map((prereq, i) => (
              <div 
                key={i}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg text-sm",
                  prereq.complete ? "bg-emerald-50 dark:bg-emerald-950/30" : "bg-muted"
                )}
              >
                {prereq.complete ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <span className={prereq.complete ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground"}>
                  {prereq.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {/* Activation Section */}
      {isCompleted ? (
        <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Rental Completed
            </CardTitle>
            <CardDescription className="text-emerald-600 dark:text-emerald-500">
              This rental has been completed and the vehicle has been returned.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-background rounded-lg border space-y-2">
              <h4 className="font-medium">Handover Summary</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Vehicle keys handed to customer</li>
                <li>✓ Staff completed walkaround inspection</li>
                <li>✓ Emergency contact information provided</li>
                <li>✓ Fuel policy and return procedures explained</li>
                <li>✓ SMS confirmation sent to customer</li>
                <li>✓ Rental completed successfully</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : isRentalActive ? (
        <Card className="border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-blue-700 dark:text-blue-400 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Rental Active
            </CardTitle>
            <CardDescription className="text-blue-600 dark:text-blue-500">
              This rental is currently active. The customer has the vehicle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-4 bg-background rounded-lg border space-y-2">
              <h4 className="font-medium">Handover Completed</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ Vehicle keys handed to customer</li>
                <li>✓ Staff completed walkaround inspection</li>
                <li>✓ Emergency contact information provided</li>
                <li>✓ Fuel policy and return procedures explained</li>
                <li className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  SMS confirmation sent
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>
      ) : allPrerequisitesMet ? (
        <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <Check className="w-5 h-5" />
              Ready for Handover
            </CardTitle>
            <CardDescription className="text-emerald-600 dark:text-emerald-500">
              All prerequisites met. Complete handover to activate the rental.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-background rounded-lg border space-y-2">
                <h4 className="font-medium">Key Handover Checklist</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Hand over vehicle keys to customer</li>
                  <li>✓ Provide emergency contact information</li>
                  <li>✓ Explain fuel policy and return procedures</li>
                </ul>
              </div>

              <Alert className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-700">SMS Confirmation</AlertTitle>
                <AlertDescription className="text-blue-600">
                  An SMS will be sent to the customer confirming the handover.
                </AlertDescription>
              </Alert>
              
              <Button 
                size="lg" 
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={onActivate}
              >
                <Key className="w-4 h-4 mr-2" />
                Activate Rental & Send SMS
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-700 dark:text-amber-400">Cannot Activate Yet</AlertTitle>
          <AlertDescription className="text-amber-600 dark:text-amber-500">
            Complete the following before activation: {incompleteItems.map(p => p.label).join(", ")}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
