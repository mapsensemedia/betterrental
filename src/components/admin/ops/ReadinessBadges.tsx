import { 
  Car, 
  User, 
  CreditCard, 
  Banknote, 
  FileText, 
  Eye,
  CheckCircle2,
  XCircle,
  Clock
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface ReadinessItem {
  id: string;
  label: string;
  status: "complete" | "pending" | "incomplete";
  onClick?: () => void;
}

interface ReadinessBadgesProps {
  items: ReadinessItem[];
  className?: string;
}

const icons: Record<string, React.ComponentType<{ className?: string }>> = {
  vehicle: Car,
  id: User,
  payment: CreditCard,
  deposit: Banknote,
  agreement: FileText,
  walkaround: Eye,
};

export function ReadinessBadges({ items, className }: ReadinessBadgesProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {items.map((item) => {
        const Icon = icons[item.id] || CheckCircle2;
        return (
          <button
            key={item.id}
            onClick={item.onClick}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-all",
              "border hover:shadow-sm cursor-pointer",
              item.status === "complete" && "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400",
              item.status === "pending" && "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-400",
              item.status === "incomplete" && "bg-muted border-border text-muted-foreground"
            )}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{item.label}</span>
            {item.status === "complete" && <CheckCircle2 className="w-3 h-3" />}
            {item.status === "pending" && <Clock className="w-3 h-3" />}
          </button>
        );
      })}
    </div>
  );
}
