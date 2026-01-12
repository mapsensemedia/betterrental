import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Shield, 
  Plus, 
  Minus, 
  DollarSign, 
  Clock,
  CheckCircle,
  ArrowDown,
  ArrowUp,
} from "lucide-react";
import { useDepositLedger, useAddDepositLedgerEntry } from "@/hooks/use-deposit-ledger";
import { DepositStatusBadge, type DepositStatus } from "@/components/shared/DepositStatusBadge";

interface DepositLedgerPanelProps {
  bookingId: string;
  depositAmount: number | null;
}

export function DepositLedgerPanel({ bookingId, depositAmount }: DepositLedgerPanelProps) {
  const { data: summary, isLoading } = useDepositLedger(bookingId);
  const addEntry = useAddDepositLedgerEntry();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"hold" | "deduct" | "release">("hold");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const handleOpenAction = (type: "hold" | "deduct" | "release") => {
    setActionType(type);
    setAmount(type === "hold" ? (depositAmount?.toString() || "") : "");
    setReason("");
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!amount || parseFloat(amount) <= 0) return;
    
    addEntry.mutate({
      bookingId,
      action: actionType,
      amount: parseFloat(amount),
      reason: reason || undefined,
    }, {
      onSuccess: () => {
        setDialogOpen(false);
        setAmount("");
        setReason("");
      }
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="animate-pulse h-20 bg-muted rounded" />
        </CardContent>
      </Card>
    );
  }

  const status = summary?.status || "not_required";
  const held = summary?.held || 0;
  const released = summary?.released || 0;
  const deducted = summary?.deducted || 0;
  const remaining = summary?.remaining || 0;

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Deposit
          </span>
          <DepositStatusBadge status={status as DepositStatus} amount={depositAmount || 0} />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-4 gap-2 text-sm">
          <div className="text-center p-2 bg-muted/30 rounded">
            <p className="text-muted-foreground text-xs">Required</p>
            <p className="font-medium">${depositAmount || 0}</p>
          </div>
          <div className="text-center p-2 bg-blue-500/5 rounded">
            <p className="text-muted-foreground text-xs">Held</p>
            <p className="font-medium text-blue-600">${held}</p>
          </div>
          <div className="text-center p-2 bg-red-500/5 rounded">
            <p className="text-muted-foreground text-xs">Deducted</p>
            <p className="font-medium text-red-600">${deducted}</p>
          </div>
          <div className="text-center p-2 bg-green-500/5 rounded">
            <p className="text-muted-foreground text-xs">Released</p>
            <p className="font-medium text-green-600">${released}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {status === "not_required" || status === "due" ? (
            <Button size="sm" variant="outline" onClick={() => handleOpenAction("hold")}>
              <Plus className="w-3 h-3 mr-1" /> Hold Deposit
            </Button>
          ) : null}
          {(status === "held" || status === "partially_released") && remaining > 0 && (
            <>
              <Button size="sm" variant="outline" onClick={() => handleOpenAction("deduct")}>
                <Minus className="w-3 h-3 mr-1" /> Deduct
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleOpenAction("release")}>
                <CheckCircle className="w-3 h-3 mr-1" /> Release
              </Button>
            </>
          )}
        </div>

        {/* Ledger history */}
        {summary?.entries && summary.entries.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">History</p>
              <div className="space-y-1.5">
                {summary.entries.map((entry: any) => (
                  <div key={entry.id} className="flex items-center justify-between text-sm p-2 bg-muted/20 rounded">
                    <div className="flex items-center gap-2">
                      {entry.action === "hold" ? (
                        <ArrowDown className="w-3 h-3 text-blue-500" />
                      ) : entry.action === "release" ? (
                        <ArrowUp className="w-3 h-3 text-green-500" />
                      ) : (
                        <Minus className="w-3 h-3 text-red-500" />
                      )}
                      <span className="capitalize">{entry.action}</span>
                      {entry.reason && (
                        <span className="text-muted-foreground">- {entry.reason}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${
                        entry.action === "hold" ? "text-blue-600" :
                        entry.action === "release" ? "text-green-600" : "text-red-600"
                      }`}>
                        {entry.action === "hold" ? "+" : "-"}${entry.amount}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), "MMM d, HH:mm")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>

      {/* Action Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="capitalize">{actionType} Deposit</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Amount ($)</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                min="0"
                max={actionType === "hold" ? depositAmount || undefined : remaining}
              />
              {actionType !== "hold" && (
                <p className="text-xs text-muted-foreground mt-1">
                  Available to {actionType}: ${remaining}
                </p>
              )}
            </div>
            <div>
              <Label>Reason {actionType !== "hold" && "(required)"}</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={
                  actionType === "deduct" 
                    ? "e.g., Fuel charge, cleaning fee, damage..." 
                    : actionType === "release"
                    ? "e.g., Rental completed, no issues found..."
                    : "e.g., Card hold confirmed..."
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleSubmit}
              disabled={!amount || parseFloat(amount) <= 0 || addEntry.isPending || (actionType !== "hold" && !reason.trim())}
            >
              {addEntry.isPending ? "Processing..." : `Confirm ${actionType}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
