import * as React from "react";
import { DayPicker, DayPickerSingleProps, DayPickerRangeProps } from "react-day-picker";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { isSameDay, startOfDay } from "date-fns";

interface AvailabilityCalendarProps {
  blockedDates?: Date[];
  mode?: "single" | "range";
  selected?: Date | { from: Date | undefined; to: Date | undefined };
  onSelect?: (date: Date | { from: Date | undefined; to: Date | undefined } | undefined) => void;
  disabled?: (date: Date) => boolean;
  fromDate?: Date;
  className?: string;
  numberOfMonths?: number;
}

export function AvailabilityCalendar({
  blockedDates = [],
  mode = "single",
  selected,
  onSelect,
  disabled,
  fromDate,
  className,
  numberOfMonths = 1,
}: AvailabilityCalendarProps) {
  const isBlocked = React.useCallback(
    (date: Date) => {
      const dayStart = startOfDay(date);
      return blockedDates.some((blocked) => isSameDay(dayStart, startOfDay(blocked)));
    },
    [blockedDates]
  );

  const combinedDisabled = React.useCallback(
    (date: Date) => {
      if (isBlocked(date)) return true;
      if (disabled?.(date)) return true;
      return false;
    },
    [isBlocked, disabled]
  );

  const modifiers = {
    blocked: blockedDates.map((d) => startOfDay(d)),
    available: (date: Date) => !isBlocked(date) && (!fromDate || date >= fromDate),
  };

  const modifiersClassNames = {
    blocked: "!bg-destructive !text-destructive-foreground line-through cursor-not-allowed hover:!bg-destructive",
    available: "!bg-success/20 !text-success-foreground hover:!bg-success/30",
  };

  const baseProps = {
    showOutsideDays: true,
    className: cn("p-3", className),
    classNames: {
      months: "flex flex-col sm:flex-row space-y-4 sm:space-x-4 sm:space-y-0",
      month: "space-y-4",
      caption: "flex justify-center pt-1 relative items-center",
      caption_label: "text-sm font-medium",
      nav: "space-x-1 flex items-center",
      nav_button: cn(
        buttonVariants({ variant: "outline" }),
        "h-7 w-7 bg-transparent p-0 opacity-50 hover:opacity-100"
      ),
      nav_button_previous: "absolute left-1",
      nav_button_next: "absolute right-1",
      table: "w-full border-collapse space-y-1",
      head_row: "flex",
      head_cell: "text-muted-foreground rounded-md w-9 font-normal text-[0.8rem]",
      row: "flex w-full mt-2",
      cell: "h-9 w-9 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
      day: cn(
        buttonVariants({ variant: "ghost" }),
        "h-9 w-9 p-0 font-normal aria-selected:opacity-100"
      ),
      day_range_end: "day-range-end",
      day_selected:
        "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground",
      day_today: "bg-accent text-accent-foreground",
      day_outside:
        "day-outside text-muted-foreground opacity-50 aria-selected:bg-accent/50 aria-selected:text-muted-foreground aria-selected:opacity-30",
      day_disabled: "text-muted-foreground opacity-50 cursor-not-allowed",
      day_range_middle: "aria-selected:bg-accent aria-selected:text-accent-foreground",
      day_hidden: "invisible",
    },
    components: {
      IconLeft: () => <ChevronLeft className="h-4 w-4" />,
      IconRight: () => <ChevronRight className="h-4 w-4" />,
    },
    modifiers,
    modifiersClassNames,
    disabled: combinedDisabled,
    fromDate,
    numberOfMonths,
  };

  if (mode === "range") {
    return (
      <DayPicker
        {...(baseProps as any)}
        mode="range"
        selected={selected as { from: Date | undefined; to: Date | undefined }}
        onSelect={onSelect as any}
      />
    );
  }

  return (
    <DayPicker
      {...(baseProps as any)}
      mode="single"
      selected={selected as Date}
      onSelect={onSelect as any}
    />
  );
}
