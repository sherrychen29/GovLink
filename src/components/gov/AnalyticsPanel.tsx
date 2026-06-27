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
import { ClipboardList, CheckCircle2, Gauge, Users } from "lucide-react";
import { computeGovAnalytics, shortCategory } from "@/lib/gov-analytics";
import { STATUS_META, severityMeta } from "@/lib/meta";
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

  const statusChartData = data.statusBreakdown.map((s) => ({
    name: STATUS_META[s.status].label,
    count: s.count,
  }));

  const yearFilings = data.monthlyTrend.reduce((n, m) => n + m.filed, 0);
  const yearClosed = data.monthlyTrend.reduce((n, m) => n + m.resolved, 0);

  return (
    <div className="h-full overflow-y-auto border-t border-navy-200 bg-white">
      <div className="gl-container max-w-6xl py-8 sm:py-10">
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
            Report generated {generatedAt} · {summary.total.toLocaleString()} records
            in dataset · fiscal years {data.availableYears[0]}–
            {data.availableYears[data.availableYears.length - 1]}
          </p>
        </header>

        {/* Top row: 2026 Summary + Submissions by Category */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:items-start">
          <section>
            <SectionHeading
              title="2026 Summary"
              note="Key metrics for reports filed in 2026."
            />
            <Summary2026 reports={reports} />
          </section>

          <section>
            <SectionHeading
              title="Submissions by Category"
              note="Total filed per service type, with solved overlay."
            />
            <ChartFrame>
              <ResponsiveContainer width="100%" height={Math.max(150, categoryChartData.length * 17)}>
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
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: "system-ui" }} />
                  <Bar dataKey="total" name="Total filed" fill={CHART.navyMid} barSize={9} />
                  <Line
                    dataKey="solved"
                    name="Solved"
                    stroke="#06b6d4"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "#06b6d4", strokeWidth: 0 }}
                    activeDot={{ r: 4 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartFrame>
          </section>
        </div>

        {/* Year filter */}
        <div className="mt-6 flex flex-col gap-2 border border-navy-200 bg-navy-50/40 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs uppercase tracking-wider text-navy-600">
            Calendar-year filter for charts below
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

        {/* Annual Volume (full width) */}
        <div className="mt-6">
          <section>
            <SectionHeading
              title="Annual Volume"
              note="Filed, closed, and open by calendar year."
            />
            <ChartFrame>
              <ResponsiveContainer width="100%" height={260}>
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
                  <Legend wrapperStyle={{ fontSize: 11, fontFamily: "system-ui", paddingTop: 8 }} />
                  <Bar dataKey="filed" name="Filed" fill={CHART.filed} barSize={28} />
                  <Bar dataKey="resolved" name="Closed" fill={CHART.resolved} barSize={28} />
                  <Bar dataKey="open" name="Open (cohort)" fill={CHART.open} barSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </section>
        </div>

        {/* Monthly + Status */}
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section>
            <SectionHeading
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
                  <Bar dataKey="filed" name="Filed" fill={CHART.navy} barSize={16} />
                  <Bar dataKey="resolved" name="Closed" fill={CHART.slate} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </section>

          <section>
            <SectionHeading
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
                  <Bar dataKey="count" name="Cases" fill={CHART.navyMid} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </ChartFrame>
          </section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section>
            <SectionHeading
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

function SectionHeading({ title, note }: { title: string; note: string }) {
  return (
    <div className="border-b border-navy-200 pb-2">
      <h3 className="text-xl font-bold text-navy-900">{title}</h3>
      <p className="mt-0.5 font-sans text-xs leading-relaxed text-ink-muted">{note}</p>
    </div>
  );
}

function Summary2026({ reports }: { reports: Report[] }) {
  const r2026 = reports.filter((r) => new Date(r.createdAt).getFullYear() === 2026);
  const resolved2026 = r2026.filter((r) => r.status === "resolved");
  const fixed2026 = resolved2026.filter((r) => r.resolution && !r.resolution.rejected);
  const corroborated2026 = r2026.filter((r) => r.submissions.length >= 2);
  const severities = r2026.map((r) => r.severity).filter((s) => s != null);
  const avgSeverity =
    severities.length > 0
      ? parseFloat((severities.reduce((a, b) => a + b, 0) / severities.length).toFixed(1))
      : null;
  const fixRate = r2026.length > 0 ? Math.round((fixed2026.length / r2026.length) * 100) : 0;
  const corrobRate =
    r2026.length > 0 ? Math.round((corroborated2026.length / r2026.length) * 100) : 0;
  const sevColor = avgSeverity != null ? severityMeta(Math.round(avgSeverity)).hex : undefined;

  return (
    <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-navy-200 bg-navy-200">
      <Kpi
        icon={<ClipboardList className="h-3.5 w-3.5" />}
        label="Issues"
        value={r2026.length.toLocaleString()}
        sub="filed in 2026"
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
        value={corroborated2026.length.toLocaleString()}
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
