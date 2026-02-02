/**
 * WebHID Signature Pad Hook
 * Handles connection and input streaming from USB signature pads
 */
import { useState, useCallback, useRef, useEffect } from "react";

export interface SignaturePoint {
  x: number;
  y: number;
  t: number;
  pressure?: number;
  pointerType?: string;
}

export interface SignatureStroke {
  points: SignaturePoint[];
}

interface WebHIDState {
  isSupported: boolean;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  deviceName: string | null;
}

// Known signature pad vendor IDs
const SIGNATURE_PAD_FILTERS = [
  { vendorId: 0x056A }, // Wacom
  { vendorId: 0x0908 }, // Topaz
  { vendorId: 0x0451 }, // Texas Instruments (signature pads)
  { vendorId: 0x0B57 }, // Signotec
  { vendorId: 0x2B23 }, // ePadLink
];

// WebHID types (not available in all TypeScript configs)
interface HIDDevice {
  productName: string;
  open: () => Promise<void>;
  close: () => Promise<void>;
  addEventListener: (event: string, callback: (e: HIDInputReportEvent) => void) => void;
  removeEventListener: (event: string, callback: (e: HIDInputReportEvent) => void) => void;
}

interface HIDInputReportEvent {
  data: DataView;
}

interface NavigatorHID {
  requestDevice: (options: { filters: Array<{ vendorId: number }> }) => Promise<HIDDevice[]>;
}

export function useWebHIDSignature() {
  const [state, setState] = useState<WebHIDState>({
    isSupported: typeof navigator !== "undefined" && "hid" in navigator,
    isConnected: false,
    isConnecting: false,
    error: null,
    deviceName: null,
  });

  const deviceRef = useRef<HIDDevice | null>(null);
  const strokesRef = useRef<SignatureStroke[]>([]);
  const currentStrokeRef = useRef<SignaturePoint[]>([]);
  const onInputCallbackRef = useRef<((point: SignaturePoint) => void) | null>(null);
  const onStrokeEndRef = useRef<(() => void) | null>(null);

  // Check if WebHID is supported
  const checkSupport = useCallback(() => {
    const supported = typeof navigator !== "undefined" && "hid" in navigator;
    setState((prev) => ({ ...prev, isSupported: supported }));
    return supported;
  }, []);

  // Parse input report from signature pad (varies by device)
  const parseInputReport = useCallback((event: HIDInputReportEvent) => {
    const data = event.data;
    if (!data || data.byteLength < 6) return;

    // Generic signature pad parsing - adjust based on actual device
    // Most pads send: button state, x low, x high, y low, y high, pressure
    const buttonState = data.getUint8(0);
    const x = data.getUint16(1, true);
    const y = data.getUint16(3, true);
    const pressure = data.byteLength >= 6 ? data.getUint8(5) / 255 : undefined;

    const isPenDown = (buttonState & 0x01) !== 0;
    const point: SignaturePoint = {
      x: x,
      y: y,
      t: Date.now(),
      pressure,
      pointerType: "pen",
    };

    if (isPenDown) {
      currentStrokeRef.current.push(point);
      onInputCallbackRef.current?.(point);
    } else if (currentStrokeRef.current.length > 0) {
      // Pen lifted - end stroke
      strokesRef.current.push({ points: [...currentStrokeRef.current] });
      currentStrokeRef.current = [];
      onStrokeEndRef.current?.();
    }
  }, []);

  // Connect to signature pad
  const connect = useCallback(async () => {
    if (!state.isSupported) {
      setState((prev) => ({
        ...prev,
        error: "WebHID is not supported in this browser. Please use Chrome or Edge.",
      }));
      return false;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      // Request device access
      const hid = (navigator as unknown as { hid: NavigatorHID }).hid;
      const devices = await hid.requestDevice({
        filters: SIGNATURE_PAD_FILTERS,
      });

      if (devices.length === 0) {
        setState((prev) => ({
          ...prev,
          isConnecting: false,
          error: "No signature pad selected. Please try again.",
        }));
        return false;
      }

      const device = devices[0];
      await device.open();

      device.addEventListener("inputreport", parseInputReport);
      deviceRef.current = device;

      setState((prev) => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        deviceName: device.productName || "Signature Pad",
        error: null,
      }));

      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to connect to signature pad";
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error: message,
      }));
      return false;
    }
  }, [state.isSupported, parseInputReport]);

  // Disconnect from device
  const disconnect = useCallback(async () => {
    if (deviceRef.current) {
      try {
        deviceRef.current.removeEventListener("inputreport", parseInputReport);
        await deviceRef.current.close();
      } catch {
        // Ignore close errors
      }
      deviceRef.current = null;
    }

    setState((prev) => ({
      ...prev,
      isConnected: false,
      deviceName: null,
    }));
  }, [parseInputReport]);

  // Set callbacks for input events
  const setInputCallback = useCallback((callback: (point: SignaturePoint) => void) => {
    onInputCallbackRef.current = callback;
  }, []);

  const setStrokeEndCallback = useCallback((callback: () => void) => {
    onStrokeEndRef.current = callback;
  }, []);

  // Get all strokes
  const getStrokes = useCallback(() => {
    return [...strokesRef.current];
  }, []);

  // Clear strokes
  const clearStrokes = useCallback(() => {
    strokesRef.current = [];
    currentStrokeRef.current = [];
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    setInputCallback,
    setStrokeEndCallback,
    getStrokes,
    clearStrokes,
    checkSupport,
  };
}
