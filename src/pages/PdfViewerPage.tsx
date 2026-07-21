/**
 * PDF Viewer page — used as a React route fallback.
 *
 * Mobile strategy:
 * - On mobile (Android/iOS) we redirect straight to the raw PDF URL so the
 *   browser opens it natively.
 * - On desktop the iframe renders inline as before.
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PdfViewerPageProps {
  pdfPath: string;
  title: string;
}

function PdfViewerPage({ pdfPath, title }: PdfViewerPageProps) {
  const navigate = useNavigate();

  useEffect(() => {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.replace(pdfPath);
    }
  }, [pdfPath]);

  const POLICY_BAR_HEIGHT = 72;
  const HEADER_HEIGHT = 56;
  const TOP_OFFSET = HEADER_HEIGHT + POLICY_BAR_HEIGHT;

  return (
    <div style={{ position: "fixed", inset: 0, background: "hsl(var(--background))" }}>
      {/* Fixed top bar */}
      <div
        className="fixed top-0 left-0 right-0 z-50 flex items-center gap-2 border-b border-border bg-background px-4"
        style={{ height: HEADER_HEIGHT }}
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="-ml-2"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-semibold text-foreground truncate">
          {title}
        </h1>
      </div>

      {/* Plain-language policy summary (kept in sync with the PDF) */}
      <aside
        aria-label="Key rental policies"
        className="fixed left-0 right-0 z-40 border-b border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground"
        style={{ top: HEADER_HEIGHT, height: POLICY_BAR_HEIGHT }}
      >
        <p className="leading-snug">
          <strong className="text-foreground">Late return:</strong> 30-min grace, then 25% of daily rate per hour for up to 2 hrs, then full daily rate per additional day.
        </p>
        <p className="leading-snug">
          <strong className="text-foreground">Kilometres:</strong> 1,400 km / 7 days or 4,800 km / 30 days (prorated, ~160 km/day). Excess $0.25/km, from odometer readings.
        </p>
      </aside>

      {/* Iframe with top padding to clear the bar */}
      <iframe
        src={pdfPath}
        title={title}
        style={{
          width: "100%",
          height: `calc(100% - ${TOP_OFFSET}px)`,
          marginTop: TOP_OFFSET,
          border: "none",
          display: "block",
        }}
        allow="fullscreen"
      />
    </div>
  );
}

export const Terms = () => (
  <PdfViewerPage
    pdfPath="/documents/terms-and-conditions.pdf"
    title="Terms and Conditions"
  />
);

export const Legal = () => (
  <PdfViewerPage
    pdfPath="/documents/rental-agreement.pdf"
    title="Rental Agreement"
  />
);

export const Privacy = () => (
  <PdfViewerPage
    pdfPath="/documents/terms-and-conditions.pdf"
    title="Privacy Policy"
  />
);

export default Terms;
