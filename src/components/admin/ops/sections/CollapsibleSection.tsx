/**
 * CollapsibleSection - Reusable collapsible section component
 */
import { useState, useEffect } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  badge?: React.ReactNode;
}

export function CollapsibleSection({ 
  title, 
  icon, 
  children, 
  defaultOpen = false,
  isOpen: controlledIsOpen,
  onOpenChange,
  badge,
}: CollapsibleSectionProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(defaultOpen);
  
  // If controlled, use controlled value; otherwise use internal state
  const isControlled = controlledIsOpen !== undefined;
  const isOpen = isControlled ? controlledIsOpen : internalIsOpen;
  
  // Sync internal state when defaultOpen changes (for expand/collapse all)
  useEffect(() => {
    if (!isControlled) {
      setInternalIsOpen(defaultOpen);
    }
  }, [defaultOpen, isControlled]);
  
  const handleToggle = () => {
    const newValue = !isOpen;
    if (isControlled && onOpenChange) {
      onOpenChange(newValue);
    } else {
      setInternalIsOpen(newValue);
    }
  };
  
  return (
    <div className="w-full">
      <button 
        type="button"
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium">{title}</span>
          {badge}
        </div>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      
      <div 
        className={cn(
          "overflow-hidden transition-all duration-200",
          isOpen ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="px-3 pb-3 pt-1">
          {children}
        </div>
      </div>
    </div>
  );
}
