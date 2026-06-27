"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { computeGovAnalytics, shortCategory } from "@/lib/gov-analytics";
import { STATUS_META } from "@/lib/meta";
import { CITY } from "@/lib/seed";
import type { Report } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

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

  const categoryChartData = data.categoryBreakdown.map((c) => ({
    name: shortCategory(c.category),
    fullName: c.category,
    total: c.count,
    open: c.open,
  }));

  const statusChartData = data.statusBreakdown.map((s) => ({
    name: STATUS_META[s.status].label,
    count: s.count,
  }));

  const yearFilings = data.monthlyTrend.reduce((n, m) => n + m.filed, 0);
  const yearClosed = data.monthlyTrend.reduce((n, m) => n + m.resolved, 0);

  return (
    <div
      className="h-full overflow-y-auto border-t border-navy-200 bg-white"
      style={{ fontFamily: "Georgia, 'Times New Roman', Times, serif" }}
    >
      <div className="gl-container max-w-6xl py-8 sm:py-10">
        {/* Document masthead */}
        <header className="border-b-2 border-navy-900 pb-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-navy-500">
            City of {CITY.name}
          </p>
          <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight text-navy-900 sm:text-[1.75rem]">
            Service Request Statistical Summary
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            Department of Public Works · Operations Division
          </p>
          <p className="mt-3 text-xs text-ink-muted">
            Report generated {generatedAt} · {summary.total.toLocaleString()} records
            in dataset · fiscal years {data.availableYears[0]}–
            {data.availableYears[data.availableYears.length - 1]}
          </p>
        </header>

        {/* I + II side by side on wide screens */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:items-start">
          <section>
            <SectionHeading
              number="I"
              title="Executive Summary"
              note="Aggregate measures on record."
            />
            <CompactSummary summary={summary} />
          </section>

          <section>
            <SectionHeading
              number="II"
              title="Annual Volume"
              note="Filed, closed, and open by calendar year."
            />
            <ChartFrame>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.yearlyTrend} margin={{ top: 12, right: 12, left: 4, bottom: 4 }}>
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis
                    dataKey="year"
                    tick={{ fontSize: 11, fill: CHART.slate, fontFamily: "system-ui" }}
                    axisLine={{ stroke: CHART.border }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: CHART.slate, fontFamily: "system-ui" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Legend
                    wrapperStyle={{ fontSize: 11, fontFamily: "system-ui", paddingTop: 8 }}
                  />
                  <Bar dataKey="filed" name="Filed" fill={CHART.filed} barSize={24} />
                  <Bar dataKey="resolved" name="Closed" fill={CHART.resolved} barSize={24} />
                  <Bar dataKey="open" name="Open (cohort)" fill={CHART.open} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </section>
        </div>

        {/* Year filter */}
        <div className="mt-6 flex flex-col gap-2 border border-navy-200 bg-navy-50/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs uppercase tracking-wider text-navy-600">
            Calendar-year filter for Sections III–VII
          </p>
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

        {/* III–V */}
        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <section>
            <SectionHeading
              number="III"
              title={`${year} Monthly Activity`}
              note={`${yearFilings.toLocaleString()} filed · ${yearClosed.toLocaleString()} closed.`}
            />
            <ChartFrame>
              <ResponsiveContainer width="100%" height={220}>
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
                  <Bar dataKey="filed" name="Filed" fill={CHART.navy} barSize={14} />
                  <Bar dataKey="resolved" name="Closed" fill={CHART.slate} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </section>

          <section>
            <SectionHeading
              number="IV"
              title="Status Distribution"
              note="Current disposition of all requests."
            />
            <ChartFrame>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart
                  data={statusChartData}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                >
                  <CartesianGrid stroke={CHART.grid} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: CHART.slate, fontFamily: "system-ui" }}
                    axisLine={{ stroke: CHART.border }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={88}
                    tick={{ fontSize: 10, fill: CHART.navy, fontFamily: "system-ui" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip {...TOOLTIP_STYLE} />
                  <Bar dataKey="count" name="Cases" fill={CHART.navyMid} barSize={18} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </section>

          <section>
            <SectionHeading
              number="V"
              title="Volume by Category"
              note="Filed and open queue by service type."
            />
            <ChartFrame>
              <ResponsiveContainer width="100%" height={Math.max(220, categoryChartData.length * 28)}>
                <BarChart
                  data={categoryChartData}
                  layout="vertical"
                  margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
                >
                  <CartesianGrid stroke={CHART.grid} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 10, fill: CHART.slate, fontFamily: "system-ui" }}
                    axisLine={{ stroke: CHART.border }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={108}
                    tick={{ fontSize: 10, fill: CHART.navy, fontFamily: "system-ui" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    {...TOOLTIP_STYLE}
                    formatter={(value, name) => [
                      value,
                      name === "total" ? "Total filed" : "Open queue",
                    ]}
                    labelFormatter={(_, payload) =>
                      payload?.[0]?.payload?.fullName ?? ""
                    }
                  />
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: "system-ui" }} />
                  <Bar dataKey="total" name="Total filed" fill={CHART.navy} barSize={14} />
                  <Bar dataKey="open" name="Open queue" fill={CHART.slateLight} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section>
            <SectionHeading
              number="VI"
              title="Severity Distribution"
              note="Final assigned severity (scale 1–10) across all records."
            />
            <ChartFrame>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={data.severityDistribution}
                  margin={{ top: 12, right: 8, left: 4, bottom: 4 }}
                >
                  <CartesianGrid stroke={CHART.grid} vertical={false} />
                  <XAxis
                    dataKey="severity"
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
                  <Bar dataKey="count" name="Cases" fill={CHART.navyMid} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </section>

          <section>
            <SectionHeading
              number="VII"
              title={`${year} Resolution Timeliness`}
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

        <footer className="mt-10 border-t border-navy-200 pt-4 text-center text-[11px] leading-relaxed text-ink-muted">
          <p>
            City of {CITY.name} · GovLink Service Operations · Statistical summary for
            internal use
          </p>
          <p className="mt-1 font-sans">
            Data reflects local system records as of {generatedAt}. Not for public
            release without review.
          </p>
        </footer>
      </div>
    </div>
  );
}

