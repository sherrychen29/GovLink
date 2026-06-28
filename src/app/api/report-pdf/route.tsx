// Server-side PDF rendering; avoids browser module-splitting font issues.
// The client POSTs the report JSON; this route renders and streams the PDF back.
import { NextRequest } from "next/server";
import path from "node:path";
import React from "react";
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { Report } from "@/lib/types";
import { STATUS_META } from "@/lib/meta";
import { CITY } from "@/lib/seed";
import { corroborations } from "@/lib/types";
import { formatCoords, formatDateTime } from "@/lib/utils";

const publicDir = path.join(process.cwd(), "public");

// Register fonts inside the request handler (not at module level) so that
// Next.js server-side bundling doesn't split the FontStore singleton; the
// registration must happen on the exact same instance renderToBuffer uses.
let fontsReady = false;
function ensureFonts() {
  if (fontsReady) return;
  Font.register({
    family: "Noto Sans",
    fonts: [
      { src: path.join(publicDir, "fonts/NotoSans-400.ttf"), fontWeight: 400 },
      { src: path.join(publicDir, "fonts/NotoSans-500.ttf"), fontWeight: 500 },
      { src: path.join(publicDir, "fonts/NotoSans-600.ttf"), fontWeight: 600 },
      { src: path.join(publicDir, "fonts/NotoSans-700.ttf"), fontWeight: 700 },
    ],
  });
  Font.registerHyphenationCallback((word) => [word]);
  fontsReady = true;
}

// Palette mirrors the web app (tailwind.config.ts) so the PDF matches the
// on-screen issue display exactly.
const NAVY = "#0b2447"; // navy.900
const NAVY_700 = "#1f3a6a";
const NAVY_MUTED = "#6b7689"; // ink.muted
const RULE = "#bccfe7"; // navy.200
const RULE_LIGHT = "#dde7f3"; // navy.100
const INK = "#0b1220"; // ink.DEFAULT
const INK_SOFT = "#384256"; // ink.soft

const styles = StyleSheet.create({
  page: {
    fontFamily: "Noto Sans",
    fontSize: 9,
    color: INK,
    paddingTop: 32,
    paddingBottom: 40,
    paddingHorizontal: 40,
    lineHeight: 1.4,
  },
  masthead: {
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: NAVY,
    paddingBottom: 9,
  },
  // 1752×990 source → keep aspect ratio (no horizontal squish).
  seal: { width: 62, height: 35, marginRight: 12, objectFit: "contain" },
  mastheadText: { flexGrow: 1 },
  cityName: { fontSize: 14, fontWeight: 700, color: NAVY, letterSpacing: 0.2 },
  cityDept: {
    fontSize: 7.5,
    fontWeight: 600,
    color: NAVY_MUTED,
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: 1,
  },
  docRef: { textAlign: "right" },
  docRefLabel: { fontSize: 6.5, color: NAVY_MUTED, textTransform: "uppercase", letterSpacing: 0.8 },
  docRefValue: { fontSize: 11, fontWeight: 700, color: NAVY },
  title: { fontSize: 15, fontWeight: 700, color: NAVY, textAlign: "center", marginTop: 12 },
  subtitle: { fontSize: 8, color: NAVY_MUTED, textAlign: "center", marginTop: 2 },
  sectionHead: {
    fontSize: 8,
    fontWeight: 700,
    color: NAVY,
    textTransform: "uppercase",
    letterSpacing: 1,
    borderBottomWidth: 1,
    borderBottomColor: RULE,
    paddingBottom: 2.5,
    marginTop: 12,
    marginBottom: 6,
  },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  cell: { width: "50%", paddingRight: 12, marginBottom: 5 },
  cellFull: { width: "100%", marginBottom: 5 },
  fieldLabel: {
    fontSize: 6.5,
    fontWeight: 600,
    color: NAVY_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 0.5,
  },
  fieldValue: { fontSize: 9.5, color: INK },
  mono: { fontSize: 7.5, color: NAVY_MUTED },
  bodyText: { fontSize: 9.5, color: INK_SOFT },
  event: { flexDirection: "row", marginBottom: 6 },
  eventMarker: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: NAVY_700, marginTop: 3, marginRight: 8,
  },
  eventBody: { flexGrow: 1 },
  eventTop: { flexDirection: "row", justifyContent: "space-between" },
  eventLabel: { fontSize: 9, fontWeight: 700, color: NAVY },
  eventTime: { fontSize: 7.5, color: NAVY_MUTED },
  eventNote: { fontSize: 9, color: INK_SOFT, marginTop: 0.5 },
  note: { borderLeftWidth: 2, borderLeftColor: RULE, paddingLeft: 7, marginBottom: 5 },
  noteMeta: { fontSize: 7, fontWeight: 600, color: NAVY_MUTED, marginTop: 1 },
  confidential: { marginTop: 2, marginBottom: 1, fontSize: 7, color: NAVY_MUTED },
  footer: {
    position: "absolute",
    bottom: 22, left: 40, right: 40,
    borderTopWidth: 1, borderTopColor: RULE_LIGHT,
    paddingTop: 5,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 7,
    color: NAVY_MUTED,
  },
});

