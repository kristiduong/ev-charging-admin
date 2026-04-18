import { useMemo, useState } from "react";
import {
  CartesianGrid, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { DataTable, type ColumnDef } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { StatCard }   from "../components/StatCard";
import { useApi }     from "../hooks/useApi";
import { fetchSessions, fetchSessionCountByDay, type ChargingSession } from "../api/index";
import { cardShell, cn, inputShell } from "../lib/cn";

const CHART = { line: "#38bdf8", grid: "rgba(148,163,184,0.12)", axis: "#64748b" };
const TT = { backgroundColor: "#1a2332", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "12px" };

const STATUS_BADGE: Record<string, string> = {
  Completed: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40",
  Active:    "bg-sky-500/20     text-sky-300     ring-sky-500/40",
  Pending:   "bg-amber-500/20   text-amber-200   ring-amber-500/40",
  Cancelled: "bg-rose-500/20    text-rose-300    ring-rose-500/40",
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

export function Sessions() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [datePreset,   setDatePreset]   = useState("30");

  const daysParam = datePreset === "all" ? undefined : Number(datePreset);

  const sessions = useApi(
    () => fetchSessions({ days: daysParam, status: statusFilter !== "all" ? statusFilter : undefined }),
    [statusFilter, datePreset]
  );

  const chart = useApi(
    () => fetchSessionCountByDay(daysParam ?? 90),
    [datePreset]
  );

  const rows = sessions.data ?? [];

  const metrics = useMemo(() => {
    const total    = rows.length;
    const active   = rows.filter((s) => s.status === "Active"  || s.status === "Pending").length;
    const energy   = rows.reduce((a, s) => a + Number(s.kwh ?? 0), 0);
    const revenue  = rows.filter((s) => s.status === "Completed").reduce((a, s) => a + Number(s.cost_usd ?? 0), 0);
    return { total, active, energy, revenue };
  }, [rows]);

  const chartData = useMemo(() =>
    (chart.data ?? []).map((r) => ({
      day:   new Date(r.date).toLocaleDateString(undefined, { month: "numeric", day: "numeric" }),
      count: Number(r.count),
    })),
  [chart.data]);

  const columns: ColumnDef<ChargingSession>[] = useMemo(() => [
    {
      id: "id", header: "Session ID", sortable: true,
      getSortValue: (s) => String(s.id),
      cell: (s) => <span className="font-mono text-xs text-slate-500 dark:text-ink-faint">{s.id}</span>,
    },
    {
      id: "user_name", header: "Driver", sortable: true,
      getSortValue: (s) => s.user_name,
      cell: (s) => <span className="font-medium">{s.user_name}</span>,
    },
    {
      id: "charger_id", header: "Charger ID", sortable: true,
      getSortValue: (s) => String(s.charger_id),
      cell: (s) => <span className="font-mono text-xs text-slate-500 dark:text-ink-faint">{s.charger_id}</span>,
    },
    {
      id: "station_name", header: "Station", sortable: true,
      getSortValue: (s) => s.station_name,
      cell: (s) => <span className="text-slate-600 dark:text-ink-muted">{s.station_name}</span>,
    },
    {
      id: "started_at", header: "Start Time", sortable: true,
      getSortValue: (s) => s.started_at ?? "",
      cell: (s) => <span className="tabular-nums text-xs">{safeDate(s.started_at)}</span>,
    },
    {
      id: "ended_at", header: "End Time", sortable: true,
      getSortValue: (s) => s.ended_at ?? "",
      cell: (s) => <span className="tabular-nums text-xs">{safeDate(s.ended_at)}</span>,
    },
    {
      id: "kwh", header: "Energy (kWh)", sortable: true,
      headerClassName: "text-right", cellClassName: "text-right tabular-nums",
      getSortValue: (s) => Number(s.kwh),
      cell: (s) => Number(s.kwh ?? 0).toFixed(2),
    },
    {
      id: "cost_usd", header: "Total Cost", sortable: true,
      headerClassName: "text-right", cellClassName: "text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400",
      getSortValue: (s) => Number(s.cost_usd),
      cell: (s) => `$${Number(s.cost_usd ?? 0).toFixed(2)}`,
    },
    {
      id: "status", header: "Status", sortable: true,
      getSortValue: (s) => s.status,
      cell: (s) => <StatusBadge status={s.status} />,
    },
  ], []);

  return (
    <div>
      <PageHeader subtitle="Charging sessions from MySQL charging_session table — energy, cost, and status." />

      {/* KPI Cards */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Sessions"   value={String(metrics.total)}               hint="In current filter" />
        <StatCard label="Active / Pending" value={String(metrics.active)}              hint="In progress" />
        <StatCard label="Energy Consumed"  value={`${metrics.energy.toFixed(1)} kWh`}  hint="Sum for filtered rows" />
        <StatCard label="Session Revenue"  value={`$${metrics.revenue.toFixed(2)}`}    hint="Completed sessions only" />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 dark:text-ink-faint">Session Status</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputShell}>
            <option value="all">All statuses</option>
            <option value="Completed">Completed</option>
            <option value="Active">Active</option>
            <option value="Pending">Pending</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 dark:text-ink-faint">Date Range</label>
          <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)} className={inputShell}>
            <option value="7">Last 7 days</option>
            <option value="14">Last 14 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="all">All time</option>
          </select>
        </div>
        {sessions.loading ? null : (
          <p className="text-xs text-slate-500 dark:text-ink-faint">{rows.length} sessions</p>
        )}
      </div>

      {/* Sessions per day chart */}
      <div className={cn(cardShell, "mb-6 p-4 sm:p-5")}>
        <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-ink">Sessions per Day</h2>
        <p className="mt-0.5 text-xs text-slate-500 dark:text-ink-muted">Count by Start_Time date</p>
        <div className="mt-4 h-56 min-h-[200px] w-full sm:h-64">
          {chart.loading ? <Loading /> : chart.error ? <Err msg={chart.error} /> : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="day" tick={{ fill: CHART.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: CHART.axis, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={TT} formatter={(v: number) => [v, "Sessions"]} />
                <Line type="monotone" dataKey="count" stroke={CHART.line} strokeWidth={2} dot={{ fill: CHART.line, r: 3 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-ink-muted">
              No session data for this period.
            </div>
          )}
        </div>
      </div>

      {/* Sessions table */}
      {sessions.loading ? <Loading /> : sessions.error ? <Err msg={sessions.error} /> : (
        <DataTable
          title="Charging Sessions"
          description="From charging_session — joined with user, charger, and station tables."
          columns={columns}
          data={rows}
          rowKey={(s) => String(s.id)}
          searchPlaceholder="Search driver, station, status…"
          globalFilter={(s, q) =>
            [String(s.id), s.user_name, s.station_name, String(s.charger_id), s.status]
              .join(" ").toLowerCase().includes(q)
          }
          defaultPageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyMessage="No sessions found."
        />
      )}
    </div>
  );
}
