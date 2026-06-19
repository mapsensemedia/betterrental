import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

/**
 * Underline-style tabs matching the Payments page treatment:
 * text labels, 2px underline on the active tab, no pill background.
 *
 * Drop-in replacement for shadcn's Tabs/TabsList/TabsTrigger/TabsContent.
 */
export const UnderlineTabs = TabsPrimitive.Root;

export const UnderlineTabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      "inline-flex items-center gap-6 border-b border-border w-full",
      className,
    )}
    {...props}
  />
));
UnderlineTabsList.displayName = "UnderlineTabsList";

export const UnderlineTabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      "relative -mb-px py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
      "data-[state=active]:text-foreground",
      "after:absolute after:left-0 after:right-0 after:-bottom-px after:h-0.5 after:bg-transparent",
      "data-[state=active]:after:bg-foreground",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm",
      className,
    )}
    {...props}
  />
));
UnderlineTabsTrigger.displayName = "UnderlineTabsTrigger";

export const UnderlineTabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-6 focus-visible:outline-none", className)}
    {...props}
  />
));
UnderlineTabsContent.displayName = "UnderlineTabsContent";
