import { useMemo, useState } from "react";
import { DataTable, type ColumnDef } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { useApi } from "../hooks/useApi";
import { fetchStations, type Station } from "../api/index";
import { cardShell, cn, inputShell } from "../lib/cn";

// ── Status badge keyed on Station_Status values from MySQL ────────────────────
const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  Open:        { label: "Open",        cls: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40" },
  Closed:      { label: "Closed",      cls: "bg-rose-500/20    text-rose-300    ring-rose-500/40"    },
  Maintenance: { label: "Maintenance", cls: "bg-amber-500/20   text-amber-200   ring-amber-500/40"   },
};

function StatusBadge({ status }: { status: string }) {
  const b = STATUS_BADGE[status] ?? { label: status, cls: "bg-slate-500/20 text-slate-300 ring-slate-400/40" };
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1", b.cls)}>
      {b.label}
    </span>
  );
}

function Loading() {
  return <div className="flex h-40 items-center justify-center text-sm text-slate-400 dark:text-ink-muted">Loading…</div>;
}
function Err({ msg }: { msg: string }) {
  return <div className="flex h-40 items-center justify-center text-sm text-rose-400">{msg}</div>;
}

export function Stations() {
  const [stateFilter,  setStateFilter]  = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, loading, error } = useApi(fetchStations, []);
  const stations = data ?? [];

  const stateOptions = useMemo(() => [...new Set(stations.map((s) => s.state))].sort(), [stations]);

  const filtered = useMemo(() => stations.filter((s) => {
    if (stateFilter  !== "all" && s.state              !== stateFilter)  return false;
    if (statusFilter !== "all" && s.operational_status !== statusFilter) return false;
    return true;
  }), [stations, stateFilter, statusFilter]);

  const columns: ColumnDef<Station>[] = useMemo(() => [
    {
      id: "id", header: "Station ID", sortable: true,
      getSortValue: (s) => String(s.id),
      cell: (s) => <span className="font-mono text-xs text-slate-500 dark:text-ink-faint">{s.id}</span>,
    },
    {
      id: "name", header: "Station Name", sortable: true,
      getSortValue: (s) => s.name,
      cell: (s) => <span className="font-medium text-slate-900 dark:text-ink">{s.name}</span>,
    },
    {
      id: "company", header: "Company", sortable: true,
      getSortValue: (s) => s.company_name,
      cell: (s) => <span className="text-slate-600 dark:text-ink-muted">{s.company_name}</span>,
    },
    {
      id: "city", header: "City", sortable: true,
      getSortValue: (s) => s.city_name,
      cell: (s) => <span className="text-slate-600 dark:text-ink-muted">{s.city_name}</span>,
    },
    {
      id: "state", header: "State", sortable: true,
      getSortValue: (s) => s.state,
      cell: (s) => <span className="text-slate-600 dark:text-ink-muted">{s.state}</span>,
    },
    {
      id: "zip", header: "ZIP", sortable: true,
      getSortValue: (s) => s.zip,
      cell: (s) => <span className="tabular-nums text-slate-600 dark:text-ink-muted">{s.zip}</span>,
    },
    {
      id: "slots", header: "Total Slots", sortable: true,
      headerClassName: "text-right", cellClassName: "text-right tabular-nums",
      getSortValue: (s) => Number(s.total_slots),
      cell: (s) => <span className="font-medium">{s.total_slots}</span>,
    },
    {
      id: "status", header: "Status", sortable: true,
      getSortValue: (s) => s.operational_status,
      cell: (s) => <StatusBadge status={s.operational_status} />,
    },
    {
      id: "hours", header: "Opening Hours", sortable: true,
      getSortValue: (s) => s.opening_hours,
      cellClassName: "text-xs max-w-[200px]",
      cell: (s) => <span className="text-slate-600 dark:text-ink-muted">{s.opening_hours}</span>,
    },
  ], []);

  return (
    <div>
      <PageHeader subtitle="Charging locations from MySQL station table — filter by state or status." />

      {loading ? <Loading /> : error ? <Err msg={error} /> : (
        <>
          {/* Summary strip */}
          <div className={cn(cardShell, "mb-6 flex flex-wrap gap-4 px-4 py-3 sm:px-5")}>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-ink-faint">Total Stations</p>
              <p className="font-display text-xl font-semibold text-slate-900 dark:text-ink">{stations.length}</p>
            </div>
            {Object.entries(STATUS_BADGE).map(([key, b]) => (
              <div key={key}>
                <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-ink-faint">{b.label}</p>
                <p className="font-display text-xl font-semibold text-slate-900 dark:text-ink">
                  {stations.filter((s) => s.operational_status === key).length}
                </p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 dark:text-ink-faint">State</label>
              <select value={stateFilter} onChange={(e) => setStateFilter(e.target.value)} className={inputShell}>
                <option value="all">All states</option>
                {stateOptions.map((st) => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 dark:text-ink-faint">Status</label>
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={inputShell}>
                <option value="all">All statuses</option>
                <option value="Open">Open</option>
                <option value="Closed">Closed</option>
                <option value="Maintenance">Maintenance</option>
              </select>
            </div>
            <p className="text-xs text-slate-500 dark:text-ink-faint">
              {filtered.length} of {stations.length} stations
            </p>
          </div>

          <DataTable
            columns={columns}
            data={filtered}
            rowKey={(s) => String(s.id)}
            searchPlaceholder="Search station, company, city, state…"
            globalFilter={(s, q) =>
              [s.name, s.company_name, s.city_name, s.state, s.zip, s.operational_status, s.opening_hours]
                .join(" ").toLowerCase().includes(q)
            }
            emptyMessage="No stations match the selected filters."
          />
        </>
      )}
    </div>
  );
}
