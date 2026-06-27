import {
  CATEGORIES,
  STATUS_PIPELINE,
  type Category,
  type Report,
  type ReportStatus,
} from "./types";

/** Hex colors for chart series. */
export const CATEGORY_CHART_COLORS: Record<Category, string> = {
  "Water/Plumbing": "#0ea5e9",
  "Roads & Sidewalks": "#f59e0b",
  "Electricity/Power Lines": "#eab308",
  "Waste & Sanitation": "#65a30d",
  "Parks & Trees": "#059669",
  "Noise Complaints": "#8b5cf6",
  "Animal/Wildlife": "#f97316",
  "Public Safety/Hazards": "#f43f5e",
  Other: "#64748b",
};

export const STATUS_CHART_COLORS: Record<ReportStatus, string> = {
  sent: "#94a3b8",
  opened: "#1fc7ef",
  in_progress: "#f59e0b",
  resolved: "#10b981",
};

export interface GovAnalyticsSummary {
  total: number;
  open: number;
  resolved: number;
  criticalOpen: number;
  resolutionRate: number;
  declinedRate: number;
  avgOpenSeverity: number;
  avgResolutionDays: number | null;
  medianResolutionDays: number | null;
  corroboratedCount: number;
  corroborationRate: number;
  avgSubmissions: number;
  residentSubmissions: number;
  avgOpenAgeDays: number | null;
  withMedia: number;
}

export interface YearlyTrendPoint {
  year: string;
  filed: number;
  resolved: number;
  open: number;
}

export interface MonthlyTrendPoint {
  month: string;
  monthIndex: number;
  filed: number;
  resolved: number;
}

export interface CategoryCount {
  category: Category;
  count: number;
  open: number;
  label: string;
  color: string;
}

export interface StatusCount {
  status: ReportStatus;
  count: number;
  label: string;
  color: string;
}

export interface SeverityBucket {
  severity: number;
  count: number;
}

export interface ResolutionTrendPoint {
  month: string;
  avgDays: number;
  count: number;
}

