import { useMemo, useState } from "react";
import { DataTable, type ColumnDef } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { StatCard }   from "../components/StatCard";
import { useApi }     from "../hooks/useApi";
import { fetchUsers, type User } from "../api/index";
import { cn, inputShell } from "../lib/cn";

// ── Badges ────────────────────────────────────────────────────────────────────
const PLAN_CLS: Record<string, string> = {
  Silver:  "bg-slate-500/20  text-slate-200  ring-slate-400/35",
  Gold:    "bg-amber-500/20  text-amber-200  ring-amber-500/40",
  Diamond: "bg-sky-500/20    text-sky-200    ring-sky-500/40",
};

const SUB_BADGE: Record<string, { label: string; cls: string }> = {
  Active:    { label: "Active",    cls: "bg-emerald-500/15 text-emerald-300 ring-emerald-500/30" },
  Pending:   { label: "Pending",   cls: "bg-amber-500/15   text-amber-200   ring-amber-500/35"   },
  Expired:   { label: "Expired",   cls: "bg-slate-500/20   text-slate-300   ring-slate-500/30"   },
  Cancelled: { label: "Cancelled", cls: "bg-rose-500/15    text-rose-300    ring-rose-500/30"    },
};

function PlanBadge({ plan }: { plan: string | null }) {
  if (!plan) return <span className="text-xs text-slate-400 dark:text-ink-faint">—</span>;
  const cls = PLAN_CLS[plan] ?? "bg-slate-500/20 text-slate-300 ring-slate-400/35";
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1", cls)}>{plan}</span>;
}

function SubBadge({ status }: { status: string | null }) {
  if (!status) return <span className="text-xs text-slate-400 dark:text-ink-faint">—</span>;
  const b = SUB_BADGE[status] ?? { label: status, cls: "bg-slate-500/20 text-slate-300 ring-slate-400/35" };
  return <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1", b.cls)}>{b.label}</span>;
}

function Loading() {
  return <div className="flex h-40 items-center justify-center text-sm text-slate-400 dark:text-ink-muted">Loading…</div>;
}
function Err({ msg }: { msg: string }) {
  return <div className="flex h-40 items-center justify-center text-sm text-rose-400">{msg}</div>;
}

