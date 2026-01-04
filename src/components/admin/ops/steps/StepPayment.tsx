import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PaymentDepositPanel } from "@/components/admin/PaymentDepositPanel";
import { CheckCircle2, XCircle, CreditCard, Banknote } from "lucide-react";

interface StepPaymentProps {
  bookingId: string;
  completion: {
    paymentComplete: boolean;
    depositCollected: boolean;
  };
}

export function StepPayment({ bookingId, completion }: StepPaymentProps) {
  return (
    <div className="space-y-4">
      {/* Payment & Deposit Panel */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-muted-foreground" />
              <CardTitle className="text-base">Payment & Deposit</CardTitle>
            </div>
            <div className="flex gap-2">
              <Badge 
                variant="outline" 
                className={completion.paymentComplete 
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" 
                  : "text-muted-foreground"
                }
              >
                <CreditCard className="w-3 h-3 mr-1" />
                Payment {completion.paymentComplete ? "✓" : ""}
              </Badge>
              <Badge 
                variant="outline" 
                className={completion.depositCollected 
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" 
                  : "text-muted-foreground"
                }
              >
                <Banknote className="w-3 h-3 mr-1" />
                Deposit {completion.depositCollected ? "✓" : ""}
              </Badge>
            </div>
          </div>
          <CardDescription>
            Collect payment and security deposit before proceeding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaymentDepositPanel bookingId={bookingId} />
        </CardContent>
      </Card>
    </div>
  );
}
