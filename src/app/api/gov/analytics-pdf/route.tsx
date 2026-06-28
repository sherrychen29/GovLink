import { NextRequest } from "next/server";
import path from "node:path";
import React from "react";
import {
  Circle,
  Document,
  Font,
  G,
  Image,
  Line,
  Page,
  Polyline,
  Rect,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";
import { CITY } from "@/lib/seed";

const publicDir = path.join(process.cwd(), "public");

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

// Palette mirrors the web app (tailwind + AnalyticsPanel chart palette).
const NAVY = "#0b2447"; // navy.900
const NAVY_MID = "#1e3a5f";
const NAVY_MUTED = "#6b7689"; // ink.muted
const RULE = "#bccfe7"; // navy.200
const RULE_LIGHT = "#dde7f3"; // navy.100
const INK = "#0b1220";
const INK_SOFT = "#384256";
const SLATE = "#64748b";
const GRID = "#e2e8f0";
const CYAN = "#06b6d4"; // solved overlay (matches web)
const BG_LIGHT = "#f1f5fb"; // navy.50

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
  sectionNote: { fontSize: 7.5, color: NAVY_MUTED, marginTop: -3, marginBottom: 5 },
  aiBlock: {
    backgroundColor: BG_LIGHT,
    borderWidth: 1,
    borderColor: RULE,
    padding: 8,
    marginBottom: 4,
  },
  aiLabel: {
    fontSize: 6.5,
    fontWeight: 700,
    color: NAVY_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  aiText: { fontSize: 9, color: INK_SOFT, lineHeight: 1.5 },
  // KPI grid
  kpiRow: { flexDirection: "row", gap: 6, marginBottom: 6 },
  kpiCell: {
    flex: 1,
    borderWidth: 1,
    borderColor: RULE,
    paddingVertical: 5,
    paddingHorizontal: 7,
  },
  kpiLabel: {
    fontSize: 6,
    fontWeight: 700,
    color: NAVY_MUTED,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: 1,
  },
  kpiValue: { fontSize: 16, fontWeight: 700, color: NAVY },
  kpiSub: { fontSize: 6.5, color: NAVY_MUTED, marginTop: 0.5 },
  chartWrap: {
    borderWidth: 1,
    borderColor: RULE_LIGHT,
    paddingVertical: 4,
    paddingHorizontal: 4,
    marginBottom: 4,
  },
  legendRow: { flexDirection: "row", justifyContent: "center", gap: 14, marginTop: 2, marginBottom: 2 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 3 },
  legendSwatch: { width: 8, height: 8, borderRadius: 1 },
  legendText: { fontSize: 7, color: INK_SOFT },
  // Tables
  tableHeader: {
    flexDirection: "row",
    backgroundColor: NAVY,
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: RULE_LIGHT,
    paddingVertical: 2.5,
    paddingHorizontal: 6,
  },
  tableRowAlt: {
    flexDirection: "row",
    backgroundColor: BG_LIGHT,
    borderBottomWidth: 1,
    borderBottomColor: RULE_LIGHT,
    paddingVertical: 2.5,
    paddingHorizontal: 6,
  },
  thCell: { fontSize: 7, fontWeight: 700, color: "#ffffff", textTransform: "uppercase", letterSpacing: 0.4 },
  tdCell: { fontSize: 8, color: INK_SOFT },
  twoCol: { flexDirection: "row", gap: 10 },
  col: { flex: 1 },
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

interface AnalyticsPdfPayload {
  year: number;
  generatedAt: string;
  totalRecords: number;
  availableYearsRange: string;
  summary: {
    total: number;
    open: number;
    resolved: number;
    criticalOpen: number;
    resolutionRate: number;
    declinedRate: number;
    avgOpenSeverity: number;
    avgResolutionDays: number | null;
    corroboratedCount: number;
    corroborationRate: number;
  };
  categoryBreakdown: { category: string; count: number; open: number }[];
  monthlyTrend: { month: string; filed: number; resolved: number }[];
  yearlyTrend: { year: string; filed: number; resolved: number; open: number }[];
  severityDistribution: { severity: number; count: number }[];
  resolutionTrend: { month: string; avgDays: number; count: number }[];
  performanceSummary?: string;
  closedCasesSummary?: string;
}

/* ---------------- Chart primitives (drawn with @react-pdf SVG) ---------------- */

const AXIS = SLATE;
const AXIS_FONT = 6;

function shortCat(name: string) {
  return name.length > 16 ? name.slice(0, 15) + "…" : name;
}

/** SVG text label — fontSize must live in `style` for react-pdf's SVG Text. */
function SText({
  x,
  y,
  fill,
  size = AXIS_FONT,
  anchor,
  children,
}: {
  x: number;
  y: number;
  fill: string;
  size?: number;
  anchor?: "start" | "middle" | "end";
  children: React.ReactNode;
}) {
  return (
    <Text x={x} y={y} fill={fill} textAnchor={anchor} style={{ fontSize: size }}>
      {children}
    </Text>
  );
}

/** Grouped vertical bar chart (1–3 series). */
function VBarChart({
  data,
  series,
  width = 515,
  height = 150,
}: {
  data: Record<string, number | string>[];
  series: { key: string; color: string }[];
  width?: number;
  height?: number;
}) {
  const padL = 22;
  const padR = 6;
  const padT = 8;
  const padB = 18;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const max = Math.max(
    1,
    ...data.flatMap((d) => series.map((s) => Number(d[s.key]) || 0))
  );
  const groupW = plotW / data.length;
  const barGap = 2;
  const barW = Math.max(2, (groupW - barGap * (series.length + 1)) / series.length);
  const ticks = [0, max / 2, max];

  return (
    <Svg width={width} height={height}>
      {/* gridlines + y ticks */}
      {ticks.map((t, i) => {
        const y = padT + plotH - (t / max) * plotH;
        return (
          <G key={i}>
            <Line x1={padL} y1={y} x2={width - padR} y2={y} stroke={GRID} strokeWidth={0.5} />
            <SText x={padL - 3} y={y + 2} fill={AXIS} anchor="end">
              {Math.round(t)}
            </SText>
          </G>
        );
      })}
      {/* bars */}
      {data.map((d, gi) => {
        const gx = padL + gi * groupW;
        return (
          <G key={gi}>
            {series.map((s, si) => {
              const v = Number(d[s.key]) || 0;
              const bh = (v / max) * plotH;
              const x = gx + barGap + si * (barW + barGap);
              const y = padT + plotH - bh;
              return <Rect key={si} x={x} y={y} width={barW} height={bh} fill={s.color} />;
            })}
            <SText x={gx + groupW / 2} y={height - padB + 9} fill={AXIS} anchor="middle">
              {String(d.label)}
            </SText>
          </G>
        );
      })}
      <Line x1={padL} y1={padT + plotH} x2={width - padR} y2={padT + plotH} stroke={RULE} strokeWidth={0.6} />
    </Svg>
  );
}

/** Horizontal bar chart with a labelled left axis (for categories). */
function HBarChart({
  data,
  width = 515,
  rowH = 16,
}: {
  data: { label: string; total: number; solved: number }[];
  width?: number;
  rowH?: number;
}) {
  const padL = 96;
  const padR = 24;
  const padT = 4;
  const plotW = width - padL - padR;
  const height = padT * 2 + data.length * rowH;
  const max = Math.max(1, ...data.map((d) => d.total));

  return (
    <Svg width={width} height={height}>
      {data.map((d, i) => {
        const y = padT + i * rowH;
        const barH = rowH - 6;
        const bw = (d.total / max) * plotW;
        const sw = (d.solved / max) * plotW;
        return (
          <G key={i}>
            <SText x={padL - 4} y={y + barH / 2 + 3} fill={NAVY} size={AXIS_FONT + 0.5} anchor="end">
              {shortCat(d.label)}
            </SText>
            <Rect x={padL} y={y} width={bw} height={barH} fill={NAVY_MID} />
            {/* solved overlay marker */}
            <Rect x={padL} y={y} width={sw} height={barH} fill={CYAN} fillOpacity={0.55} />
            <SText x={padL + bw + 3} y={y + barH / 2 + 3} fill={SLATE} anchor="start">
              {d.total}
            </SText>
          </G>
        );
      })}
    </Svg>
  );
}

/** Line chart (resolution timeliness). */
function LineTrend({
  data,
  width = 515,
  height = 150,
}: {
  data: { month: string; avgDays: number }[];
  width?: number;
  height?: number;
}) {
  const padL = 22;
  const padR = 8;
  const padT = 8;
  const padB = 18;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const max = Math.max(1, ...data.map((d) => d.avgDays));
  const stepX = data.length > 1 ? plotW / (data.length - 1) : plotW;
  const ticks = [0, max / 2, max];

  const pts = data
    .map((d, i) => {
      const x = padL + i * stepX;
      const y = padT + plotH - (d.avgDays / max) * plotH;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <Svg width={width} height={height}>
      {ticks.map((t, i) => {
        const y = padT + plotH - (t / max) * plotH;
        return (
          <G key={i}>
            <Line x1={padL} y1={y} x2={width - padR} y2={y} stroke={GRID} strokeWidth={0.5} />
            <SText x={padL - 3} y={y + 2} fill={AXIS} anchor="end">
              {Math.round(t)}
            </SText>
          </G>
        );
      })}
      <Polyline points={pts} fill="none" stroke={NAVY} strokeWidth={1.2} />
      {data.map((d, i) => {
        const x = padL + i * stepX;
        const y = padT + plotH - (d.avgDays / max) * plotH;
        return (
          <G key={i}>
            <Circle cx={x} cy={y} r={1.6} fill={NAVY} />
            <SText x={x} y={height - padB + 9} fill={AXIS} anchor="middle">
              {d.month}
            </SText>
          </G>
        );
      })}
      <Line x1={padL} y1={padT + plotH} x2={width - padR} y2={padT + plotH} stroke={RULE} strokeWidth={0.6} />
    </Svg>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <View style={styles.legendRow}>
      {items.map((it) => (
        <View key={it.label} style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: it.color }]} />
          <Text style={styles.legendText}>{it.label}</Text>
        </View>
      ))}
    </View>
  );
}