export function Users() {
  const [filterPlan,      setFilterPlan]      = useState("all");
  const [filterSubStatus, setFilterSubStatus] = useState("all");

  const { data, loading, error } = useApi(fetchUsers, []);
  const users = data ?? [];

  // Case/whitespace-insensitive compare so filters still match if the DB
  // has values like "gold " vs "Gold".
  const norm = (v: string | null | undefined) =>
    (v ?? "").trim().toLowerCase();

  const filtered = useMemo(() => users.filter((u) => {
    if (filterPlan      !== "all" && norm(u.plan_tier)           !== norm(filterPlan))      return false;
    if (filterSubStatus !== "all" && norm(u.subscription_status) !== norm(filterSubStatus)) return false;
    return true;
  }), [users, filterPlan, filterSubStatus]);

  // KPI metrics
  const metrics = useMemo(() => {
    const planCounts: Record<string, number> = {};
    let activeCount = 0;
    for (const u of users) {
      if (u.plan_tier) {
        const key = u.plan_tier.trim();
        planCounts[key] = (planCounts[key] ?? 0) + 1;
      }
      if (norm(u.subscription_status) === "active") activeCount++;
    }
    return { total: users.length, active: activeCount, plans: planCounts };
  }, [users]);

  // Build filter options from what's actually in the data, de-duping
  // case-/whitespace-insensitively so "Gold" and "gold " become one entry.
  const uniqueByNorm = (values: (string | null)[]): string[] => {
    const seen = new Map<string, string>();
    for (const v of values) {
      if (!v) continue;
      const trimmed = v.trim();
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) seen.set(key, trimmed);
    }
    return [...seen.values()].sort();
  };

  const planOptions      = useMemo(() => uniqueByNorm(users.map((u) => u.plan_tier)),           [users]);
  const subStatusOptions = useMemo(() => uniqueByNorm(users.map((u) => u.subscription_status)), [users]);

  const columns: ColumnDef<User>[] = useMemo(() => [
    {
      id: "id", header: "User ID", sortable: true,
      getSortValue: (u) => String(u.id),
      cell: (u) => <span className="font-mono text-xs text-slate-500 dark:text-ink-faint">{u.id}</span>,
    },
    {
      id: "name", header: "Full Name", sortable: true,
      getSortValue: (u) => u.name,
      cell: (u) => <span className="font-medium text-slate-900 dark:text-ink">{u.name}</span>,
    },
    {
      id: "email", header: "Email", sortable: true,
      getSortValue: (u) => u.email,
      cell: (u) => <span className="text-slate-600 dark:text-ink-muted">{u.email}</span>,
    },
    {
      id: "phone", header: "Phone", sortable: true,
      getSortValue: (u) => u.phone,
      cell: (u) => <span className="tabular-nums text-slate-600 dark:text-ink-muted">{u.phone}</span>,
    },
    {
      id: "vehicle", header: "Vehicle", sortable: true,
      getSortValue: (u) => `${u.vehicle_brand} ${u.vehicle_model}`,
      cellClassName: "max-w-[180px]",
      cell: (u) => (
        <span className="text-slate-600 dark:text-ink-muted">
          {u.vehicle_brand} {u.vehicle_model}
        </span>
      ),
    },
    {
      id: "plan", header: "Membership Plan", sortable: true,
      getSortValue: (u) => u.plan_tier ?? "",
      cell: (u) => <PlanBadge plan={u.plan_tier} />,
    },
    {
      id: "sub_status", header: "Subscription", sortable: true,
      getSortValue: (u) => u.subscription_status ?? "",
      cell: (u) => <SubBadge status={u.subscription_status} />,
    },
    {
      id: "renews", header: "Renews", sortable: true,
      getSortValue: (u) => u.renews ?? "",
      cell: (u) => (
        <span className="tabular-nums text-xs text-slate-600 dark:text-ink-muted">
          {u.renews ? new Date(u.renews).toLocaleDateString() : "—"}
        </span>
      ),
    },
  ], []);

  return (
    <div>
      <PageHeader subtitle="Driver profiles from MySQL user table — joined with subscription and membership." />

      {loading ? <Loading /> : error ? <Err msg={error} /> : (
        <>
          {/* KPI Cards */}
          <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total Users"        value={String(metrics.total)}  hint="Registered drivers" />
            <StatCard label="Active Subscribers" value={String(metrics.active)} hint="Active subscription" />
            {Object.entries(metrics.plans).map(([plan, count]) => (
              <StatCard key={plan} label={`${plan} Plan`} value={String(count)} hint={`On ${plan}`} />
            ))}
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 dark:text-ink-faint">Membership Plan</label>
              <select value={filterPlan} onChange={(e) => setFilterPlan(e.target.value)} className={inputShell}>
                <option value="all">All plans</option>
                {planOptions.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 dark:text-ink-faint">Subscription Status</label>
              <select value={filterSubStatus} onChange={(e) => setFilterSubStatus(e.target.value)} className={inputShell}>
                <option value="all">All statuses</option>
                {subStatusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <p className="text-xs text-slate-500 dark:text-ink-faint">
              {filtered.length} of {users.length} users
            </p>
          </div>

          <DataTable
            columns={columns}
            data={filtered}
            rowKey={(u) => String(u.id)}
            searchPlaceholder="Search name, email, phone, vehicle, plan…"
            globalFilter={(u, q) =>
              [u.name, u.email, u.phone, u.vehicle_brand, u.vehicle_model, u.plan_tier ?? "", u.subscription_status ?? ""]
                .join(" ").toLowerCase().includes(q)
            }
            emptyMessage="No users match the selected filters."
          />
        </>
      )}
    </div>
  );
}
