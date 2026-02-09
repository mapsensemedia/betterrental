// Re-export all delivery feature components and hooks
// This provides a clean public API for the feature

// Constants
export * from "./constants/delivery-status";

// Types
export type {
  DeliveryBooking,
  DeliveryDetail,
  DeliveryScope,
  DeliveryListOptions,
  StatusHistoryEntry,
  HandoverChecklistState,
  UpdateStatusInput,
  CaptureHandoverInput,
} from "./api/types";

// Type helpers
export { isDeliveryBooking, isDeliveryUrgent, isHandoverReady } from "./api/types";

// Hooks
export { useDeliveryList, useDeliveryCounts, useMyDeliveries, useAvailableDeliveries } from "./hooks/use-delivery-list";
export { useDeliveryDetail, useHandoverChecklist } from "./hooks/use-delivery-detail";
export { 
  useDeliveryActions, 
  useUpdateDeliveryStatus, 
  useCaptureHandover,
  useRecordOdometer,
  useQuickStatusUpdate 
} from "./hooks/use-delivery-actions";
export { useRealtimeDelivery, useRealtimeDeliveryDetail } from "./hooks/use-realtime-delivery";

// Components
export { StatusBadge, StatusDot } from "./components/StatusBadge";
export { DeliverySteps, StepProgress } from "./components/DeliverySteps";
export { DeliveryUnitInfo, CompactUnitInfo, VinDisplay } from "./components/DeliveryUnitInfo";
export { DeliveryActions } from "./components/DeliveryActions";
export { HandoverChecklist, InlineChecklist } from "./components/HandoverChecklist";
export { DeliveryCard } from "./components/DeliveryCard";
export { DeliveryGrid, DeliveryList } from "./components/DeliveryGrid";

// Context
export { DeliveryProvider, useDeliveryContext } from "./context/DeliveryContext";

// Utils
export * from "./utils/delivery-helpers";
