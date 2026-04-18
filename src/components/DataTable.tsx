import { useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowDownUp,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Search,
} from "lucide-react";
import { cn, inputShell } from "../lib/cn";

export type SortDir = "asc" | "desc" | null;

export type ColumnDef<T> = {
  id: string;
  header: string;
  sortable?: boolean;
  headerClassName?: string;
  cellClassName?: string;
  cell: (row: T) => React.ReactNode;
  getSortValue?: (row: T) => string | number | null | undefined;
};

type Props<T> = {
  columns: ColumnDef<T>[];
  data: T[];
  rowKey: (row: T) => string;
  searchPlaceholder?: string;
  /** Filter rows by search query (lowercase, trimmed) */
  globalFilter?: (row: T, queryLower: string) => boolean;
  defaultPageSize?: number;
  pageSizeOptions?: number[];
  emptyMessage?: string;
  onRowClick?: (row: T) => void;
  getRowClassName?: (row: T) => string;
  /** Optional title row above toolbar */
  title?: string;
  description?: string;
};

function defaultGlobalFilter<T extends object>(row: T, q: string): boolean {
  return Object.values(row).some((v) =>
    String(v ?? "")
      .toLowerCase()
      .includes(q)
  );
}

export function DataTable<T extends object>({
  columns,
  data,
  rowKey,
  searchPlaceholder = "Search…",
  globalFilter = defaultGlobalFilter,
  defaultPageSize = 10,
  pageSizeOptions = [5, 10, 25, 50],
  emptyMessage = "No rows to display.",
  onRowClick,
  getRowClassName,
  title,
  description,
}: Props<T>) {
  const [query, setQuery] = useState("");
  const [sortColumnId, setSortColumnId] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return data;
    return data.filter((row) => globalFilter(row, q));
  }, [data, q, globalFilter]);

  const sorted = useMemo(() => {
    if (!sortColumnId || !sortDir) return filtered;
    const col = columns.find((c) => c.id === sortColumnId);
    if (!col?.getSortValue) return filtered;
    return [...filtered].sort((a, b) => {
      const va = col.getSortValue!(a);
      const vb = col.getSortValue!(b);
      const na = va === null || va === undefined ? "" : va;
      const nb = vb === null || vb === undefined ? "" : vb;
      if (typeof na === "number" && typeof nb === "number") {
        return sortDir === "asc" ? na - nb : nb - na;
      }
      const sa = String(na).toLowerCase();
      const sb = String(nb).toLowerCase();
      const cmp = sa.localeCompare(sb, undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortColumnId, sortDir, columns]);

  const total = sorted.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);

  const safePage = totalPages === 0 ? 0 : Math.min(page, totalPages - 1);
  const pageSlice = useMemo(() => {
    if (totalPages === 0) return [];
    const start = safePage * pageSize;
    return sorted.slice(start, start + pageSize);
  }, [sorted, safePage, pageSize, totalPages]);

  const startIdx = total === 0 ? 0 : safePage * pageSize + 1;
  const endIdx = Math.min(total, safePage * pageSize + pageSlice.length);

  const onHeaderClick = (col: ColumnDef<T>) => {
    if (!col.sortable || !col.getSortValue) return;
    if (sortColumnId === col.id) {
      if (sortDir === "asc") setSortDir("desc");
      else if (sortDir === "desc") {
        setSortDir(null);
        setSortColumnId(null);
      } else setSortDir("asc");
    } else {
      setSortColumnId(col.id);
      setSortDir("asc");
    }
    setPage(0);
  };

  const SortIcon = ({ col }: { col: ColumnDef<T> }) => {
    if (!col.sortable) return null;
    if (sortColumnId !== col.id)
      return <ArrowDownUp className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />;
    if (sortDir === "asc")
      return (
        <ArrowUp className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-accent-glow" aria-hidden />
      );
    if (sortDir === "desc")
      return (
        <ArrowDown className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-accent-glow" aria-hidden />
      );
    return <ArrowDownUp className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden />;
  };

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-white/5 dark:bg-surface-raised/80 dark:shadow-card"
      )}
    >
      {(title || description) && (
        <div className="border-b border-slate-200 px-4 py-3 dark:border-white/5 sm:px-5">
          {title ? (
            <h2 className="font-display text-sm font-semibold text-slate-900 dark:text-ink">
              {title}
            </h2>
          ) : null}
          {description ? (
            <p className="mt-0.5 text-xs text-slate-600 dark:text-ink-muted">{description}</p>
          ) : null}
        </div>
      )}

      <div className="flex flex-col gap-3 border-b border-slate-200 p-3 dark:border-white/5 sm:flex-row sm:items-center sm:justify-between sm:px-4 sm:py-3">
        <div className="relative max-w-md flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-ink-faint"
            aria-hidden
          />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
            placeholder={searchPlaceholder}
            className={cn(inputShell, "w-full pl-9")}
            aria-label="Search table"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 dark:border-white/5 dark:text-ink-faint">
              {columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className={cn(
                    "px-3 py-3 font-medium sm:px-4",
                    col.sortable && col.getSortValue && "cursor-pointer select-none hover:text-slate-800 dark:hover:text-ink",
                    col.headerClassName
                  )}
                  onClick={() => onHeaderClick(col)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onHeaderClick(col);
                    }
                  }}
                  tabIndex={col.sortable && col.getSortValue ? 0 : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    <SortIcon col={col} />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-white/5">
            {pageSlice.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-slate-600 dark:text-ink-muted"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              pageSlice.map((row) => (
                <tr
                  key={rowKey(row)}
                  className={cn(
                    "hover:bg-slate-50 dark:hover:bg-white/[0.02]",
                    onRowClick && "cursor-pointer",
                    getRowClassName?.(row)
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((col) => (
                    <td key={col.id} className={cn("px-3 py-3 sm:px-4", col.cellClassName)}>
                      {col.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 border-t border-slate-200 px-3 py-3 dark:border-white/5 sm:flex-row sm:items-center sm:justify-between sm:px-4">
        <p className="text-xs text-slate-600 dark:text-ink-muted">
          {total === 0
            ? "0 results"
            : `Showing ${startIdx}–${endIdx} of ${total}`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-ink-muted">
            Rows
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(0);
              }}
              className={cn(inputShell, "py-1.5")}
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className={cn(
                inputShell,
                "p-2 disabled:opacity-40"
              )}
              disabled={safePage <= 0 || totalPages === 0}
              onClick={() => setPage(Math.max(0, safePage - 1))}
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="min-w-[5.5rem] text-center text-xs text-slate-600 dark:text-ink-muted">
              {totalPages > 0 ? `${safePage + 1} / ${totalPages}` : "—"}
            </span>
            <button
              type="button"
              className={cn(inputShell, "p-2 disabled:opacity-40")}
              disabled={totalPages === 0 || safePage >= totalPages - 1}
              onClick={() => setPage(Math.min(totalPages - 1, safePage + 1))}
              aria-label="Next page"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
