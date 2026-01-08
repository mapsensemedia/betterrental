import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Display helpers for vehicle specs
export const displayFuelType = (fuel: string | null | undefined): string => {
  if (!fuel) return "Gas";
  return fuel.toLowerCase() === "petrol" ? "Gas" : fuel;
};

export const displayTransmission = (_trans: string | null | undefined): string => "Automatic";
