/**
 * RentalBookingContext - Extended booking context for customer rental flow
 * Persists all search and selection data across pages
 */
import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { RENTAL_LOCATIONS, getLocationById, RentalLocation } from "@/constants/rentalLocations";
import { MAX_RENTAL_DAYS, MIN_RENTAL_DAYS, calculateDeliveryFee, MAX_DELIVERY_DISTANCE_KM } from "@/lib/rental-rules";
import type { DriverAgeBand } from "@/lib/pricing";

// Delivery mode types
export type DeliveryMode = "pickup" | "delivery";

// Additional driver type
export interface AdditionalDriver {
  id: string;
  name: string;
  ageBand: DriverAgeBand;
}

// Extended search data interface
export interface RentalSearchData {
  // Location
  pickupLocationId: string | null;
  pickupLocationName: string | null;
  pickupLocationAddress: string | null;
  
  // Legacy compatibility
  pickupLocation: string | null; // Old format - set to address
  
  // Dates & times
  pickupDate: Date | null;
  pickupTime: string;
  returnDate: Date | null;
  returnTime: string;
  
  // Delivery mode fields
  deliveryMode: DeliveryMode;
  deliveryAddress: string | null;
  deliveryLat: number | null;
  deliveryLng: number | null;
  deliveryPlaceName: string | null;
  deliveryFee: number;
  deliveryDistanceKm: number | null;
  deliveryEta: string | null;
  
  // Closest center (for delivery mode)
  closestPickupCenterId: string | null;
  closestPickupCenterName: string | null;
  closestPickupCenterAddress: string | null;
  
  // Age confirmation
  ageConfirmed: boolean;
  ageRange: "20-24" | "25-70" | null;
  
  // Selected vehicle
  selectedVehicleId: string | null;
  
  // Selected extras
  selectedAddOnIds: string[];
  
  // Additional drivers
  additionalDrivers: AdditionalDriver[];
}

interface RentalBookingContextType {
  // Full search data object
  searchData: RentalSearchData;
  
  // Setters for individual fields
  setPickupLocation: (id: string) => void;
  setPickupDateTime: (date: Date | null, time: string) => void;
  setReturnDateTime: (date: Date | null, time: string) => void;
  setDeliveryMode: (mode: DeliveryMode) => void;
  setDeliveryAddress: (address: string | null, lat: number | null, lng: number | null, placeName: string | null) => void;
  setDeliveryDetails: (fee: number, distanceKm: number | null, eta: string | null) => void;
  setClosestCenter: (id: string | null, name: string | null, address: string | null) => void;
  setAgeConfirmed: (confirmed: boolean, range?: "20-24" | "25-70" | null) => void;
  setSelectedVehicle: (vehicleId: string | null) => void;
  setSelectedAddOns: (addOnIds: string[]) => void;
  toggleAddOn: (addOnId: string) => void;
  setAdditionalDrivers: (drivers: AdditionalDriver[]) => void;
  
  // Computed values
  rentalDays: number;
  isSearchValid: boolean;
  canProceedToSelectCar: boolean;
  
  // Actions
  clearSearch: () => void;
  resetContext: () => void;
  
  // Pickup locations list
  pickupLocations: RentalLocation[];
}

const STORAGE_KEY = "c2c_rental_context";

// Create context with a proper undefined check that will be handled by the provider
const RentalBookingContext = createContext<RentalBookingContextType | null>(null);

const defaultSearchData: RentalSearchData = {
  pickupLocationId: null,
  pickupLocationName: null,
  pickupLocationAddress: null,
  pickupLocation: null,
  pickupDate: null,
  pickupTime: "10:00",
  returnDate: null,
  returnTime: "10:00",
  deliveryMode: "pickup",
  deliveryAddress: null,
  deliveryLat: null,
  deliveryLng: null,
  deliveryPlaceName: null,
  deliveryFee: 0,
  deliveryDistanceKm: null,
  deliveryEta: null,
  closestPickupCenterId: null,
  closestPickupCenterName: null,
  closestPickupCenterAddress: null,
  ageConfirmed: false,
  ageRange: null,
  selectedVehicleId: null,
  selectedAddOnIds: [],
  additionalDrivers: [],
};

