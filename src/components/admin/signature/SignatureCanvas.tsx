/**
 * SignatureCanvas - Touch/Mouse/Pen signature capture canvas
 * Supports Apple Pencil, touch, and mouse input with palm rejection
 */
import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2, Undo2, Save, RotateCcw, Pencil, Hand } from "lucide-react";
import { cn } from "@/lib/utils";

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

interface SignatureCanvasProps {
  onSave: (pngDataUrl: string, strokes: SignatureStroke[]) => void;
  onClear?: () => void;
  width?: number;
  height?: number;
  disabled?: boolean;
  className?: string;
}

export function SignatureCanvas({
  onSave,
  onClear,
  width = 600,
  height = 200,
  disabled = false,
  className,
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokes, setStrokes] = useState<SignatureStroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<SignaturePoint[]>([]);
  const [pencilOnly, setPencilOnly] = useState(false);
  const [isLandscape, setIsLandscape] = useState(true);
  const [detectedPointerType, setDetectedPointerType] = useState<string | null>(null);

  // Detect if on iPad/tablet
  const isTablet = typeof navigator !== "undefined" && /iPad|Android|tablet/i.test(navigator.userAgent);
  const isiPad = typeof navigator !== "undefined" && /iPad/i.test(navigator.userAgent);

  // Check orientation
  useEffect(() => {
    const checkOrientation = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    checkOrientation();
    window.addEventListener("resize", checkOrientation);
    return () => window.removeEventListener("resize", checkOrientation);
  }, []);

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = height;

    // Configure for signature drawing
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#1a1a1a";

    // Clear and set background
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    // Draw signature line
    ctx.strokeStyle = "#e5e5e5";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, height - 30);
    ctx.lineTo(width - 20, height - 30);
    ctx.stroke();

    // Draw "Sign here" text
    ctx.fillStyle = "#a3a3a3";
    ctx.font = "12px sans-serif";
    ctx.fillText("Sign here", 20, height - 10);

    // Reset stroke style for drawing
    ctx.strokeStyle = "#1a1a1a";
  }, [width, height]);

  // Redraw all strokes
  const redrawStrokes = useCallback(
    (strokesToDraw: SignatureStroke[]) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear canvas
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);

      // Draw signature line
      ctx.strokeStyle = "#e5e5e5";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(20, height - 30);
      ctx.lineTo(width - 20, height - 30);
      ctx.stroke();

      // Draw "Sign here" text
      ctx.fillStyle = "#a3a3a3";
      ctx.font = "12px sans-serif";
      ctx.fillText("Sign here", 20, height - 10);

      // Draw strokes
      ctx.strokeStyle = "#1a1a1a";
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      strokesToDraw.forEach((stroke) => {
        if (stroke.points.length < 2) return;

        ctx.beginPath();
        const firstPoint = stroke.points[0];
        ctx.moveTo(firstPoint.x, firstPoint.y);

        for (let i = 1; i < stroke.points.length; i++) {
          const point = stroke.points[i];
          // Adjust line width based on pressure
          ctx.lineWidth = point.pressure ? 1 + point.pressure * 2 : 2;
          ctx.lineTo(point.x, point.y);
        }
        ctx.stroke();
      });
    },
    [width, height]
  );

  // Get point from event
  const getPointFromEvent = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>): SignaturePoint | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;

      // Palm rejection: if pencilOnly mode is on, only accept pen input
      if (pencilOnly && e.pointerType !== "pen") {
        return null;
      }

      // Track detected pointer type for UI feedback
      if (e.pointerType === "pen" && detectedPointerType !== "pen") {
        setDetectedPointerType("pen");
      }

      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
        t: Date.now(),
        pressure: e.pressure > 0 ? e.pressure : undefined,
        pointerType: e.pointerType,
      };
    },
    [pencilOnly, detectedPointerType]
  );

  // Handle pointer down
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (disabled) return;

      const point = getPointFromEvent(e);
      if (!point) return;

      e.preventDefault();
      setIsDrawing(true);
      setCurrentStroke([point]);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.beginPath();
          ctx.moveTo(point.x, point.y);
        }
      }
    },
    [disabled, getPointFromEvent]
  );

  // Handle pointer move
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawing || disabled) return;

      const point = getPointFromEvent(e);
      if (!point) return;

      e.preventDefault();
      setCurrentStroke((prev) => [...prev, point]);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.strokeStyle = "#1a1a1a";
          ctx.lineWidth = point.pressure ? 1 + point.pressure * 2 : 2;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.lineTo(point.x, point.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(point.x, point.y);
        }
      }
    },
    [isDrawing, disabled, getPointFromEvent]
  );

  // Handle pointer up
  const handlePointerUp = useCallback(() => {
    if (!isDrawing) return;

    setIsDrawing(false);

    if (currentStroke.length > 1) {
      setStrokes((prev) => [...prev, { points: [...currentStroke] }]);
    }
    setCurrentStroke([]);
  }, [isDrawing, currentStroke]);

  // Clear canvas
  const handleClear = useCallback(() => {
    setStrokes([]);
    setCurrentStroke([]);
    redrawStrokes([]);
    onClear?.();
  }, [redrawStrokes, onClear]);

  // Undo last stroke
  const handleUndo = useCallback(() => {
    setStrokes((prev) => {
      const newStrokes = prev.slice(0, -1);
      redrawStrokes(newStrokes);
      return newStrokes;
    });
  }, [redrawStrokes]);

  // Save signature
  const handleSave = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || strokes.length === 0) return;

    const pngDataUrl = canvas.toDataURL("image/png");
    onSave(pngDataUrl, strokes);
  }, [strokes, onSave]);

  const hasSignature = strokes.length > 0;

  return (
    <div className={cn("space-y-4", className)}>
      {/* iPad-specific options */}
      {isiPad && (
        <div className="flex items-center justify-between gap-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            {detectedPointerType === "pen" ? (
              <Badge className="bg-primary/10 text-primary">
                <Pencil className="h-3 w-3 mr-1" />
                Apple Pencil Detected
              </Badge>
            ) : (
              <Badge variant="outline">
                <Hand className="h-3 w-3 mr-1" />
                Touch Input
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="pencil-only" className="text-sm">
              Apple Pencil Only
            </Label>
            <Switch
              id="pencil-only"
              checked={pencilOnly}
              onCheckedChange={setPencilOnly}
            />
          </div>
        </div>
      )}

      {/* Rotate hint for tablets */}
      {isTablet && !isLandscape && (
        <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg text-warning-foreground">
          <RotateCcw className="h-4 w-4" />
          <span className="text-sm">Rotate device for better signing space</span>
        </div>
      )}

      {/* Canvas */}
      <div className="relative border-2 border-dashed rounded-lg overflow-hidden bg-white">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className={cn(
            "w-full touch-none cursor-crosshair",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          style={{ maxHeight: height }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onPointerCancel={handlePointerUp}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClear}
          disabled={!hasSignature || disabled}
          className="gap-1"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Clear
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUndo}
          disabled={!hasSignature || disabled}
          className="gap-1"
        >
          <Undo2 className="h-3.5 w-3.5" />
          Undo
        </Button>
        <div className="flex-1" />
        <Button
          type="button"
          size="sm"
          onClick={handleSave}
          disabled={!hasSignature || disabled}
          className="gap-1"
        >
          <Save className="h-3.5 w-3.5" />
          Save Signature
        </Button>
      </div>
    </div>
  );
}