function Th({ flex, right, children }: { flex: number; right?: boolean; children: React.ReactNode }) {
  return <Text style={[styles.thCell, { flex, textAlign: right ? "right" : "left" }]}>{children}</Text>;
}
function Td({ flex, right, children }: { flex: number; right?: boolean; children: React.ReactNode }) {
  return <Text style={[styles.tdCell, { flex, textAlign: right ? "right" : "left" }]}>{children}</Text>;
}

/* ---------------- Document ---------------- */

function AnalyticsDocument({ d }: { d: AnalyticsPdfPayload }) {
  const sealSrc = path.join(publicDir, "images/san-jose-seal.png");

  const monthData = d.monthlyTrend.map((m) => ({ label: m.month, filed: m.filed, resolved: m.resolved }));
const sevData = d.severityDistribution.map((s) => ({ label: String(s.severity), count: s.count }));
  const catData = d.categoryBreakdown.map((c) => ({
    label: c.category,
    total: c.count,
    solved: c.count - c.open,
  }));
  const hasResolution = d.resolutionTrend.some((r) => r.count > 0);

  return (
    <Document
      title={`GovLink Service Request Analytics — ${d.year}`}
      author={`City of ${CITY.name}`}
      subject="Service Request Analytics Report"
    >
      <Page size="A4" style={styles.page}>
        {/* Masthead */}
        <View style={styles.masthead} fixed>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image style={styles.seal} src={sealSrc} />
          <View style={styles.mastheadText}>
            <Text style={styles.cityName}>City of {CITY.name}</Text>
            <Text style={styles.cityDept}>Department of Public Works · Operations Division</Text>
          </View>
          <View style={styles.docRef}>
            <Text style={styles.docRefLabel}>Reporting Year</Text>
            <Text style={styles.docRefValue}>{d.year}</Text>
          </View>
        </View>

        <Text style={styles.title}>Service Request Analytics</Text>
        <Text style={styles.subtitle}>
          Generated {d.generatedAt} · {d.totalRecords.toLocaleString()} records in {d.year}
        </Text>

        {/* AI Performance Summary */}
        {d.performanceSummary ? (
          <>
            <Text style={styles.sectionHead}>Performance Summary</Text>
            <View style={styles.aiBlock}>
              <Text style={styles.aiLabel}>AI-Generated Summary</Text>
              <Text style={styles.aiText}>{d.performanceSummary}</Text>
            </View>
          </>
        ) : null}

        {/* KPIs */}
        <Text style={styles.sectionHead}>Summary ({d.year})</Text>
        <View style={styles.kpiRow}>
          <View style={styles.kpiCell}>
            <Text style={styles.kpiLabel}>Total Filed</Text>
            <Text style={styles.kpiValue}>{d.summary.total.toLocaleString()}</Text>
            <Text style={styles.kpiSub}>records this year</Text>
          </View>
          <View style={styles.kpiCell}>
            <Text style={styles.kpiLabel}>Open</Text>
            <Text style={styles.kpiValue}>{d.summary.open.toLocaleString()}</Text>
            <Text style={styles.kpiSub}>awaiting resolution</Text>
          </View>
          <View style={styles.kpiCell}>
            <Text style={styles.kpiLabel}>Resolved</Text>
            <Text style={styles.kpiValue}>{d.summary.resolved.toLocaleString()}</Text>
            <Text style={styles.kpiSub}>{d.summary.resolutionRate}% resolution rate</Text>
          </View>
          <View style={styles.kpiCell}>
            <Text style={styles.kpiLabel}>Critical Open</Text>
            <Text style={styles.kpiValue}>{d.summary.criticalOpen.toLocaleString()}</Text>
            <Text style={styles.kpiSub}>severity 8–10</Text>
          </View>
        </View>
        <View style={styles.kpiRow}>
          <View style={styles.kpiCell}>
            <Text style={styles.kpiLabel}>Avg Severity</Text>
            <Text style={styles.kpiValue}>{d.summary.avgOpenSeverity > 0 ? d.summary.avgOpenSeverity.toFixed(1) : "N/A"}</Text>
            <Text style={styles.kpiSub}>open issues (1–10)</Text>
          </View>
          <View style={styles.kpiCell}>
            <Text style={styles.kpiLabel}>Avg Days to Close</Text>
            <Text style={styles.kpiValue}>{d.summary.avgResolutionDays != null ? d.summary.avgResolutionDays.toFixed(1) : "N/A"}</Text>
            <Text style={styles.kpiSub}>non-declined cases</Text>
          </View>
          <View style={styles.kpiCell}>
            <Text style={styles.kpiLabel}>Corroborated</Text>
            <Text style={styles.kpiValue}>{d.summary.corroboratedCount.toLocaleString()}</Text>
            <Text style={styles.kpiSub}>{d.summary.corroborationRate}% of issues</Text>
          </View>
          <View style={styles.kpiCell}>
            <Text style={styles.kpiLabel}>Declined Rate</Text>
            <Text style={styles.kpiValue}>{d.summary.declinedRate.toFixed(1)}%</Text>
            <Text style={styles.kpiSub}>of resolved cases</Text>
          </View>
        </View>

        {/* ---- Charts (mirror the on-screen dashboard) ---- */}
        <Text style={styles.sectionHead}>Submissions by Category</Text>
        <Text style={styles.sectionNote}>Total filed per service type, with solved overlay.</Text>
        <View style={styles.chartWrap}>
          <HBarChart data={catData} />
          <Legend items={[{ label: "Total filed", color: NAVY_MID }, { label: "Solved", color: CYAN }]} />
        </View>

        <View style={styles.twoCol} wrap={false}>
          <View style={styles.col}>
            <Text style={styles.sectionHead}>Monthly Activity</Text>
            <View style={styles.chartWrap}>
              <VBarChart
                data={monthData}
                series={[{ key: "filed", color: NAVY }, { key: "resolved", color: SLATE }]}
                width={250}
                height={140}
              />
              <Legend items={[{ label: "Filed", color: NAVY }, { label: "Closed", color: SLATE }]} />
            </View>
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionHead}>Severity Distribution</Text>
            <View style={styles.chartWrap}>
              <VBarChart
                data={sevData}
                series={[{ key: "count", color: NAVY_MID }]}
                width={250}
                height={140}
              />
              <Legend items={[{ label: "Cases", color: NAVY_MID }]} />
            </View>
          </View>
        </View>

        {hasResolution ? (
          <>
            <Text style={styles.sectionHead}>Resolution Timeliness ({d.year})</Text>
            <Text style={styles.sectionNote}>Mean calendar days from filing to closure (non-declined cases).</Text>
            <View style={styles.chartWrap}>
              <LineTrend data={d.resolutionTrend} height={140} />
            </View>
          </>
        ) : null}

        {/* ---- Exact figures (tables) at the bottom ---- */}
        <Text style={styles.sectionHead} break>Detailed Figures</Text>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={[styles.aiLabel, { marginBottom: 4 }]}>Submissions by Category</Text>
            <View style={styles.tableHeader}>
              <Th flex={3}>Category</Th>
              <Th flex={1} right>Total</Th>
              <Th flex={1} right>Open</Th>
              <Th flex={1} right>Resolved</Th>
            </View>
            {d.categoryBreakdown.map((c, i) => (
              <View key={c.category} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Td flex={3}>{c.category}</Td>
                <Td flex={1} right>{String(c.count)}</Td>
                <Td flex={1} right>{String(c.open)}</Td>
                <Td flex={1} right>{String(c.count - c.open)}</Td>
              </View>
            ))}

            <Text style={[styles.aiLabel, { marginTop: 8, marginBottom: 4 }]}>Annual Volume</Text>
            <View style={styles.tableHeader}>
              <Th flex={1}>Year</Th>
              <Th flex={1} right>Filed</Th>
              <Th flex={1} right>Resolved</Th>
              <Th flex={1} right>Open</Th>
            </View>
            {d.yearlyTrend.map((y, i) => (
              <View key={y.year} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Td flex={1}>{y.year}</Td>
                <Td flex={1} right>{String(y.filed)}</Td>
                <Td flex={1} right>{String(y.resolved)}</Td>
                <Td flex={1} right>{String(y.open)}</Td>
              </View>
            ))}

            <Text style={[styles.aiLabel, { marginTop: 8, marginBottom: 4 }]}>Severity Distribution</Text>
            <View style={styles.tableHeader}>
              <Th flex={1}>Severity</Th>
              <Th flex={1} right>Cases</Th>
            </View>
            {d.severityDistribution.filter((s) => s.count > 0).map((s, i) => (
              <View key={s.severity} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Td flex={1}>Level {s.severity}</Td>
                <Td flex={1} right>{String(s.count)}</Td>
              </View>
            ))}
          </View>

          <View style={styles.col}>
            <Text style={[styles.aiLabel, { marginBottom: 4 }]}>Monthly Activity ({d.year})</Text>
            <View style={styles.tableHeader}>
              <Th flex={2}>Month</Th>
              <Th flex={1} right>Filed</Th>
              <Th flex={1} right>Closed</Th>
            </View>
            {d.monthlyTrend.map((m, i) => (
              <View key={m.month} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                <Td flex={2}>{m.month}</Td>
                <Td flex={1} right>{String(m.filed)}</Td>
                <Td flex={1} right>{String(m.resolved)}</Td>
              </View>
            ))}

            {hasResolution ? (
              <>
                <Text style={[styles.aiLabel, { marginTop: 8, marginBottom: 4 }]}>Resolution Timeliness ({d.year})</Text>
                <View style={styles.tableHeader}>
                  <Th flex={2}>Month</Th>
                  <Th flex={1} right>Avg Days</Th>
                  <Th flex={1} right>Closed</Th>
                </View>
                {d.resolutionTrend.filter((r) => r.count > 0).map((r, i) => (
                  <View key={r.month} style={i % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                    <Td flex={2}>{r.month}</Td>
                    <Td flex={1} right>{r.avgDays.toFixed(1)}</Td>
                    <Td flex={1} right>{String(r.count)}</Td>
                  </View>
                ))}
              </>
            ) : null}
          </View>
        </View>

        {/* AI Declined Issues Summary */}
        {d.closedCasesSummary ? (
          <>
            <Text style={styles.sectionHead}>Declined Issues (Invalid Reports)</Text>
            <View style={styles.aiBlock}>
              <Text style={styles.aiLabel}>AI-Generated Summary</Text>
              <Text style={styles.aiText}>{d.closedCasesSummary}</Text>
            </View>
          </>
        ) : null}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>City of {CITY.name} · GovLink Service Operations · Internal use</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

export async function POST(req: NextRequest) {
  try {
    ensureFonts();
    const payload: AnalyticsPdfPayload = await req.json();
    const buf = await renderToBuffer(<AnalyticsDocument d={payload} />);
    return new Response(buf, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="govlink-analytics-${payload.year}.pdf"`,
      },
    });
  } catch (err) {
    console.error("[analytics-pdf]", err);
    return new Response(
      JSON.stringify({ error: "PDF generation failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
