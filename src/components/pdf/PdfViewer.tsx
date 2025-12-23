import { useEffect, useMemo, useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfViewerProps {
  data: Uint8Array;
  className?: string;
}

export function PdfViewer({ data, className }: PdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(900);
  const [numPages, setNumPages] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);

  // IMPORTANT: pdf.js transfers ArrayBuffers to the worker which detaches them.
  // Create a fresh copy + keep a stable reference to avoid DataCloneError on re-renders.
  const file = useMemo(() => ({ data: data.slice(0) }), [data]);

  useEffect(() => {
    setNumPages(0);
    setLoadError(null);
  }, [data]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver(() => {
      const next = Math.max(320, Math.floor(el.clientWidth));
      setContainerWidth(next);
    });

    ro.observe(el);
    // initialize once
    setContainerWidth(Math.max(320, Math.floor(el.clientWidth)));

    return () => ro.disconnect();
  }, []);

  const pageWidth = useMemo(() => {
    // Keep some padding, and cap max width for readability
    return Math.min(980, Math.max(320, containerWidth - 32));
  }, [containerWidth]);

  return (
    <div
      ref={containerRef}
      className={cn("h-full w-full overflow-auto bg-background", className)}
    >
      <div className="mx-auto w-fit p-4">
        <Document
          file={file}
          loading={
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          }
          error={
            <div className="py-10 text-center text-sm text-muted-foreground">
              <div>Could not render this PDF.</div>
              {loadError ? (
                <div className="mt-2 break-words text-xs text-muted-foreground">
                  {loadError}
                </div>
              ) : null}
            </div>
          }
          onLoadSuccess={(info) => {
            setLoadError(null);
            setNumPages((prev) => (prev === info.numPages ? prev : info.numPages));
          }}
          onLoadError={(err) => {
            console.error("[PdfViewer] react-pdf load error", err);
            setLoadError(err instanceof Error ? err.message : "Unknown PDF error");
          }}
        >
          {Array.from({ length: numPages }, (_, idx) => (
            <div key={`page_${idx + 1}`} className="mb-4 last:mb-0">
              <Page
                pageNumber={idx + 1}
                width={pageWidth}
                renderAnnotationLayer={false}
                renderTextLayer={false}
              />
            </div>
          ))}
        </Document>
      </div>
    </div>
  );
}