function Field({ label, value, sub, full }: { label: string; value: string; sub?: string; full?: boolean }) {
  return (
    <View style={full ? styles.cellFull : styles.cell}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
      {sub ? <Text style={styles.mono}>{sub}</Text> : null}
    </View>
  );
}

function ReportDocument({ report }: { report: Report }) {
  const loc =
    report.location.address ||
    report.location.crossStreet ||
    formatCoords(report.location.lat, report.location.lng);
  const count = corroborations(report);
  const contactValue = report.contact.anonymous
    ? "Anonymous submission"
    : [report.contact.name, report.contact.email, report.contact.phone]
        .filter(Boolean)
        .join("  ·  ") || "No contact provided";
  const history = report.statusHistory ?? [];
  const sealSrc = path.join(publicDir, "images/san-jose-seal.png");

  return (
    <Document
      title={`${report.id}; ${CITY.name} Service Request`}
      author={`City of ${CITY.name}`}
      subject="Municipal Service Request Record"
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.masthead} fixed>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image style={styles.seal} src={sealSrc} />
          <View style={styles.mastheadText}>
            <Text style={styles.cityName}>City of {CITY.name}</Text>
            <Text style={styles.cityDept}>Department of Public Works · Service Operations</Text>
          </View>
          <View style={styles.docRef}>
            <Text style={styles.docRefLabel}>File No.</Text>
            <Text style={styles.docRefValue}>{report.id}</Text>
          </View>
        </View>

        <Text style={styles.title}>Municipal Service Request Record</Text>
        <Text style={styles.subtitle}>
          Official internal record · Generated {formatDateTime(new Date().toISOString())}
        </Text>

        <Text style={styles.sectionHead}>Case Summary</Text>
        <View style={styles.grid}>
          <Field label="Tracking ID" value={report.id} />
          <Field label="Status" value={STATUS_META[report.status].label} sub={report.resolution?.rejected ? "Declined" : undefined} />
          <Field label="Category" value={report.category} />
          <Field label="Priority" value={report.servicePriority ?? "Unassigned"} sub={`Severity ${report.severity}/10`} />
          <Field label="Date filed" value={formatDateTime(report.createdAt)} />
          <Field label="Issue first noticed" value={formatDateTime(report.noticedAt)} />
        </View>

        {report.formalTitle ? (
          <View style={styles.cellFull}>
            <Text style={styles.fieldLabel}>Subject</Text>
            <Text style={[styles.fieldValue, { fontWeight: 700 }]}>{report.formalTitle}</Text>
          </View>
        ) : null}

        <Text style={styles.sectionHead}>Reported Issue</Text>
        <Text style={styles.bodyText}>{report.description}</Text>

        <Text style={styles.sectionHead}>Location &amp; Citizen</Text>
        <View style={styles.grid}>
          <Field label="Location" value={loc} sub={formatCoords(report.location.lat, report.location.lng)} full />
          <Field label="Citizen" value={contactValue} />
          <Field label="Corroborating reports" value={count >= 2 ? `${count} residents reported this issue` : "Single report"} />
          {report.media.length > 0 ? (
            <Field label="Attachments on file" value={`${report.media.length} photo/video item(s)`} full />
          ) : null}
        </View>

        <Text style={styles.sectionHead}>Internal Status Updates</Text>
        {history.length === 0 ? (
          <Text style={styles.bodyText}>No status changes recorded.</Text>
        ) : (
          history.map((ev, i) => (
            <View key={`${ev.status}-${ev.at}-${i}`} style={styles.event}>
              <View style={styles.eventMarker} />
              <View style={styles.eventBody}>
                <View style={styles.eventTop}>
                  <Text style={styles.eventLabel}>{ev.rejected ? "Declined" : STATUS_META[ev.status].label}</Text>
                  <Text style={styles.eventTime}>{formatDateTime(ev.at)}</Text>
                </View>
                {ev.note ? <Text style={styles.eventNote}>{ev.note}</Text> : null}
              </View>
            </View>
          ))
        )}

        {report.resolution ? (
          <View style={{ marginTop: 4 }}>
            <Text style={styles.fieldLabel}>
              {report.resolution.rejected ? "Resolution; declined" : "Resolution; resident notice"}
            </Text>
            <Text style={styles.bodyText}>{report.resolution.note}</Text>
            <Text style={styles.mono}>Closed {formatDateTime(report.resolution.resolvedAt)}</Text>
          </View>
        ) : null}

        {report.internalNotes.length > 0 ? (
          <>
            <Text style={styles.sectionHead}>Internal Staff Notes</Text>
            <Text style={styles.confidential}>
              Confidential - for municipal staff use only. Not part of the public record released to the citizen.
            </Text>
            {report.internalNotes.map((n) => (
              <View key={n.id} style={styles.note}>
                <Text style={styles.bodyText}>{n.text}</Text>
                <Text style={styles.noteMeta}>
                  {n.author} - {formatDateTime(n.createdAt)}
                </Text>
              </View>
            ))}
          </>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>City of {CITY.name} · Service Request {report.id}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function POST(req: NextRequest) {
  try {
    ensureFonts();
    const report: Report = await req.json();
    const buf = await renderToBuffer(<ReportDocument report={report} />);
    return new Response(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${report.id}.pdf"`,
      },
    });
  } catch (err) {
    console.error("[report-pdf]", err);
    return new Response(
      JSON.stringify({ error: "PDF generation failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
