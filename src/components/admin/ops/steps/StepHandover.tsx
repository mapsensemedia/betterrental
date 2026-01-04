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
} from "lucide-react";
import { cn } from "@/lib/utils";

interface StepHandoverProps {
  booking: any;
  completion: StepCompletion;
  onActivate: () => void;
}

export function StepHandover({ booking, completion, onActivate }: StepHandoverProps) {
  const allPrerequisitesMet = 
    completion.intake.vehicleAssigned &&
    completion.intake.licenseApproved &&
    completion.prep.checklistComplete &&
    completion.prep.photosComplete &&
    completion.checkin.identityVerified &&
    completion.payment.paymentComplete &&
    completion.payment.depositCollected &&
    completion.agreement.agreementSigned &&
    completion.walkaround.inspectionComplete &&
    completion.walkaround.customerAcknowledged;
    
  const prerequisites = [
    { label: "Vehicle Assigned", complete: completion.intake.vehicleAssigned },
    { label: "License Approved", complete: completion.intake.licenseApproved },
    { label: "Prep Checklist", complete: completion.prep.checklistComplete },
    { label: "Pre-Inspection Photos", complete: completion.prep.photosComplete },
    { label: "Identity Verified", complete: completion.checkin.identityVerified },
    { label: "Payment Collected", complete: completion.payment.paymentComplete },
    { label: "Deposit Held", complete: completion.payment.depositCollected },
    { label: "Agreement Signed", complete: completion.agreement.agreementSigned },
    { label: "Walkaround Complete", complete: completion.walkaround.inspectionComplete },
    { label: "Customer Acknowledged", complete: completion.walkaround.customerAcknowledged },
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
      {allPrerequisitesMet ? (
        <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
              <Check className="w-5 h-5" />
              Ready for Handover
            </CardTitle>
            <CardDescription className="text-emerald-600 dark:text-emerald-500">
              All prerequisites met. You can now activate the rental.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-background rounded-lg border space-y-2">
                <h4 className="font-medium">Key Handover Checklist</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>✓ Hand over vehicle keys to customer</li>
                  <li>✓ Confirm customer has reviewed vehicle condition</li>
                  <li>✓ Provide emergency contact information</li>
                  <li>✓ Explain fuel policy and return procedures</li>
                </ul>
              </div>
              
              <Button 
                size="lg" 
                className="w-full bg-emerald-600 hover:bg-emerald-700"
                onClick={onActivate}
              >
                <Key className="w-4 h-4 mr-2" />
                Activate Rental
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
