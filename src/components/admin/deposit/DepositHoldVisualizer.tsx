/**
 * DepositHoldVisualizer
 * 
 * Animated visual component showing deposit hold status with:
 * - Progress stepper
 * - Expiration countdown
 * - Stripe IDs display
 * - Status-specific animations
 */

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Shield, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Copy,
  Check,
  Ban
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow, differenceInHours } from "date-fns";
import { DepositHoldInfo, DepositHoldStatus } from "@/hooks/use-deposit-hold";

interface DepositHoldVisualizerProps {
  depositInfo: DepositHoldInfo;
  compact?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<DepositHoldStatus, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: typeof Shield;
  animate?: boolean;
}> = {
  none: {
    label: "No Deposit",
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
    borderColor: "border-border",
    icon: CreditCard,
  },
  requires_payment: {
    label: "Awaiting Card",
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    icon: CreditCard,
    animate: true,
  },
  authorizing: {
    label: "Authorizing...",
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    icon: Loader2,
    animate: true,
  },
  authorized: {
    label: "Hold Active",
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    icon: Shield,
  },
  capturing: {
    label: "Capturing...",
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    icon: Loader2,
    animate: true,
  },
  captured: {
    label: "Captured",
    color: "text-red-600",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    icon: AlertCircle,
  },
  releasing: {
    label: "Releasing...",
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    icon: Loader2,
    animate: true,
  },
  released: {
    label: "Released",
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    icon: CheckCircle2,
  },
  failed: {
    label: "Failed",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    borderColor: "border-destructive/30",
    icon: AlertCircle,
  },
  expired: {
    label: "Expired",
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    icon: Clock,
  },
  canceled: {
    label: "Canceled",
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
    borderColor: "border-border",
    icon: Ban,
  },
};

const WORKFLOW_STEPS = [
  { key: "init", label: "Initialize" },
  { key: "auth", label: "Authorize" },
  { key: "held", label: "Held" },
  { key: "close", label: "Close" },
] as const;

function getStepIndex(status: DepositHoldStatus): number {
  switch (status) {
    case "none":
    case "requires_payment":
      return 0;
    case "authorizing":
      return 1;
    case "authorized":
      return 2;
    case "capturing":
    case "releasing":
      return 3;
    case "captured":
    case "released":
    case "canceled":
      return 4;
    default:
      return 0;
  }
}

