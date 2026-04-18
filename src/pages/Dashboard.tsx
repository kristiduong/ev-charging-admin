import { useMemo } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell,
  Legend, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { DataTable, type ColumnDef } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { StatCard } from "../components/StatCard";
import { useApi } from "../hooks/useApi";
import { cardShell, cn } from "../lib/cn";

// ── Lazy API imports to prevent crash if files missing ────────────────────────
import {
  fetchDashboardKpis,
  fetchRevenueByCity,
  fetchChargerAvailability,
  fetchRecentSessions,
} from "../api/index";
import type { RecentSession } from "../api/index";

// ── Helpers ───────────────────────────────────────────────────────────────────

function num(v: unknown): number {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
}

function money(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `$${(n / 1_000).toFixed(1)}k`;
  return `$${n}`;
}

function safeDate(v: string | null | undefined) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString(); } catch { return v; }
}

// ── Status badge ──────────────────────────────────────────────────────────────

const STATUS_CLASS: Record<string, string> = {
  Completed:  "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40",
  Active:     "bg-sky-500/20     text-sky-300     ring-sky-500/40",
  Pending:    "bg-amber-500/20   text-amber-200   ring-amber-500/40",
  Cancelled:  "bg-rose-500/20    text-rose-300    ring-rose-500/40",
};

function Badge({ label }: { label: string }) {
  const cls = STATUS_CLASS[label] ?? "bg-slate-500/20 text-slate-300 ring-slate-400/40";
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1", cls)}>
      {label}
    </span>
  );
}

// ── Chart colours keyed on Charger_Availability_Status values ─────────────────

const PIE_COLORS: Record<string, string> = {
  Available:   "#22c55e",
  "In Use":    "#38bdf8",
  Unavailable: "#f97316",
  Maintenance: "#a78bfa",
};

const COLORS = {
  green: "#22c55e",
  grid:  "rgba(148,163,184,0.12)",
  axis:  "#64748b",
};

const TT_STYLE = {
  backgroundColor: "#1a2332",
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "8px",
  fontSize: "12px",
};

// ── Loading / Error ───────────────────────────────────────────────────────────

function Loading() {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-slate-400 dark:text-ink-muted">
      Loading…
    </div>
  );
}

