import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { DataTable, type ColumnDef } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { StatCard }   from "../components/StatCard";
import { useApi }     from "../hooks/useApi";
import { fetchMaintenanceLogs, type MaintenanceLog } from "../api/index";
import { cardShell, cn, inputShell } from "../lib/cn";

const TT = { backgroundColor: "#1a2332", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "12px" };

const STATUS_BADGE: Record<string, string> = {
  Open:        "bg-rose-500/20    text-rose-300    ring-rose-500/40",
  "In Progress": "bg-amber-500/20 text-amber-200   ring-amber-500/40",
  Resolved:    "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40",
};

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_BADGE[status] ?? "bg-slate-500/20 text-slate-300 ring-slate-400/40";
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1", cls)}>{status}</span>;
}

function safeDate(v: string | null | undefined) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString(); } catch { return v; }
}

function Loading() {
  return <div className="flex h-40 items-center justify-center text-sm text-slate-400 dark:text-ink-muted">Loading…</div>;
}
function Err({ msg }: { msg: string }) {
  return <div className="flex h-40 items-center justify-center text-sm text-rose-400">{msg}</div>;
}

export function MaintenanceLogPage() {
  const [filterStatus,  setFilterStatus]  = useState("all");
  const [filterStation, setFilterStation] = useState("all");

  const { data, loading, error } = useApi(fetchMaintenanceLogs, []);
  const logs = data ?? [];

  const stationOptions = useMemo(() =>
    [...new Set(logs.map((m) => m.station_name))].sort(),
  [logs]);

  const filtered = useMemo(() => logs.filter((m) => {
    if (filterStatus  !== "all" && m.status       !== filterStatus)  return false;
    if (filterStation !== "all" && m.station_name !== filterStation) return false;
    return true;
  }), [logs, filterStatus, filterStation]);

  const metrics = useMemo(() => ({
    total:      filtered.length,
    open:       filtered.filter((m) => m.status === "Open").length,
    inProgress: filtered.filter((m) => m.status === "In Progress").length,
    resolved:   filtered.filter((m) => m.status === "Resolved").length,
  }), [filtered]);

  // Issue_Reported breakdown for bar chart. We truncate labels for the Y-axis
  // but keep the full text for the tooltip so long descriptions remain
  // readable.
  const MAX_LABEL = 28;
  const truncate = (s: string) =>
    s.length > MAX_LABEL ? `${s.slice(0, MAX_LABEL - 1)}…` : s;

  const issueChart = useMemo(() => {
    const counts = new Map<string, number>();
    for (const m of filtered) {
      const key = (m.issue_type ?? "Unknown").trim();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([issueType, count]) => ({
        issueType,              // full text, used by Tooltip
        label: truncate(issueType), // short, used by YAxis
        count,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8); // cap at top 8 so the chart never gets unreadable
  }, [filtered]);

  const columns: ColumnDef<MaintenanceLog>[] = useMemo(() => [
    {
      id: "id", header: "Maintenance ID", sortable: true,
      getSortValue: (m) => String(m.id),
      cell: (m) => <span className="font-mono text-xs text-slate-500 dark:text-ink-faint">{m.id}</span>,
    },
    {
      id: "charger_id", header: "Charger ID", sortable: true,
      getSortValue: (m) => String(m.charger_id ?? ""),
      cell: (m) => <span className="font-mono text-xs text-slate-500 dark:text-ink-faint">{m.charger_id ?? "—"}</span>,
    },
    {
      id: "station_name", header: "Station", sortable: true,
      getSortValue: (m) => m.station_name,
      cell: (m) => <span className="text-slate-600 dark:text-ink-muted">{m.station_name}</span>,
    },
    {
      id: "technician_id", header: "Technician ID", sortable: true,
      getSortValue: (m) => String(m.technician_id ?? ""),
      cell: (m) => (
        <span className="font-mono text-xs text-slate-500 dark:text-ink-faint">
          {m.technician_id ?? "—"}
        </span>
      ),
    },
    {
      id: "issue_type", header: "Issue Reported", sortable: true,
      getSortValue: (m) => m.issue_type ?? "",
      cellClassName: "max-w-[260px] text-xs leading-relaxed",
      cell: (m) => <span className="text-slate-600 dark:text-ink-muted">{m.issue_type ?? "—"}</span>,
    },
    {
      id: "status", header: "Status", sortable: true,
      getSortValue: (m) => m.status,
      cell: (m) => <StatusBadge status={m.status} />,
    },
    {
      id: "resolved_time", header: "Resolved Time", sortable: true,
      getSortValue: (m) => m.resolved_time ?? "",
      cell: (m) => (
        <span className="tabular-nums text-xs text-slate-600 dark:text-ink-muted">
          {safeDate(m.resolved_time)}
        </span>
      ),
    },
  ], []);

  return (
    <div>
      <PageHeader subtitle="Work orders from MySQL maintenance_log table — charger issues, status, and resolution." />

      {loading ? <Loading /> : error ? <Err msg={error} /> : (
        <>
          {/* KPI Cards */}
          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Total Logs"   value={String(metrics.total)}      hint="In current filter" />
            <StatCard label="Open"         value={String(metrics.open)}       hint="Needs attention" />
            <StatCard label="In Progress"  value={String(metrics.inProgress)} hint="Active work" />
            <StatCard label="Resolved"     value={String(metrics.resolved)}   hint="Closed tickets" />
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 dark:text-ink-faint">Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={inputShell}>
                <option value="all">All statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 dark:text-ink-faint">Station</label>
              <select value={filterStation} onChange={(e) => setFilterStation(e.target.value)} className={cn(inputShell, "min-w-[200px]")}>
                <option value="all">All stations</option>
                {stationOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <p className="text-xs text-slate-500 dark:text-ink-faint">
              {filtered.length} of {logs.length} logs
            </p>
          </div>

          {/* Issue type chart */}
          <div className={cn(cardShell, "mb-6 p-4 sm:p-5")}>
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-ink">Most Common Issues</h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-ink-muted">Top issues by ticket count · hover a bar for the full issue description</p>
            <div className="mt-4 w-full" style={{ height: Math.max(220, issueChart.length * 40 + 40) }}>
              {issueChart.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={issueChart}
                    layout="vertical"
                    margin={{ top: 8, right: 48, left: 8, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" horizontal={false} />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tick={{ fill: "#94a3b8", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={240}
                      interval={0}
                      tick={{ fill: "#cbd5e1", fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={TT}
                      // Show the full (untruncated) issue text in the tooltip label
                      labelFormatter={(_label, payload) =>
                        (payload?.[0]?.payload as { issueType?: string })?.issueType ?? ""
                      }
                      formatter={(v: number) => [v, "Tickets"]}
                    />
                    <Bar
                      dataKey="count"
                      fill="#3b82f6"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={28}
                      label={{ position: "right", fill: "#cbd5e1", fontSize: 11 }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-ink-muted">
                  No maintenance logs in current filter.
                </div>
              )}
            </div>
          </div>

          {/* Maintenance table */}
          <DataTable
            title="Maintenance Logs"
            description="From MySQL maintenance_log table — joined with station."
            columns={columns}
            data={filtered}
            rowKey={(m) => String(m.id)}
            searchPlaceholder="Search station, issue, status, technician…"
            globalFilter={(m, q) =>
              [String(m.id), String(m.charger_id ?? ""), m.station_name, m.issue_type ?? "", m.status, String(m.technician_id ?? "")]
                .join(" ").toLowerCase().includes(q)
            }
            defaultPageSize={10}
            pageSizeOptions={[10, 25, 50]}
            emptyMessage="No maintenance logs match the selected filters."
          />
        </>
      )}
    </div>
  );
}
