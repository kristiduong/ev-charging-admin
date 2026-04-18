import { useMemo, useState } from "react";
import { DataTable, type ColumnDef } from "../components/DataTable";
import { PageHeader } from "../components/PageHeader";
import { useApi } from "../hooks/useApi";
import { fetchChargers, type Charger } from "../api/index";
import { cardShell, cn, inputShell } from "../lib/cn";

// ── Badges keyed on Charger_Availability_Status values from MySQL ─────────────
const AVAIL_BADGE: Record<string, { cls: string }> = {
  Available:   { cls: "bg-emerald-500/20 text-emerald-300 ring-emerald-500/40" },
  "In Use":    { cls: "bg-sky-500/20     text-sky-300     ring-sky-500/40"     },
  Unavailable: { cls: "bg-rose-500/20    text-rose-300    ring-rose-500/40"    },
  Maintenance: { cls: "bg-amber-500/20   text-amber-200   ring-amber-500/40"   },
};

function AvailBadge({ status }: { status: string }) {
  const b = AVAIL_BADGE[status] ?? { cls: "bg-slate-500/20 text-slate-300 ring-slate-400/40" };
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1", b.cls)}>
      {status}
    </span>
  );
}

function formatDate(v: string | null | undefined) {
  if (!v) return "—";
  try { return new Date(v).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
  catch { return v; }
}

function Loading() {
  return <div className="flex h-40 items-center justify-center text-sm text-slate-400 dark:text-ink-muted">Loading…</div>;
}
function Err({ msg }: { msg: string }) {
  return <div className="flex h-40 items-center justify-center text-sm text-rose-400">{msg}</div>;
}

export function Chargers() {
  const [filterType,   setFilterType]   = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const { data, loading, error } = useApi(fetchChargers, []);
  const chargers = data ?? [];

  const filtered = useMemo(() => chargers.filter((c) => {
    if (filterType   !== "all" && c.charger_type !== filterType)   return false;
    if (filterStatus !== "all" && c.status       !== filterStatus) return false;
    return true;
  }), [chargers, filterType, filterStatus]);

  // Summary counts from filtered data
  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const c of filtered) {
      map[c.status] = (map[c.status] ?? 0) + 1;
    }
    return map;
  }, [filtered]);

  // Charger types from filtered data
  const typeOptions = useMemo(() => [...new Set(chargers.map((c) => c.charger_type))].sort(), [chargers]);
  const statusOptions = useMemo(() => [...new Set(chargers.map((c) => c.status))].sort(), [chargers]);

  const columns: ColumnDef<Charger>[] = useMemo(() => [
    {
      id: "id", header: "Charger ID", sortable: true,
      getSortValue: (c) => String(c.id),
      cell: (c) => <span className="font-mono text-xs">{c.id}</span>,
    },
    {
      id: "station", header: "Station", sortable: true,
      getSortValue: (c) => c.station_name,
      cell: (c) => <span className="text-slate-600 dark:text-ink-muted">{c.station_name}</span>,
    },
    {
      id: "type", header: "Charger Type", sortable: true,
      getSortValue: (c) => c.charger_type,
      cell: (c) => <span className="text-slate-600 dark:text-ink-muted">{c.charger_type}</span>,
    },
    {
      id: "kw", header: "Power (kW)", sortable: true,
      headerClassName: "text-right", cellClassName: "text-right tabular-nums",
      getSortValue: (c) => Number(c.max_kw),
      cell: (c) => Number(c.max_kw).toFixed(1),
    },
    {
      id: "rate", header: "Rate / kWh", sortable: true,
      headerClassName: "text-right", cellClassName: "text-right tabular-nums",
      getSortValue: (c) => Number(c.rate_per_kwh),
      cell: (c) => `$${Number(c.rate_per_kwh).toFixed(2)}`,
    },
    {
      id: "status", header: "Availability", sortable: true,
      getSortValue: (c) => c.status,
      cell: (c) => <AvailBadge status={c.status} />,
    },
    {
      id: "maint", header: "Last Maintenance", sortable: true,
      getSortValue: (c) => c.last_maintenance_date ?? "",
      cell: (c) => (
        <span className="tabular-nums text-xs text-slate-600 dark:text-ink-muted">
          {formatDate(c.last_maintenance_date)}
        </span>
      ),
    },
  ], []);

  return (
    <div>
      <PageHeader subtitle="Charger fleet from MySQL charger table — power, rate, availability, and maintenance." />

      {loading ? <Loading /> : error ? <Err msg={error} /> : (
        <>
          {/* Summary strip */}
          <div className={cn(cardShell, "mb-6 flex flex-wrap gap-4 px-4 py-3 sm:px-5")}>
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-ink-faint">Total Chargers</p>
              <p className="font-display text-xl font-semibold tabular-nums text-slate-900 dark:text-ink">{filtered.length}</p>
            </div>
            {Object.entries(counts).map(([status, count]) => {
              const b = AVAIL_BADGE[status];
              return (
                <div key={status} className={cn("flex flex-col gap-0.5 rounded-lg px-3 py-2 ring-1",
                  status === "Available"   ? "bg-emerald-500/10 ring-emerald-500/20" :
                  status === "In Use"      ? "bg-sky-500/10     ring-sky-500/20"     :
                  status === "Unavailable" ? "bg-rose-500/10    ring-rose-500/20"    :
                                            "bg-amber-500/10   ring-amber-500/20"
                )}>
                  <span className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-ink-faint">{status}</span>
                  <span className={cn("font-display text-xl font-semibold tabular-nums", b ? b.cls.split(" ")[1] : "text-slate-900 dark:text-ink")}>{count}</span>
                </div>
              );
            })}
          </div>

          {/* Filters */}
          <div className="mb-4 flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 dark:text-ink-faint">Charger Type</label>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} className={inputShell}>
                <option value="all">All types</option>
                {typeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-slate-500 dark:text-ink-faint">Availability</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className={inputShell}>
                <option value="all">All statuses</option>
                {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <p className="text-xs text-slate-500 dark:text-ink-faint">
              {filtered.length} of {chargers.length} chargers
            </p>
          </div>

          <DataTable
            columns={columns}
            data={filtered}
            rowKey={(c) => String(c.id)}
            searchPlaceholder="Search charger, station, type, status…"
            globalFilter={(c, q) =>
              [String(c.id), c.station_name, c.charger_type, c.status, formatDate(c.last_maintenance_date)]
                .join(" ").toLowerCase().includes(q)
            }
            emptyMessage="No chargers match the selected filters."
          />
        </>
      )}
    </div>
  );
}