function CopyableId({ label, value }: { label: string; value: string | null }) {
  const [copied, setCopied] = useState(false);

  if (!value) return null;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const truncated = value.length > 20 
    ? `${value.slice(0, 8)}...${value.slice(-8)}` 
    : value;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">{label}:</span>
      <code className="font-mono bg-muted px-1.5 py-0.5 rounded text-foreground">
        {truncated}
      </code>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="h-3 w-3 text-emerald-600" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{copied ? "Copied!" : `Copy ${label}`}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

export function DepositHoldVisualizer({ 
  depositInfo, 
  compact = false,
  className 
}: DepositHoldVisualizerProps) {
  const config = STATUS_CONFIG[depositInfo.status] || STATUS_CONFIG.none;
  const Icon = config.icon;
  const stepIndex = getStepIndex(depositInfo.status);

  // Calculate expiration progress
  const expiryProgress = depositInfo.expiresAt && depositInfo.authorizedAt
    ? (() => {
        const start = new Date(depositInfo.authorizedAt).getTime();
        const end = new Date(depositInfo.expiresAt).getTime();
        const now = Date.now();
        const total = end - start;
        const elapsed = now - start;
        return Math.max(0, Math.min(100, (1 - elapsed / total) * 100));
      })()
    : null;

  const hoursUntilExpiry = depositInfo.expiresAt
    ? differenceInHours(new Date(depositInfo.expiresAt), new Date())
    : null;

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <motion.div
          animate={config.animate ? { scale: [1, 1.1, 1] } : undefined}
          transition={{ repeat: Infinity, duration: 1.5 }}
        >
          <Icon className={cn("h-5 w-5", config.color, config.animate && "animate-spin")} />
        </motion.div>
        <div>
          <Badge variant="outline" className={cn(config.bgColor, config.color, config.borderColor)}>
            {config.label}
          </Badge>
          {depositInfo.amount > 0 && (
            <span className="ml-2 font-mono text-sm">
              ${depositInfo.amount.toFixed(2)}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className={cn("pb-2", config.bgColor)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <motion.div
              animate={config.animate ? { 
                rotate: config.icon === Loader2 ? 360 : 0,
                scale: [1, 1.1, 1] 
              } : undefined}
              transition={{ 
                rotate: { repeat: Infinity, duration: 1, ease: "linear" },
                scale: { repeat: Infinity, duration: 2 }
              }}
            >
              <Icon className={cn("h-5 w-5", config.color)} />
            </motion.div>
            <CardTitle className="text-base">Security Deposit</CardTitle>
          </div>
          <Badge 
            variant="outline" 
            className={cn(config.bgColor, config.color, config.borderColor, "font-medium")}
          >
            {config.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pt-4 space-y-4">
        {/* Progress Steps */}
        <div className="flex items-center justify-between">
          {WORKFLOW_STEPS.map((step, idx) => {
            const isComplete = idx < stepIndex;
            const isCurrent = idx === stepIndex - 1 || (stepIndex === 0 && idx === 0);
            const isPending = idx >= stepIndex;

            return (
              <div key={step.key} className="flex flex-col items-center flex-1">
                <motion.div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors",
                    isComplete && "bg-primary border-primary text-primary-foreground",
                    isCurrent && !isComplete && "border-primary bg-primary/10",
                    isPending && !isCurrent && "border-muted bg-background"
                  )}
                  animate={isCurrent && config.animate ? { scale: [1, 1.1, 1] } : undefined}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <span className="text-xs font-medium">{idx + 1}</span>
                  )}
                </motion.div>
                <span className={cn(
                  "text-xs mt-1",
                  isCurrent ? "font-medium text-foreground" : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Amount Display */}
        <div className={cn(
          "rounded-lg p-4 border",
          config.bgColor,
          config.borderColor
        )}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Hold Amount</span>
            <span className="text-2xl font-bold font-mono">
              ${depositInfo.amount.toFixed(2)}
              <span className="text-sm font-normal text-muted-foreground ml-1">CAD</span>
            </span>
          </div>

          {depositInfo.cardLast4 && (
            <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
              <CreditCard className="h-4 w-4" />
              <span>•••• {depositInfo.cardLast4}</span>
              {depositInfo.cardBrand && (
                <span className="capitalize">({depositInfo.cardBrand})</span>
              )}
            </div>
          )}

          {depositInfo.authorizedAt && (
            <div className="text-xs text-muted-foreground mt-2">
              Authorized: {format(new Date(depositInfo.authorizedAt), "MMM d, yyyy 'at' h:mm a")}
            </div>
          )}

          {depositInfo.capturedAt && (
            <div className="text-xs text-muted-foreground mt-1">
              Captured: {format(new Date(depositInfo.capturedAt), "MMM d, yyyy 'at' h:mm a")}
              {depositInfo.capturedAmount && (
                <span className="ml-1 font-mono">(${depositInfo.capturedAmount.toFixed(2)})</span>
              )}
            </div>
          )}

          {depositInfo.releasedAt && (
            <div className="text-xs text-muted-foreground mt-1">
              Released: {format(new Date(depositInfo.releasedAt), "MMM d, yyyy 'at' h:mm a")}
            </div>
          )}
        </div>

        {/* Expiration Timer (only for authorized holds) */}
        <AnimatePresence>
          {depositInfo.status === "authorized" && expiryProgress !== null && hoursUntilExpiry !== null && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5">
                  <Clock className={cn(
                    "h-4 w-4",
                    depositInfo.isExpiringSoon ? "text-amber-600" : "text-muted-foreground"
                  )} />
                  <span className={depositInfo.isExpiringSoon ? "text-amber-600 font-medium" : ""}>
                    {depositInfo.isExpiringSoon ? "⚠️ " : ""}
                    {depositInfo.daysUntilExpiry} day{depositInfo.daysUntilExpiry !== 1 ? "s" : ""} until expiration
                  </span>
                </div>
                <span className="text-muted-foreground text-xs">
                  {depositInfo.expiresAt && format(new Date(depositInfo.expiresAt), "MMM d")}
                </span>
              </div>
              <Progress 
                value={expiryProgress} 
                className={cn(
                  "h-2",
                  depositInfo.isExpiringSoon && "[&>div]:bg-amber-500"
                )}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stripe IDs */}
        {(depositInfo.stripePaymentIntentId || depositInfo.stripeChargeId) && (
          <div className="space-y-1 pt-2 border-t">
            <CopyableId label="PI" value={depositInfo.stripePaymentIntentId} />
            <CopyableId label="Charge" value={depositInfo.stripeChargeId} />
            <CopyableId label="PM" value={depositInfo.stripePaymentMethodId} />
          </div>
        )}

        {/* Capture Reason */}
        {depositInfo.captureReason && (
          <div className="text-sm p-2 bg-muted rounded">
            <span className="text-muted-foreground">Reason: </span>
            {depositInfo.captureReason}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