function loadFromStorage(): RentalSearchData {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        ...defaultSearchData,
        ...parsed,
        pickupDate: parsed.pickupDate ? new Date(parsed.pickupDate) : null,
        returnDate: parsed.returnDate ? new Date(parsed.returnDate) : null,
      };
    }
  } catch (e) {
    console.error("Failed to load rental context from storage:", e);
  }
  return defaultSearchData;
}

export function RentalBookingProvider({ children }: { children: ReactNode }) {
  const [searchData, setSearchData] = useState<RentalSearchData>(loadFromStorage);

  // Persist to localStorage
  useEffect(() => {
    const toStore = {
      ...searchData,
      pickupDate: searchData.pickupDate?.toISOString() || null,
      returnDate: searchData.returnDate?.toISOString() || null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    console.log("[RentalContext] Persisted:", toStore);
  }, [searchData]);

  // Set pickup location
  const setPickupLocation = useCallback((id: string) => {
    const location = getLocationById(id);
    if (location) {
      setSearchData((prev) => ({
        ...prev,
        pickupLocationId: location.id,
        pickupLocationName: location.name,
        pickupLocationAddress: location.address,
        pickupLocation: location.address, // Legacy compatibility
      }));
    }
  }, []);

  // Set pickup date/time
  const setPickupDateTime = useCallback((date: Date | null, time: string) => {
    setSearchData((prev) => ({
      ...prev,
      pickupDate: date,
      pickupTime: time,
    }));
  }, []);

  // Set return date/time
  const setReturnDateTime = useCallback((date: Date | null, time: string) => {
    setSearchData((prev) => ({
      ...prev,
      returnDate: date,
      returnTime: time,
    }));
  }, []);

  // Set delivery mode
  const setDeliveryMode = useCallback((mode: DeliveryMode) => {
    setSearchData((prev) => ({
      ...prev,
      deliveryMode: mode,
      // Clear delivery fields when switching to pickup
      ...(mode === "pickup" && {
        deliveryAddress: null,
        deliveryLat: null,
        deliveryLng: null,
        deliveryPlaceName: null,
        deliveryFee: 0,
        deliveryDistanceKm: null,
        deliveryEta: null,
        closestPickupCenterId: null,
        closestPickupCenterName: null,
        closestPickupCenterAddress: null,
      }),
    }));
  }, []);

  // Set delivery address
  const setDeliveryAddress = useCallback(
    (address: string | null, lat: number | null, lng: number | null, placeName: string | null) => {
      setSearchData((prev) => ({
        ...prev,
        deliveryAddress: address,
        deliveryLat: lat,
        deliveryLng: lng,
        deliveryPlaceName: placeName,
      }));
    },
    []
  );

  // Set delivery details (fee, distance, eta)
  const setDeliveryDetails = useCallback(
    (fee: number, distanceKm: number | null, eta: string | null) => {
      setSearchData((prev) => ({
        ...prev,
        deliveryFee: fee,
        deliveryDistanceKm: distanceKm,
        deliveryEta: eta,
      }));
    },
    []
  );

  // Set closest center
  const setClosestCenter = useCallback(
    (id: string | null, name: string | null, address: string | null) => {
      setSearchData((prev) => ({
        ...prev,
        closestPickupCenterId: id,
        closestPickupCenterName: name,
        closestPickupCenterAddress: address,
      }));
    },
    []
  );

  // Set age confirmed
  const setAgeConfirmed = useCallback((confirmed: boolean, range?: "20-24" | "25-70" | null) => {
    setSearchData((prev) => ({
      ...prev,
      ageConfirmed: confirmed,
      ageRange: range ?? prev.ageRange,
    }));
  }, []);

  // Set selected vehicle
  const setSelectedVehicle = useCallback((vehicleId: string | null) => {
    setSearchData((prev) => ({
      ...prev,
      selectedVehicleId: vehicleId,
    }));
  }, []);

  // Set selected add-ons
  const setSelectedAddOns = useCallback((addOnIds: string[]) => {
    setSearchData((prev) => ({
      ...prev,
      selectedAddOnIds: addOnIds,
    }));
  }, []);

  // Toggle add-on
  const toggleAddOn = useCallback((addOnId: string) => {
    setSearchData((prev) => ({
      ...prev,
      selectedAddOnIds: prev.selectedAddOnIds.includes(addOnId)
        ? prev.selectedAddOnIds.filter((id) => id !== addOnId)
        : [...prev.selectedAddOnIds, addOnId],
    }));
  }, []);

  // Set additional drivers
  const setAdditionalDrivers = useCallback((drivers: AdditionalDriver[]) => {
    setSearchData((prev) => ({
      ...prev,
      additionalDrivers: drivers,
    }));
  }, []);

  // Clear search (but keep age confirmation)
  const clearSearch = useCallback(() => {
    setSearchData({
      ...defaultSearchData,
      ageConfirmed: searchData.ageConfirmed,
    });
  }, [searchData.ageConfirmed]);

  // Full reset
  const resetContext = useCallback(() => {
    setSearchData(defaultSearchData);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Computed: rental days (capped to max)
  const rentalDays = (() => {
    if (!searchData.pickupDate || !searchData.returnDate) return 1;
    const diffTime = Math.abs(searchData.returnDate.getTime() - searchData.pickupDate.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // Clamp between min and max rental days
    return Math.max(MIN_RENTAL_DAYS, Math.min(days || 1, MAX_RENTAL_DAYS));
  })();
  
  // Computed: is rental duration valid
  const isRentalDurationValid = (() => {
    if (!searchData.pickupDate || !searchData.returnDate) return true;
    const diffTime = Math.abs(searchData.returnDate.getTime() - searchData.pickupDate.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return days >= MIN_RENTAL_DAYS && days <= MAX_RENTAL_DAYS;
  })();

  // Computed: is search valid (has minimum required data)
  const isSearchValid = (() => {
    const hasLocation =
      searchData.deliveryMode === "delivery"
        ? searchData.deliveryAddress !== null && searchData.deliveryLat !== null
        : searchData.pickupLocationId !== null;
    
    const hasDates = searchData.pickupDate !== null && searchData.returnDate !== null;
    
    return hasLocation && hasDates;
  })();

  // Computed: can proceed to select car
  const canProceedToSelectCar = (() => {
    if (!isSearchValid) return false;
    if (!searchData.ageConfirmed) return false;
    if (!isRentalDurationValid) return false;
    
    // If delivery mode, check distance limit
    if (searchData.deliveryMode === "delivery") {
      if (searchData.deliveryDistanceKm !== null && searchData.deliveryDistanceKm > MAX_DELIVERY_DISTANCE_KM) {
        return false;
      }
    }
    
    return true;
  })();

  return (
    <RentalBookingContext.Provider
      value={{
        searchData,
        setPickupLocation,
        setPickupDateTime,
        setReturnDateTime,
        setDeliveryMode,
        setDeliveryAddress,
        setDeliveryDetails,
        setClosestCenter,
        setAgeConfirmed,
        setSelectedVehicle,
        setSelectedAddOns,
        toggleAddOn,
        setAdditionalDrivers,
        rentalDays,
        isSearchValid,
        canProceedToSelectCar,
        clearSearch,
        resetContext,
        pickupLocations: RENTAL_LOCATIONS,
      }}
    >
      {children}
    </RentalBookingContext.Provider>
  );
}

export function useRentalBooking() {
  const context = useContext(RentalBookingContext);
  if (context === null) {
    throw new Error("useRentalBooking must be used within a RentalBookingProvider");
  }
  return context;
}
