/**
 * PDF Viewer page — used as a React route fallback.
 *
 * Mobile strategy:
 * - On mobile (Android/iOS) we redirect straight to the raw PDF URL so the
 *   browser opens it natively. This avoids:
 *   • Android "Open with…" intent chooser (triggered by iframes serving PDFs)
 *   • iOS showing only the first page inside a constrained iframe
 * - On desktop the iframe renders inline as before.
 */
import { useEffect } from "react";

interface PdfViewerPageProps {
  pdfPath: string;
  title: string;
}

function PdfViewerPage({ pdfPath, title }: PdfViewerPageProps) {
  useEffect(() => {
    // On mobile, redirect directly to the PDF so the native browser viewer
    // handles it (avoids Android chooser + iOS page-clipping bugs).
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.replace(pdfPath);
    }
  }, [pdfPath]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#fff" }}>
      <iframe
        src={pdfPath}
        title={title}
        style={{
          width: "100%",
          height: "100%",
          border: "none",
          display: "block",
        }}
        // Allow range requests so iOS can paginate correctly
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
