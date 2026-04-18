import { useMemo, useState } from "react";
import {
  Bar, BarChart, CartesianGrid, Cell,
  Legend, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { DataTable, type ColumnDef } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { StatCard }   from "../components/StatCard";
import { useApi }     from "../hooks/useApi";
import { fetchPayments, fetchRevenueByMonth, fetchPaymentTypeBreakdown, type Payment } from "../api/index";
import { cardShell, cn, inputShell } from "../lib/cn";

const TT = { backgroundColor: "#1a2332", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "8px", fontSize: "12px", color: "#e2e8f0" };

// Higher-contrast palette (vivid + dark-mode readable). Keyed case-insensitively.
const PIE_PALETTE = ["#f59e0b", "#3b82f6", "#ef4444", "#10b981", "#a855f7", "#ec4899"];
const PIE_COLORS: Record<string, string> = {
  charging:     "#3b82f6",
  subscription: "#10b981",
  wallet:       "#a855f7",
};
function colorFor(name: string, idx: number): string {
  return PIE_COLORS[name.trim().toLowerCase()] ?? PIE_PALETTE[idx % PIE_PALETTE.length];
}

// Case-insensitive trimmed compare
const norm = (v: string | null | undefined) => (v ?? "").trim().toLowerCase();
const TYPE_CLS: Record<string, string> = {
  Charging:     "bg-sky-500/20     text-sky-300     ring-sky-500/40",
  Subscription: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40",
  Wallet:       "bg-violet-500/20  text-violet-200  ring-violet-500/40",
};
const STATUS_CLS: Record<string, string> = {
  Completed: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40",
  Pending:   "bg-amber-500/20   text-amber-200   ring-amber-500/40",
  Failed:    "bg-rose-500/20    text-rose-300    ring-rose-500/40",
};

function TypeBadge({ type }: { type: string }) {
  const cls = TYPE_CLS[type] ?? "bg-slate-500/20 text-slate-300 ring-slate-400/40";
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1", cls)}>{type}</span>;
}
function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_CLS[status] ?? "bg-slate-500/20 text-slate-300 ring-slate-400/40";
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1", cls)}>{status}</span>;
}
function Loading() {
  return <div className="flex h-40 items-center justify-center text-sm text-slate-400 dark:text-ink-muted">Loading…</div>;
}
function Err({ msg }: { msg: string }) {
  return <div className="flex h-40 items-center justify-center text-sm text-rose-400">{msg}</div>;
}

