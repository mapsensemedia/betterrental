import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useLocations } from "@/hooks/use-locations";

interface BookingContextType {
  locationId: string | null;
  setLocationId: (id: string | null) => void;
  startDate: Date | null;
  setStartDate: (date: Date | null) => void;
  endDate: Date | null;
  setEndDate: (date: Date | null) => void;
  locationName: string | null;
  clearBookingContext: () => void;
}

const BookingContext = createContext<BookingContextType | undefined>(undefined);

const STORAGE_KEY = "luxeride_booking_context";

export function BookingProvider({ children }: { children: ReactNode }) {
  const { data: locations = [] } = useLocations();
  
  const [locationId, setLocationIdState] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.locationId || null;
      }
    } catch {}
    return null;
  });
  
  const [startDate, setStartDateState] = useState<Date | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.startDate ? new Date(parsed.startDate) : null;
      }
    } catch {}
    return null;
  });
  
  const [endDate, setEndDateState] = useState<Date | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return parsed.endDate ? new Date(parsed.endDate) : null;
      }
    } catch {}
    return null;
  });

  // Persist to localStorage
  useEffect(() => {
    const data = {
      locationId,
      startDate: startDate?.toISOString() || null,
      endDate: endDate?.toISOString() || null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [locationId, startDate, endDate]);

  const setLocationId = (id: string | null) => {
    setLocationIdState(id);
  };

  const setStartDate = (date: Date | null) => {
    setStartDateState(date);
  };

  const setEndDate = (date: Date | null) => {
    setEndDateState(date);
  };

  const clearBookingContext = () => {
    setLocationIdState(null);
    setStartDateState(null);
    setEndDateState(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const locationName = locations.find(l => l.id === locationId)?.name || null;

  return (
    <BookingContext.Provider
      value={{
        locationId,
        setLocationId,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        locationName,
        clearBookingContext,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
}

export function useBookingContext() {
  const context = useContext(BookingContext);
  if (context === undefined) {
    throw new Error("useBookingContext must be used within a BookingProvider");
  }
  return context;
}