function SectionHeading({
  number,
  title,
  note,
}: {
  number: string;
  title: string;
  note: string;
}) {
  return (
    <div className="border-b border-navy-200 pb-2">
      <h3 className="font-serif text-base font-bold text-navy-900">
        {number}. {title}
      </h3>
      <p className="mt-0.5 font-sans text-xs leading-relaxed text-ink-muted">{note}</p>
    </div>
  );
}

function CompactSummary({
  summary,
}: {
  summary: ReturnType<typeof computeGovAnalytics>["summary"];
}) {
  const items: Array<{ label: string; value: string }> = [
    { label: "Total on file", value: summary.total.toLocaleString() },
    { label: "Open queue", value: summary.open.toLocaleString() },
    { label: "Critical open (8+)", value: summary.criticalOpen.toLocaleString() },
    {
      label: "Closed",
      value: `${summary.resolved.toLocaleString()} (${summary.resolutionRate}%)`,
    },
    { label: "Declined when closed", value: `${summary.declinedRate}%` },
    {
      label: "Mean time to close",
      value:
        summary.avgResolutionDays != null
          ? `${summary.avgResolutionDays}d (med. ${summary.medianResolutionDays}d)`
          : "N/A",
    },
    { label: "Mean open severity", value: `${summary.avgOpenSeverity}/10` },
    {
      label: "Mean open queue age",
      value: summary.avgOpenAgeDays != null ? `${summary.avgOpenAgeDays}d` : "N/A",
    },
    {
      label: "Corroborated",
      value: `${summary.corroboratedCount} (${summary.corroborationRate}%)`,
    },
    {
      label: "Resident submissions",
      value: `${summary.residentSubmissions.toLocaleString()} (${summary.avgSubmissions}/case)`,
    },
  ];

  return (
    <dl className="mt-3 grid grid-cols-1 gap-px overflow-hidden border border-navy-200 bg-navy-200 sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="bg-white px-3 py-2">
          <dt className="font-sans text-[10px] font-semibold uppercase tracking-wide text-navy-600">
            {item.label}
          </dt>
          <dd className="mt-0.5 font-sans text-sm tabular-nums text-navy-900">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ChartFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 border border-navy-200 bg-white px-2 py-3 sm:px-4">
      {children}
    </div>
  );
}
