"use client";

import { useEffect, useState } from "react";
import { downloadReportPdf } from "@/lib/report-pdf";
import { buildSampleReports } from "@/lib/sample-reports";

export default function PdfTest() {
  const [result, setResult] = useState("running…");

  useEffect(() => {
    (async () => {
      try {
        const base = buildSampleReports()[0];
        const report = {
          ...base,
          internalNotes: [
            ...base.internalNotes,
            {
              id: "note_test",
              text: "TEST internal note — verify this appears in the PDF.",
              author: "QA",
              createdAt: new Date().toISOString(),
            },
          ],
        };
        await downloadReportPdf(report);
        setResult("PDF_OK — check your Downloads folder");
      } catch (e) {
        setResult(`PDF_ERROR ${(e as Error).message}`);
      }
    })();
  }, []);

  return (
    <div style={{ padding: 40, fontSize: 28, fontFamily: "monospace" }}>
      <div id="pdf-result">{result}</div>
    </div>
  );
}
