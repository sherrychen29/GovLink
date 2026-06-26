// Client helper — POSTs the report to the server-side rendering endpoint
// and triggers a browser download. All font/PDF logic lives in the API route
// (src/app/api/report-pdf/route.ts) which runs in Node.js where fonts resolve
// reliably from the filesystem.
import type { Report } from "./types";

export async function downloadReportPdf(report: Report): Promise<void> {
  const res = await fetch("/api/report-pdf", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(report),
  });
  if (!res.ok) throw new Error(`PDF generation failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${report.id}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}