export interface GovAnalytics {
  summary: GovAnalyticsSummary;
  yearlyTrend: YearlyTrendPoint[];
  monthlyTrend: MonthlyTrendPoint[];
  availableYears: number[];
  categoryBreakdown: CategoryCount[];
  statusBreakdown: StatusCount[];
  severityDistribution: SeverityBucket[];
  resolutionTrend: ResolutionTrendPoint[];
}

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function resolutionDays(report: Report): number | null {
  if (report.status !== "resolved" || !report.resolution) return null;
  const start = new Date(report.createdAt).getTime();
  const end = new Date(report.resolution.resolvedAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return null;
  return (end - start) / 86_400_000;
}

export function computeGovAnalytics(
  reports: Report[],
  yearForMonthly: number
): GovAnalytics {
  const openReports = reports.filter((r) => r.status !== "resolved");
  const resolvedReports = reports.filter((r) => r.status === "resolved");
  const declined = resolvedReports.filter((r) => r.resolution?.rejected);
  const fixed = resolvedReports.filter((r) => r.resolution && !r.resolution.rejected);

  const resolutionDaysList = fixed
    .map(resolutionDays)
    .filter((d): d is number => d != null);

  const openAges = openReports.map(
    (r) => (Date.now() - new Date(r.createdAt).getTime()) / 86_400_000
  );

  const corroborated = reports.filter((r) => r.submissions.length >= 2);
  const residentSubmissions = reports.reduce((n, r) => n + r.submissions.length, 0);

  const summary: GovAnalyticsSummary = {
    total: reports.length,
    open: openReports.length,
    resolved: resolvedReports.length,
    criticalOpen: openReports.filter((r) => r.severity >= 8).length,
    resolutionRate: reports.length
      ? Math.round((resolvedReports.length / reports.length) * 100)
      : 0,
    declinedRate: resolvedReports.length
      ? Math.round((declined.length / resolvedReports.length) * 100)
      : 0,
    avgOpenSeverity: openReports.length
      ? Math.round(
          (openReports.reduce((s, r) => s + r.severity, 0) / openReports.length) * 10
        ) / 10
      : 0,
    avgResolutionDays: resolutionDaysList.length
      ? Math.round(
          (resolutionDaysList.reduce((a, b) => a + b, 0) / resolutionDaysList.length) * 10
        ) / 10
      : null,
    medianResolutionDays: resolutionDaysList.length
      ? Math.round((median(resolutionDaysList) ?? 0) * 10) / 10
      : null,
    corroboratedCount: corroborated.length,
    corroborationRate: reports.length
      ? Math.round((corroborated.length / reports.length) * 100)
      : 0,
    avgSubmissions: reports.length
      ? Math.round((residentSubmissions / reports.length) * 100) / 100
      : 0,
    residentSubmissions,
    avgOpenAgeDays: openAges.length
      ? Math.round((openAges.reduce((a, b) => a + b, 0) / openAges.length) * 10) / 10
      : null,
    withMedia: reports.filter((r) => r.media.length > 0).length,
  };

  const yearSet = new Set<number>();
  reports.forEach((r) => {
    yearSet.add(new Date(r.createdAt).getFullYear());
    if (r.resolution?.resolvedAt) {
      yearSet.add(new Date(r.resolution.resolvedAt).getFullYear());
    }
  });
  const availableYears = [...yearSet].sort((a, b) => a - b);
  if (!availableYears.length) {
    availableYears.push(new Date().getFullYear());
  }

  const minYear = availableYears[0];
  const maxYear = availableYears[availableYears.length - 1];
  const yearlyTrend: YearlyTrendPoint[] = [];
  for (let y = minYear; y <= maxYear; y++) {
    const filed = reports.filter((r) => new Date(r.createdAt).getFullYear() === y).length;
    const resolvedInYear = reports.filter(
      (r) =>
        r.status === "resolved" &&
        r.resolution &&
        new Date(r.resolution.resolvedAt).getFullYear() === y
    ).length;
    const stillOpenFromYear = reports.filter(
      (r) =>
        r.status !== "resolved" && new Date(r.createdAt).getFullYear() === y
    ).length;
    yearlyTrend.push({
      year: String(y),
      filed,
      resolved: resolvedInYear,
      open: stillOpenFromYear,
    });
  }

  const monthlyTrend: MonthlyTrendPoint[] = MONTH_LABELS.map((month, monthIndex) => {
    const filed = reports.filter((r) => {
      const d = new Date(r.createdAt);
      return d.getFullYear() === yearForMonthly && d.getMonth() === monthIndex;
    }).length;
    const resolved = reports.filter((r) => {
      if (r.status !== "resolved" || !r.resolution) return false;
      const d = new Date(r.resolution.resolvedAt);
      return d.getFullYear() === yearForMonthly && d.getMonth() === monthIndex;
    }).length;
    return { month, monthIndex, filed, resolved };
  });

  const categoryBreakdown: CategoryCount[] = CATEGORIES.map((category) => ({
    category,
    count: reports.filter((r) => r.category === category).length,
    open: reports.filter((r) => r.category === category && r.status !== "resolved").length,
    label: category,
    color: CATEGORY_CHART_COLORS[category],
  }))
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count);

  const statusBreakdown: StatusCount[] = STATUS_PIPELINE.map((status) => ({
    status,
    count: reports.filter((r) => r.status === status).length,
    label: status.replace("_", " "),
    color: STATUS_CHART_COLORS[status],
  })).filter((s) => s.count > 0);

  const severityDistribution: SeverityBucket[] = Array.from({ length: 10 }, (_, i) => {
    const severity = i + 1;
    return {
      severity,
      count: reports.filter((r) => r.severity === severity).length,
    };
  });

  const resolutionByMonth = new Map<number, number[]>();
  fixed.forEach((r) => {
    const days = resolutionDays(r);
    if (days == null || !r.resolution) return;
    if (new Date(r.resolution.resolvedAt).getFullYear() !== yearForMonthly) return;
    const m = new Date(r.resolution.resolvedAt).getMonth();
    const list = resolutionByMonth.get(m) ?? [];
    list.push(days);
    resolutionByMonth.set(m, list);
  });

  const resolutionTrend: ResolutionTrendPoint[] = MONTH_LABELS.map((month, monthIndex) => {
    const days = resolutionByMonth.get(monthIndex) ?? [];
    return {
      month,
      avgDays: days.length
        ? Math.round((days.reduce((a, b) => a + b, 0) / days.length) * 10) / 10
        : 0,
      count: days.length,
    };
  });

  return {
    summary,
    yearlyTrend,
    monthlyTrend,
    availableYears,
    categoryBreakdown,
    statusBreakdown,
    severityDistribution,
    resolutionTrend,
  };
}

export function shortCategory(category: Category): string {
  const part = category.split("/")[0];
  return part.length > 18 ? `${part.slice(0, 16)}…` : part;
}
