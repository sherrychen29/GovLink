"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ClipboardList, CheckCircle2, Gauge, Users, FileCheck2, Loader2, Download } from "lucide-react";
import { computeGovAnalytics, shortCategory } from "@/lib/gov-analytics";
import { severityMeta } from "@/lib/meta";
import { CITY } from "@/lib/seed";
import type { Report } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";
import { SiteFooter } from "@/components/SiteShell";

/** Restrained palette — navy/slate only, suitable for municipal publications. */
const CHART = {
  navy: "#0b2447",
  navyMid: "#1e3a5f",
  slate: "#64748b",
  slateLight: "#94a3b8",
  grid: "#e2e8f0",
  border: "#c7cdd9",
  filed: "#1e3a5f",
  resolved: "#475569",
  open: "#94a3b8",
  line: "#0b2447",
};

const TOOLTIP_STYLE = {
  contentStyle: {
    borderRadius: 2,
    border: `1px solid ${CHART.border}`,
    fontSize: 11,
    fontFamily: "inherit",
    boxShadow: "none",
  },
  labelStyle: { fontWeight: 600, color: CHART.navy },
};

export function AnalyticsPanel({ reports }: { reports: Report[] }) {
  const generatedAt = useMemo(() => formatDateTime(new Date().toISOString()), []);
  const analyticsBase = useMemo(
    () => computeGovAnalytics(reports, new Date().getFullYear()),
    [reports]
  );
  const [year, setYear] = useState(() =>
    analyticsBase.availableYears[analyticsBase.availableYears.length - 1] ??
      new Date().getFullYear()
  );

  useEffect(() => {
    if (!analyticsBase.availableYears.includes(year)) {
      setYear(analyticsBase.availableYears[analyticsBase.availableYears.length - 1]);
    }
  }, [analyticsBase.availableYears, year]);

  const data = useMemo(() => computeGovAnalytics(reports, year), [reports, year]);
  const { summary } = data;

  const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const monthlySeverity = useMemo(() =>
    MONTH_LABELS.map((month, idx) => {
      const monthReports = reports.filter((r) => {
        const d = new Date(r.createdAt);
        return d.getFullYear() === year && d.getMonth() === idx && r.severity != null;
      });
      const avg = monthReports.length
        ? Math.round((monthReports.reduce((s, r) => s + r.severity, 0) / monthReports.length) * 10) / 10
        : null;
      return { month, avgSeverity: avg ?? 0, count: monthReports.length };
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [reports, year]);

  const [ai, setAi] = useState<{ performanceSummary: string; closedCasesSummary: string } | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);

  async function exportPdf() {
    setPdfLoading(true);
    try {
      const payload = {
        year,
        generatedAt,
        totalRecords: summary.total,
        availableYearsRange:
          data.availableYears.length > 1
            ? `${data.availableYears[0]}–${data.availableYears[data.availableYears.length - 1]}`
            : String(year),
        summary: {
          total: summary.total,
          open: summary.open,
          resolved: summary.resolved,
          criticalOpen: summary.criticalOpen,
          resolutionRate: summary.resolutionRate,
          declinedRate: summary.declinedRate,
          avgOpenSeverity: summary.avgOpenSeverity,
          avgResolutionDays: summary.avgResolutionDays,
          corroboratedCount: summary.corroboratedCount,
          corroborationRate: summary.corroborationRate,
        },
        categoryBreakdown: data.categoryBreakdown.map((c) => ({
          category: c.category,
          count: c.count,
          open: c.open,
        })),
        monthlyTrend: data.monthlyTrend,
        yearlyTrend: data.yearlyTrend,
        severityDistribution: data.severityDistribution,
        resolutionTrend: data.resolutionTrend,
        performanceSummary: ai?.performanceSummary,
        closedCasesSummary: ai?.closedCasesSummary,
      };
      const res = await fetch("/api/gov/analytics-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("PDF generation failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `govlink-analytics-${year}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("[exportPdf]", err);
    } finally {
      setPdfLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    setAiLoading(true);

    const yearReports = reports.filter((r) => new Date(r.createdAt).getFullYear() === year);
    const closedInYear = reports.filter(
      (r) =>
        r.status === "resolved" &&
        r.resolution &&
        new Date(r.resolution.resolvedAt).getFullYear() === year
    );
    const fixed = closedInYear.filter((r) => !r.resolution!.rejected);
    const declined = closedInYear.filter((r) => r.resolution!.rejected);
    const sevs = yearReports.map((r) => r.severity).filter((s) => s != null);
    const avgSeverity =
      sevs.length > 0 ? parseFloat((sevs.reduce((a, b) => a + b, 0) / sevs.length).toFixed(1)) : null;

    const payload = {
      stats: {
        year,
        total: yearReports.length,
        open: yearReports.filter((r) => r.status !== "resolved").length,
        resolved: closedInYear.length,
        fixed: fixed.length,
        declined: declined.length,
        resolutionRate:
          yearReports.length > 0 ? Math.round((closedInYear.length / yearReports.length) * 100) : 0,
        avgSeverity,
        corroborated: yearReports.filter((r) => r.submissions.length >= 2).length,
        avgResolutionDays: data.summary.avgResolutionDays,
      },
      categories: data.categoryBreakdown.map((c) => ({
        category: c.category,
        total: c.count,
        solved: reports.filter(
          (r) => r.category === c.category && r.status === "resolved" && r.resolution && !r.resolution.rejected
        ).length,
      })),
      closedCases: closedInYear.slice(0, 80).map((r) => ({
        category: r.category,
        severity: r.severity,
        rejected: !!r.resolution!.rejected,
        note: (r.resolution!.note || "").slice(0, 280),
      })),
    };

    fetch("/api/gov/analytics-summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((json) => {
        setAi({ performanceSummary: json.performanceSummary, closedCasesSummary: json.closedCasesSummary });
        setAiLoading(false);
      })
      .catch((err) => {
        if (err?.name === "AbortError") return;
        setAiLoading(false);
      });

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reports, year]);

  if (reports.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center border-t border-navy-200 bg-white px-6 py-20 text-center">
        <p className="font-serif text-lg font-semibold text-navy-900">
          No records on file
        </p>
        <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
          Service request statistics will appear once reports have been filed in
          the system.
        </p>
      </div>
    );
  }

  const categoryChartData = data.categoryBreakdown.map((c) => {
    const solved = reports.filter(
      (r) => r.category === c.category && r.status === "resolved" && r.resolution && !r.resolution.rejected
    ).length;
    return {
      name: shortCategory(c.category),
      fullName: c.category,
      total: c.count,
      solved,
    };
  });

  const yearFilings = data.monthlyTrend.reduce((n, m) => n + m.filed, 0);
  const yearClosed = data.monthlyTrend.reduce((n, m) => n + m.resolved, 0);

  return (
    <div className="h-full overflow-y-auto border-t border-navy-200 bg-white flex flex-col">
      <div className="gl-container max-w-6xl py-8 sm:py-10 flex-1">
        {/* Document masthead */}
        <header className="border-b-2 border-navy-900 pb-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-navy-500">
            City of {CITY.name}
          </p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-navy-900 sm:text-[1.75rem]">
            Service Request Analytics
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Department of Public Works · Operations Division
          </p>
          <p className="mt-3 text-xs text-ink-muted">
            Report generated {generatedAt} · {summary.total.toLocaleString()} records in {year}
          </p>
          <div className="mt-4">
            <button
              type="button"
              onClick={exportPdf}
              disabled={pdfLoading}
              className="inline-flex items-center gap-2 rounded border border-navy-300 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-navy-800 shadow-sm transition-colors hover:bg-navy-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pdfLoading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
              ) : (
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
              )}
              {pdfLoading ? "Generating…" : "Export Report (PDF)"}
            </button>
          </div>
        </header>

        {/* Performance summary — top */}
        <div className="mt-6">
          <PerformanceSummary text={ai?.performanceSummary} loading={aiLoading} />
        </div>

        {/* Top row: Summary + Submissions by Category */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:items-start">
          <section>
            <SectionHeading
              title={`Summary (${year})`}
              note={`Key metrics for reports filed in ${year}.`}
            />
            <SummaryByYear reports={reports} year={year} />

            <div className="mt-4">
              <AiSummaryBlock
                icon={<FileCheck2 className="h-4 w-4" />}
                title="Declined Issues (Invalid Reports)"
                text={ai?.closedCasesSummary}
                loading={aiLoading}
              />
            </div>
          </section>

          <section>
            <SectionHeading
              title="Submissions by Category"
              note="Total filed per service type, with solved overlay."
            />
            <ChartFrame>
              <ResponsiveContainer width="100%" height={categoryChartData.length * 30 + 40}>
                <ComposedChart
                  data={categoryChartData}
                  layout="vertical"
                  margin={{ top: 4, right: 24, left: 4, bottom: 4 }}
                >
                  <CartesianGrid stroke={CHART.grid} horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, Math.max(...categoryChartData.map((d) => d.total))]}
                    tick={{ fontSize: 10, fill: CHART.slate, fontFamily: "system-ui" }}
                    axisLine={{ stroke: CHART.border }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={112}
                    interval={0}
                    tick={{ fontSize: 10, fill: CHART.navy, fontFamily: "system-ui" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    formatter={(value, name) => [value, name === "total" ? "Total filed" : "Solved"]}
                    labelFormatter={(_, payload) => payload?.[0]?.payload?.fullName ?? ""}
                  />
                  <Legend verticalAlign="bottom" wrapperStyle={{ fontSize: 11, fontFamily: "system-ui", paddingTop: 8 }} />
                  <Bar dataKey="total" name="Total filed" fill={CHART.navyMid} barSize={14} />
                  <Line
                    dataKey="solved"
                    name="Solved"
                    stroke="transparent"
                    strokeWidth={0}
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    dot={(props: any) => (
                      <rect
                        key={props.index}
                        x={(props.cx ?? 0) - 2}
                        y={(props.cy ?? 0) - 7}
                        width={4}
                        height={14}
                        fill="#06b6d4"
                        rx={1}
                      />
                    )}
                    activeDot={false}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartFrame>
          </section>
        </div>

        {/* Year filter */}
        <section className="mt-6 border border-navy-300 bg-white">
          <h3 className="border-b border-navy-300 bg-navy-50 px-4 py-2 text-sm font-bold uppercase tracking-wide text-navy-900">
            Calendar-Year Filter for Charts Below
          </h3>
          <div className="px-4 py-3">
            <label className="flex items-center gap-2 text-sm text-navy-900">
              <span className="font-semibold">Reporting year</span>
              <select
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                className="rounded border border-navy-300 bg-white px-3 py-1.5 font-sans text-sm text-navy-900 focus:border-navy-500 focus:outline-none focus:ring-1 focus:ring-navy-500"
              >
                {data.availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {/* Monthly Activity + Severity by Month + Annual Volume */}
        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <section>
            <SectionHeading
              title="Monthly Activity"
              note={`${yearFilings.toLocaleString()} filed · ${yearClosed.toLocaleString()} closed.`}
            />
            <ChartFrame>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.monthlyTrend} margin={{ top: 12, right: 8, left: 4, bottom: 4 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: CHART.slate, fontFamily: "system-ui" }}
                    axisLine={{ stroke: CHART.border }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: CHART.slate, fontFamily: "system-ui" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: "system-ui" }} />
                  <Bar dataKey="filed" name="Filed" fill={CHART.navy} barSize={12} />
                  <Bar dataKey="resolved" name="Closed" fill={CHART.slate} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </section>

          <section>
            <SectionHeading
              title="Severity Distribution"
              note="Average severity of reports filed each month (scale 1–10)."
            />
            <ChartFrame>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={monthlySeverity} margin={{ top: 12, right: 8, left: 4, bottom: 4 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: CHART.slate, fontFamily: "system-ui" }}
                    axisLine={{ stroke: CHART.border }}
                    tickLine={false}
                  />
                  <YAxis
                    domain={[0, 10]}
                    tick={{ fontSize: 10, fill: CHART.slate, fontFamily: "system-ui" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    formatter={(value, _name, props) => [
                      props.payload.count > 0 ? `${value}/10` : "No data",
                      "Avg severity",
                    ]}
                  />
                  <Bar dataKey="avgSeverity" name="Avg severity" fill={CHART.navyMid} barSize={12} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </section>

          <section>
            <SectionHeading
              title="Annual Volume"
              note="Filed, closed, and open by calendar year."
            />
            <ChartFrame>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.yearlyTrend} margin={{ top: 12, right: 8, left: 4, bottom: 4 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 10, fill: CHART.slate, fontFamily: "system-ui" }}
                    axisLine={{ stroke: CHART.border }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: CHART.slate, fontFamily: "system-ui" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: "system-ui" }} />
                  <Bar dataKey="filed" name="Filed" fill={CHART.filed} barSize={14} />
                  <Bar dataKey="resolved" name="Closed" fill={CHART.resolved} barSize={14} />
                  <Bar dataKey="open" name="Open (cohort)" fill={CHART.open} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </section>
        </div>

        {/* Resolution Timeliness — full width at bottom */}
        <div className="mt-6">
          <section>
            <SectionHeading
              title={`Resolution Timeliness (${year})`}
              note="Mean calendar days from filing to closure (non-declined cases)."
            />
            <ChartFrame>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart
                  data={data.resolutionTrend}
                  margin={{ top: 12, right: 8, left: 4, bottom: 4 }}
                >
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: CHART.slate, fontFamily: "system-ui" }}
                    axisLine={{ stroke: CHART.border }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: CHART.slate, fontFamily: "system-ui" }}
                    axisLine={false}
                    tickLine={false}
                    unit=" d"
                  />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    formatter={(value) => [`${value} days`, "Mean time to close"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgDays"
                    name="Mean days to close"
                    stroke={CHART.line}
                    strokeWidth={1.5}
                    dot={{ r: 2, fill: CHART.navy, strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartFrame>
          </section>
        </div>

      </div>
      <SiteFooter compact />
    </div>
  );
}

function PerformanceSummary({ text, loading }: { text?: string; loading: boolean }) {
  return (
    <section className="border border-accent-300 bg-white">
      <h3 className="border-b border-accent-300 bg-accent-50 px-4 py-2 text-sm font-bold uppercase tracking-wide text-accent-900">
        Performance Summary
      </h3>
      <div className="px-4 py-3">
        {loading ? (
          <p className="text-sm text-ink-muted">Preparing summary…</p>
        ) : (
          <p className="text-sm leading-relaxed text-navy-900">
            {text ?? "Summary unavailable."}
          </p>
        )}
        <p className="mt-3 border-t border-navy-200 pt-2 text-[11px] text-ink-muted">
          Computer-generated summary. Figures are drawn from system records.
        </p>
      </div>
    </section>
  );
}

function AiSummaryBlock({
  icon,
  title,
  text,
  loading,
}: {
  icon: React.ReactNode;
  title: string;
  text?: string;
  loading: boolean;
}) {
  return (
    <div className="border border-navy-200 bg-navy-50/40 p-4">
      <div className="flex items-center gap-2 border-b border-navy-200 pb-2 text-navy-800">
        <span className="text-navy-700">{icon}</span>
        <span className="text-sm font-bold uppercase tracking-[0.12em]">{title}</span>
        <span className="ml-auto rounded-sm border border-navy-300 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-navy-600">
          AI Generated
        </span>
      </div>
      {loading ? (
        <div className="mt-3 flex items-center gap-2 text-sm text-ink-muted">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Generating summary…
        </div>
      ) : (
        <p className="mt-3 text-sm leading-relaxed text-navy-900">
          {text ?? "Summary unavailable."}
        </p>
      )}
    </div>
  );
}

function SectionHeading({ title, note }: { title: string; note: string }) {
  return (
    <div className="border-b border-navy-200 pb-2">
      <h3 className="text-xl font-bold text-navy-900">{title}</h3>
      <p className="mt-0.5 font-sans text-xs leading-relaxed text-ink-muted">{note}</p>
    </div>
  );
}

function SummaryByYear({ reports, year }: { reports: Report[]; year: number }) {
  const rYear = reports.filter((r) => new Date(r.createdAt).getFullYear() === year);
  const resolvedYear = rYear.filter((r) => r.status === "resolved");
  const fixedYear = resolvedYear.filter((r) => r.resolution && !r.resolution.rejected);
  const corroboratedYear = rYear.filter((r) => r.submissions.length >= 2);
  const severities = rYear.map((r) => r.severity).filter((s) => s != null);
  const avgSeverity =
    severities.length > 0
      ? parseFloat((severities.reduce((a, b) => a + b, 0) / severities.length).toFixed(1))
      : null;
  const fixRate = rYear.length > 0 ? Math.round((fixedYear.length / rYear.length) * 100) : 0;
  const corrobRate =
    rYear.length > 0 ? Math.round((corroboratedYear.length / rYear.length) * 100) : 0;
  const sevColor = avgSeverity != null ? severityMeta(Math.round(avgSeverity)).hex : undefined;

  return (
    <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-navy-200 bg-navy-200">
      <Kpi
        icon={<ClipboardList className="h-3.5 w-3.5" />}
        label="Issues"
        value={rYear.length.toLocaleString()}
        sub={`filed in ${year}`}
      />
      <Kpi
        icon={<CheckCircle2 className="h-3.5 w-3.5" />}
        label="Fix Rate"
        value={`${fixRate}`}
        suffix="%"
        meter={fixRate}
        meterColor="#1e3a5f"
      />
      <Kpi
        icon={<Gauge className="h-3.5 w-3.5" />}
        label="Avg Severity"
        value={avgSeverity != null ? `${avgSeverity}` : "N/A"}
        suffix={avgSeverity != null ? "/10" : undefined}
        meter={avgSeverity != null ? (avgSeverity / 10) * 100 : undefined}
        meterColor={sevColor}
      />
      <Kpi
        icon={<Users className="h-3.5 w-3.5" />}
        label="Corroborated"
        value={corroboratedYear.length.toLocaleString()}
        sub={`${corrobRate}% of issues`}
      />
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  suffix,
  sub,
  meter,
  meterColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
  sub?: string;
  meter?: number;
  meterColor?: string;
}) {
  return (
    <div className="bg-white px-3.5 py-2.5">
      <div className="flex items-center gap-1.5 text-navy-500">
        {icon}
        <span className="text-[10px] font-bold uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-1 flex items-baseline gap-0.5">
        <span className="text-2xl font-bold leading-none tabular-nums text-navy-900">{value}</span>
        {suffix && <span className="text-sm font-semibold text-navy-400">{suffix}</span>}
      </div>
      {meter != null ? (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-navy-100">
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.max(0, Math.min(100, meter))}%`, backgroundColor: meterColor }}
          />
        </div>
      ) : (
        <div className="mt-1.5 text-[10px] font-medium text-ink-muted">{sub}</div>
      )}
    </div>
  );
}

function ChartFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 border border-navy-200 bg-white px-2 py-3 sm:px-4">
      {children}
    </div>
  );
}