export function Payments() {
  const [filterType,   setFilterType]   = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMethod, setFilterMethod] = useState("all");

  const payments  = useApi(fetchPayments, []);
  const revByMonth = useApi(fetchRevenueByMonth, []);
  const typeBreak  = useApi(fetchPaymentTypeBreakdown, []);

  const rows = payments.data ?? [];

  const filtered = useMemo(() => rows.filter((p) => {
    if (filterType   !== "all" && norm(p.type)   !== norm(filterType))   return false;
    if (filterStatus !== "all" && norm(p.status) !== norm(filterStatus)) return false;
    if (filterMethod !== "all" && norm(p.method) !== norm(filterMethod)) return false;
    return true;
  }), [rows, filterType, filterStatus, filterMethod]);

  // Case-insensitive status matching — DB rows might be "completed",
  // "COMPLETED", "Complete", etc.
  const isStatus = (p: Payment, wanted: string) => norm(p.status) === wanted;

  const metrics = useMemo(() => {
    const completed = filtered.filter((p) => isStatus(p, "completed"));
    return {
      revenue: completed.reduce((a, p) => a + Number(p.amount ?? 0), 0),
      success: completed.length,
      failed:  filtered.filter((p) => isStatus(p, "failed")).length,
      pending: filtered.filter((p) => isStatus(p, "pending")).length,
    };
  }, [filtered]);

  // Fallback: if the `/payments/type-breakdown` endpoint returns nothing (or
  // the filter is active), compute from the current filtered rows so the
  // chart still reflects what's in the table.
  const pieData = useMemo(() => {
    const fromApi = (typeBreak.data ?? [])
      .map((r) => ({ name: r.type, value: Number(r.total ?? 0) }))
      .filter((d) => d.value > 0);
    if (fromApi.length > 0 && filterType === "all" && filterStatus === "all" && filterMethod === "all") {
      return fromApi;
    }
    const agg = new Map<string, number>();
    for (const p of filtered) {
      if (!isStatus(p, "completed")) continue;
      const key = (p.type ?? "Other").trim();
      agg.set(key, (agg.get(key) ?? 0) + Number(p.amount ?? 0));
    }
    return [...agg.entries()]
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .filter((d) => d.value > 0);
  }, [typeBreak.data, filtered, filterType, filterStatus, filterMethod]);

  const barData = useMemo(() => {
    const fromApi = (revByMonth.data ?? [])
      .map((r) => ({ month: r.month, revenue: Number(r.revenue ?? 0) }))
      .filter((d) => !!d.month && d.revenue > 0);
    if (fromApi.length > 0 && filterType === "all" && filterStatus === "all" && filterMethod === "all") {
      return fromApi;
    }
    // Fallback: rebuild from the filtered rows
    const agg = new Map<string, number>();
    for (const p of filtered) {
      if (!isStatus(p, "completed") || !p.created_at) continue;
      const d = new Date(p.created_at);
      if (Number.isNaN(d.getTime())) continue;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      agg.set(key, (agg.get(key) ?? 0) + Number(p.amount ?? 0));
    }
    return [...agg.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, revenue]) => ({ month, revenue: Math.round(revenue * 100) / 100 }));
  }, [revByMonth.data, filtered, filterType, filterStatus, filterMethod]);

  // De-dupe options case/whitespace-insensitively so filters still line up
  // with values in the DB even if casing is inconsistent.
  const uniqueByNorm = (values: (string | null | undefined)[]): string[] => {
    const seen = new Map<string, string>();
    for (const v of values) {
      if (!v) continue;
      const trimmed = v.trim();
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) seen.set(key, trimmed);
    }
    return [...seen.values()].sort();
  };

  const typeOptions   = useMemo(() => uniqueByNorm(rows.map((p) => p.type)),   [rows]);
  const statusOptions = useMemo(() => uniqueByNorm(rows.map((p) => p.status)), [rows]);
  const methodOptions = useMemo(() => uniqueByNorm(rows.map((p) => p.method)), [rows]);

  const columns: ColumnDef<Payment>[] = useMemo(() => [
    {
      id: "id", header: "Payment ID", sortable: true,
      getSortValue: (p) => String(p.id),
      cell: (p) => <span className="font-mono text-xs text-slate-500 dark:text-ink-faint">{p.id}</span>,
    },
    {
      id: "user_name", header: "User", sortable: true,
      getSortValue: (p) => p.user_name,
      cell: (p) => <span className="font-medium">{p.user_name}</span>,
    },
    {
      id: "type", header: "Payment Type", sortable: true,
      getSortValue: (p) => p.type,
      cell: (p) => <TypeBadge type={p.type} />,
    },
    {
      id: "amount", header: "Amount", sortable: true,
      headerClassName: "text-right", cellClassName: "text-right tabular-nums font-semibold text-emerald-600 dark:text-emerald-400",
      getSortValue: (p) => Number(p.amount),
      cell: (p) => `$${Number(p.amount ?? 0).toFixed(2)}`,
    },
    {
      id: "method", header: "Payment Method", sortable: true,
      getSortValue: (p) => p.method,
      cell: (p) => <span className="text-slate-600 dark:text-ink-muted">{p.method}</span>,
    },
    {
      id: "status", header: "Status", sortable: true,
      getSortValue: (p) => p.status,
      cell: (p) => <StatusBadge status={p.status} />,
    },
    {
      id: "session_id", header: "Session ID", sortable: true,
      getSortValue: (p) => String(p.session_id ?? ""),
      cell: (p) => (
        <span className="font-mono text-xs text-slate-500 dark:text-ink-faint">
          {p.session_id ?? "—"}
        </span>
      ),
    },
    {
      id: "created_at", header: "Created Time", sortable: true,
      getSortValue: (p) => p.created_at ?? "",
      cell: (p) => (
        <span className="tabular-nums text-xs text-slate-600 dark:text-ink-muted">
          {p.created_at ? new Date(p.created_at).toLocaleString() : "—"}
        </span>
      ),
    },
  ], []);

  return (
    <div>
      <PageHeader subtitle="Transactions from MySQL payment table — joined with user, session, and subscription." />

      {/* KPI Cards */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Revenue"       value={`$${metrics.revenue.toFixed(2)}`} hint="Completed payments" />
        <StatCard label="Successful Payments" value={String(metrics.success)}          hint="Completed transactions" />
        <StatCard label="Failed Payments"     value={String(metrics.failed)}           hint="Declined or error" />
        <StatCard label="Pending Payments"    value={String(metrics.pending)}          hint="Awaiting capture" />
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 dark:text-ink-faint">Payment Type</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={inputShell}>
            <option value="all">All types</option>
            {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 dark:text-ink-faint">Status</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={inputShell}>
            <option value="all">All statuses</option>
            {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 dark:text-ink-faint">Method</label>
          <select value={filterMethod} onChange={(e) => setFilterMethod(e.target.value)} className={inputShell}>
            <option value="all">All methods</option>
            {methodOptions.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        {payments.loading ? null : (
          <p className="text-xs text-slate-500 dark:text-ink-faint">{filtered.length} of {rows.length} payments</p>
        )}
      </div>

      {/* Charts */}
      <div className="mb-6 grid gap-6 lg:grid-cols-2">
        {/* Revenue by Payment Type */}
        <div className={cn(cardShell, "p-4 sm:p-5")}>
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-ink">Revenue by Payment Type</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-ink-muted">Completed payments · Payment_Type breakdown</p>
          <div className="mt-2 h-64 min-h-[220px] w-full sm:h-72">
            {typeBreak.loading ? <Loading /> : typeBreak.error ? <Err msg={typeBreak.error} /> : pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    label={({ name, value, percent }) =>
                      `${name}: $${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })} (${Math.round((percent ?? 0) * 100)}%)`
                    }
                    labelLine={{ stroke: "#94a3b8", strokeWidth: 1 }}
                  >
                    {pieData.map((e, i) => (
                      <Cell key={e.name} fill={colorFor(e.name, i)} stroke="rgba(15,20,25,0.9)" strokeWidth={1} />
                    ))}
                  </Pie>
                  <Legend
                    wrapperStyle={{ fontSize: "12px", paddingTop: "8px" }}
                    formatter={(v) => <span className="text-slate-700 dark:text-slate-200">{v}</span>}
                  />
                  <Tooltip
                    contentStyle={TT}
                    formatter={(v: number, name) => [`$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, name]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-ink-muted">No completed payments to chart.</div>
            )}
          </div>
        </div>

        {/* Monthly Revenue Trend */}
        <div className={cn(cardShell, "p-4 sm:p-5")}>
          <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-ink">Monthly Revenue Trend</h2>
          <p className="mt-0.5 text-xs text-slate-500 dark:text-ink-muted">Completed Payment_Amount · grouped by Created_Time month</p>
          <div className="mt-4 h-64 min-h-[220px] w-full sm:h-72">
            {revByMonth.loading ? <Loading /> : revByMonth.error ? <Err msg={revByMonth.error} /> : barData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} margin={{ top: 16, right: 12, left: 0, bottom: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    angle={-24}
                    textAnchor="end"
                    height={52}
                  />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                  />
                  <Tooltip
                    contentStyle={TT}
                    formatter={(v: number) => [`$${Number(v).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, "Revenue"]}
                  />
                  <Bar
                    dataKey="revenue"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={48}
                    label={{
                      position: "top",
                      fill: "#cbd5e1",
                      fontSize: 11,
                      formatter: (v: number) =>
                        `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500 dark:text-ink-muted">No completed payments to chart.</div>
            )}
          </div>
        </div>
      </div>

      {/* Payments Table */}
      {payments.loading ? <Loading /> : payments.error ? <Err msg={payments.error} /> : (
        <DataTable
          title="Payment History"
          description="From MySQL payment table — joined with user."
          columns={columns}
          data={filtered}
          rowKey={(p) => String(p.id)}
          searchPlaceholder="Search user, type, method, status…"
          globalFilter={(p, q) =>
            [String(p.id), p.user_name, p.type, p.method, p.status, p.created_at ?? ""]
              .join(" ").toLowerCase().includes(q)
          }
          defaultPageSize={10}
          pageSizeOptions={[10, 25, 50]}
          emptyMessage="No payments match the selected filters."
        />
      )}
    </div>
  );
}