function ApiError({ msg }: { msg: string }) {
  return (
    <div className="flex h-40 items-center justify-center text-sm text-rose-400">
      {msg}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export function Dashboard() {
  const kpis    = useApi(fetchDashboardKpis, []);
  const rev     = useApi(fetchRevenueByCity, []);
  const avail   = useApi(fetchChargerAvailability, []);
  const recent  = useApi(() => fetchRecentSessions(10), []);

  const barData = useMemo(
    () =>
      (rev.data ?? [])
        .map((r) => ({ city: r.city ?? "—", revenue: num(r.revenue) }))
        .filter((d) => d.revenue > 0),
    [rev.data]
  );

  const pieData = useMemo(
    () =>
      (avail.data ?? [])
        .map((r) => ({ name: String(r.status ?? "Unknown"), value: num(r.count) }))
        .filter((d) => d.value > 0),
    [avail.data]
  );

  const pieTotal = useMemo(
    () => pieData.reduce((a, d) => a + d.value, 0),
    [pieData]
  );

  const cols: ColumnDef<RecentSession>[] = useMemo(() => [
    {
      id: "id",
      header: "Session ID",
      sortable: true,
      getSortValue: (r) => String(r.id),
      cell: (r) => (
        <span className="font-mono text-xs text-slate-500 dark:text-ink-faint">
          {r.id}
        </span>
      ),
    },
    {
      id: "user_name",
      header: "Driver",
      sortable: true,
      getSortValue: (r) => r.user_name,
      cell: (r) => <span className="font-medium">{r.user_name}</span>,
    },
    {
      id: "station_name",
      header: "Station",
      sortable: true,
      getSortValue: (r) => r.station_name,
      cell: (r) => (
        <span className="text-slate-600 dark:text-ink-muted">{r.station_name}</span>
      ),
    },
    {
      id: "started_at",
      header: "Start Time",
      sortable: true,
      getSortValue: (r) => r.started_at ?? "",
      cell: (r) => (
        <span className="tabular-nums text-xs">{safeDate(r.started_at)}</span>
      ),
    },
    {
      id: "ended_at",
      header: "End Time",
      sortable: true,
      getSortValue: (r) => r.ended_at ?? "",
      cell: (r) => (
        <span className="tabular-nums text-xs">
          {r.ended_at ? safeDate(r.ended_at) : "In progress"}
        </span>
      ),
    },
    {
      id: "kwh",
      header: "Energy (kWh)",
      sortable: true,
      headerClassName: "text-right",
      cellClassName: "text-right tabular-nums",
      getSortValue: (r) => num(r.kwh),
      cell: (r) => num(r.kwh).toFixed(2),
    },
    {
      id: "cost_usd",
      header: "Total Cost",
      sortable: true,
      headerClassName: "text-right",
      cellClassName: "text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400",
      getSortValue: (r) => num(r.cost_usd),
      cell: (r) => `$${num(r.cost_usd).toFixed(2)}`,
    },
    {
      id: "status",
      header: "Status",
      sortable: true,
      getSortValue: (r) => r.status,
      cell: (r) => <Badge label={String(r.status)} />,
    },
  ], []);

  return (
    <div>
      <PageHeader subtitle="Live network overview — EV MySQL database." />

      {/* KPI Cards */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.loading ? (
          <div className="col-span-4"><Loading /></div>
        ) : kpis.error ? (
          <div className="col-span-4"><ApiError msg={kpis.error} /></div>
        ) : (
          <>
            <StatCard
              label="Total Stations"
              value={String(kpis.data?.totalStations ?? 0)}
              hint="Charging locations"
            />
            <StatCard
              label="Total Chargers"
              value={String(kpis.data?.totalChargers ?? 0)}
              hint="Across all stations"
            />
            <StatCard
              label="Registered Users"
              value={String(kpis.data?.totalUsers ?? 0)}
              hint="EV drivers on platform"
            />
            <StatCard
              label="Membership Plans"
              value={String(kpis.data?.totalPlans ?? 0)}
              hint="Available plan tiers"
            />
          </>
        )}
      </div>

      {/* Charts */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">

        {/* Revenue by City */}
        <div className={cn(cardShell, "p-5")}>
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-ink">
            Revenue by City
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-ink-muted">
            Payment_Amount · grouped by Station_City
          </p>
          <div className="mt-4 h-64 min-h-[220px] w-full sm:h-72">
            {rev.loading ? <Loading /> : rev.error ? <ApiError msg={rev.error} /> : barData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-ink-muted">
                No completed payments yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 4, right: 48, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} horizontal={false} />
                  <XAxis
                    type="number"
                    tick={{ fill: COLORS.axis, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={money}
                  />
                  <YAxis
                    type="category"
                    dataKey="city"
                    width={110}
                    tick={{ fill: COLORS.axis, fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={TT_STYLE}
                    formatter={(v: number) => [`$${v.toLocaleString()}`, "Revenue"]}
                  />
                  <Bar
                    dataKey="revenue"
                    fill={COLORS.green}
                    radius={[0, 4, 4, 0]}
                    maxBarSize={24}
                    label={{
                      position: "right",
                      fill: "#cbd5e1",
                      fontSize: 11,
                      formatter: (v: number) => money(v),
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Charger Availability */}
        <div className={cn(cardShell, "p-5")}>
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-ink">
            Charger Availability
          </h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-ink-muted">
            Charger_Availability_Status distribution
          </p>
          <div className="mt-2 h-64 min-h-[220px] w-full sm:h-72">
            {avail.loading ? <Loading /> : avail.error ? <ApiError msg={avail.error} /> : pieData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-ink-muted">
                No charger data.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={52}
                    outerRadius={80}
                    paddingAngle={2}
                    // Outside labels — "Available: 34 (42%)"
                    label={({ name, value, percent }) =>
                      `${name}: ${value} (${Math.round((percent ?? 0) * 100)}%)`
                    }
                    labelLine={{ stroke: "#94a3b8", strokeWidth: 1 }}
                  >
                    {pieData.map((e) => (
                      <Cell
                        key={e.name}
                        fill={PIE_COLORS[e.name] ?? "#94a3b8"}
                        stroke="rgba(15,20,25,0.8)"
                        strokeWidth={1}
                      />
                    ))}
                  </Pie>
                  {/* Center total */}
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="fill-slate-700 dark:fill-slate-200"
                    style={{ fontSize: 18, fontWeight: 600 }}
                  >
                    {pieTotal}
                  </text>
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                    formatter={(v) => (
                      <span className="text-slate-700 dark:text-slate-200">{v}</span>
                    )}
                  />
                  <Tooltip
                    contentStyle={TT_STYLE}
                    formatter={(v: number, name) => [`${v} chargers`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Recent Sessions Table */}
      {recent.loading ? (
        <div className={cn(cardShell, "p-5")}><Loading /></div>
      ) : recent.error ? (
        <div className={cn(cardShell, "p-5")}><ApiError msg={recent.error} /></div>
      ) : (
        <DataTable
          title="Recent Charging Sessions"
          description="Latest sessions from charging_session · joined with user and station"
          columns={cols}
          data={recent.data ?? []}
          rowKey={(r) => String(r.id)}
          searchPlaceholder="Search driver, station, status…"
          defaultPageSize={10}
          pageSizeOptions={[5, 10, 25]}
          emptyMessage="No sessions found."
          globalFilter={(r, q) =>
            String(r.user_name).toLowerCase().includes(q) ||
            String(r.station_name).toLowerCase().includes(q) ||
            String(r.status).toLowerCase().includes(q)
          }
        />
      )}
    </div>
  );
}
