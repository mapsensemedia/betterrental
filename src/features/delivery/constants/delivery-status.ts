import { 
  Clock, 
  UserCheck, 
  Truck, 
  Navigation, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  type LucideIcon
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// DELIVERY STATUS - Single Source of Truth
// ─────────────────────────────────────────────────────────────────────────────

export const DELIVERY_STATUSES = {
  UNASSIGNED: 'unassigned',
  ASSIGNED: 'assigned',
  PICKED_UP: 'picked_up',
  EN_ROUTE: 'en_route',
  ARRIVED: 'arrived',
  DELIVERED: 'delivered',
  ISSUE: 'issue',
  CANCELLED: 'cancelled',
} as const;

export type DeliveryStatus = typeof DELIVERY_STATUSES[keyof typeof DELIVERY_STATUSES];

// ─────────────────────────────────────────────────────────────────────────────
// STATUS CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

export interface StatusConfig {
  label: string;
  shortLabel: string;
  color: 'orange' | 'amber' | 'blue' | 'purple' | 'green' | 'red' | 'gray';
  bgClass: string;
  textClass: string;
  borderClass: string;
  badgeVariant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: LucideIcon;
  stepNumber: number;
  actionLabel: string | null;
  confirmationRequired: boolean;
  description: string;
}

export const STATUS_CONFIG: Record<DeliveryStatus, StatusConfig> = {
  unassigned: {
    label: 'Unassigned',
    shortLabel: 'Unassigned',
    color: 'orange',
    bgClass: 'bg-orange-50',
    textClass: 'text-orange-700',
    borderClass: 'border-orange-200',
    badgeVariant: 'outline',
    icon: Clock,
    stepNumber: 0,
    actionLabel: null,
    confirmationRequired: false,
    description: 'Waiting for driver assignment',
  },
  assigned: {
    label: 'Assigned',
    shortLabel: 'Assigned',
    color: 'amber',
    bgClass: 'bg-amber-50',
    textClass: 'text-amber-700',
    borderClass: 'border-amber-200',
    badgeVariant: 'outline',
    icon: UserCheck,
    stepNumber: 1,
    actionLabel: 'Pick Up Vehicle',
    confirmationRequired: false,
    description: 'Driver assigned, ready for pickup',
  },
  picked_up: {
    label: 'Picked Up',
    shortLabel: 'Picked Up',
    color: 'blue',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
    badgeVariant: 'secondary',
    icon: Truck,
    stepNumber: 2,
    actionLabel: 'Start Driving',
    confirmationRequired: false,
    description: 'Vehicle collected from lot',
  },
  en_route: {
    label: 'En Route',
    shortLabel: 'En Route',
    color: 'blue',
    bgClass: 'bg-blue-50',
    textClass: 'text-blue-700',
    borderClass: 'border-blue-200',
    badgeVariant: 'secondary',
    icon: Navigation,
    stepNumber: 3,
    actionLabel: 'Arrived at Location',
    confirmationRequired: false,
    description: 'Driving to customer location',
  },
  arrived: {
    label: 'Arrived',
    shortLabel: 'Arrived',
    color: 'purple',
    bgClass: 'bg-purple-50',
    textClass: 'text-purple-700',
    borderClass: 'border-purple-200',
    badgeVariant: 'secondary',
    icon: MapPin,
    stepNumber: 4,
    actionLabel: 'Complete Handover',
    confirmationRequired: true,
    description: 'At customer location, ready for handover',
  },
  delivered: {
    label: 'Delivered',
    shortLabel: 'Complete',
    color: 'green',
    bgClass: 'bg-green-50',
    textClass: 'text-green-700',
    borderClass: 'border-green-200',
    badgeVariant: 'default',
    icon: CheckCircle2,
    stepNumber: 5,
    actionLabel: null,
    confirmationRequired: false,
    description: 'Handover completed successfully',
  },
  issue: {
    label: 'Issue Reported',
    shortLabel: 'Issue',
    color: 'red',
    bgClass: 'bg-red-50',
    textClass: 'text-red-700',
    borderClass: 'border-red-200',
    badgeVariant: 'destructive',
    icon: AlertTriangle,
    stepNumber: -1,
    actionLabel: 'Report Issue',
    confirmationRequired: true,
    description: 'Problem encountered during delivery',
  },
  cancelled: {
    label: 'Cancelled',
    shortLabel: 'Cancelled',
    color: 'gray',
    bgClass: 'bg-muted',
    textClass: 'text-muted-foreground',
    borderClass: 'border-muted',
    badgeVariant: 'secondary',
    icon: XCircle,
    stepNumber: -1,
    actionLabel: null,
    confirmationRequired: false,
    description: 'Delivery cancelled',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// STATUS TRANSITIONS (State Machine)
// ─────────────────────────────────────────────────────────────────────────────

export const STATUS_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  unassigned: ['assigned'],
  assigned: ['picked_up', 'issue', 'cancelled'],
  picked_up: ['en_route', 'issue'],
  en_route: ['arrived', 'issue'],
  arrived: ['delivered', 'issue'],
  delivered: [],
  issue: ['assigned', 'cancelled'], // Can reassign or cancel
  cancelled: [],
};

/**
 * Check if a status transition is valid
 */
export function canTransitionTo(from: DeliveryStatus, to: DeliveryStatus): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get the next valid status in the happy path
 */
export function getNextStatus(current: DeliveryStatus): DeliveryStatus | null {
  const happyPath: DeliveryStatus[] = [
    'unassigned',
    'assigned', 
    'picked_up', 
    'en_route', 
    'arrived', 
    'delivered'
  ];
  const currentIndex = happyPath.indexOf(current);
  if (currentIndex === -1 || currentIndex === happyPath.length - 1) {
    return null;
  }
  return happyPath[currentIndex + 1];
}

// ─────────────────────────────────────────────────────────────────────────────
// PORTAL STATUS MAPPING (Simplified groupings for UI)
// ─────────────────────────────────────────────────────────────────────────────

export type PortalStatus = 'pending' | 'en_route' | 'completed' | 'issue';

export const PORTAL_STATUS_MAP: Record<DeliveryStatus, PortalStatus> = {
  unassigned: 'pending',
  assigned: 'pending',
  picked_up: 'en_route',
  en_route: 'en_route',
  arrived: 'en_route',
  delivered: 'completed',
  issue: 'issue',
  cancelled: 'issue',
};

export function getPortalStatus(deliveryStatus: DeliveryStatus | null): PortalStatus {
  if (!deliveryStatus) return 'pending';
  return PORTAL_STATUS_MAP[deliveryStatus] ?? 'pending';
}

// ─────────────────────────────────────────────────────────────────────────────
// WORKFLOW STEPS (For step indicator)
// ─────────────────────────────────────────────────────────────────────────────

export interface WorkflowStep {
  id: DeliveryStatus;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const DELIVERY_WORKFLOW_STEPS: WorkflowStep[] = [
  { id: 'assigned', label: 'Assigned', description: 'Driver assigned', icon: UserCheck },
  { id: 'picked_up', label: 'Pick Up', description: 'Collect vehicle', icon: Truck },
  { id: 'en_route', label: 'En Route', description: 'Driving to customer', icon: Navigation },
  { id: 'arrived', label: 'Arrived', description: 'At location', icon: MapPin },
  { id: 'delivered', label: 'Delivered', description: 'Handover complete', icon: CheckCircle2 },
];

/**
 * Get the current step index for the workflow indicator
 */
export function getCurrentStepIndex(status: DeliveryStatus | null): number {
  if (!status) return -1;
  const index = DELIVERY_WORKFLOW_STEPS.findIndex(step => step.id === status);
  return index;
}

/**
 * Check if a step is completed
 */
export function isStepCompleted(stepId: DeliveryStatus, currentStatus: DeliveryStatus | null): boolean {
  if (!currentStatus) return false;
  const stepIndex = DELIVERY_WORKFLOW_STEPS.findIndex(s => s.id === stepId);
  const currentIndex = getCurrentStepIndex(currentStatus);
  return stepIndex >= 0 && stepIndex < currentIndex;
}

// ─────────────────────────────────────────────────────────────────────────────
// QUERY KEYS (Standardized for cache management)
// ─────────────────────────────────────────────────────────────────────────────

export const DELIVERY_QUERY_KEYS = {
  all: ['deliveries'] as const,
  lists: () => [...DELIVERY_QUERY_KEYS.all, 'list'] as const,
  list: (scope: string, status?: string) => [...DELIVERY_QUERY_KEYS.lists(), scope, status] as const,
  details: () => [...DELIVERY_QUERY_KEYS.all, 'detail'] as const,
  detail: (id: string) => [...DELIVERY_QUERY_KEYS.details(), id] as const,
  history: (id: string) => [...DELIVERY_QUERY_KEYS.all, 'history', id] as const,
};
