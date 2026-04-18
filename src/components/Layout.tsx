import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  CreditCard,
  Home,
  Map,
  Menu,
  Moon,
  PlugZap,
  Sun,
  Users,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { cn, inputShell } from "../lib/cn";

type NavItem = {
  to: string;
  label: string;
  end?: boolean;
  Icon: React.ComponentType<{ className?: string }>;
};

const nav: NavItem[] = [
  { to: "/", label: "Dashboard", end: true, Icon: Home },
  { to: "/stations", label: "Stations", Icon: Map },
  { to: "/chargers", label: "Chargers", Icon: PlugZap },
  { to: "/users", label: "Users", Icon: Users },
  { to: "/sessions", label: "Sessions", Icon: Zap },
  { to: "/payments", label: "Payments", Icon: CreditCard },
  { to: "/maintenance", label: "Maintenance", Icon: Wrench },
];

const PAGE_TITLE_BY_PATH: Record<string, string> = {
  "/": "Dashboard",
  "/stations": "Stations",
  "/chargers": "Chargers",
  "/users": "Users",
  "/sessions": "Charging sessions",
  "/payments": "Payments",
  "/maintenance": "Maintenance log",
};

function usePageTitle() {
  const { pathname } = useLocation();
  return PAGE_TITLE_BY_PATH[pathname] ?? "Dashboard";
}

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const pageTitle = usePageTitle();

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
      isActive
        ? "bg-emerald-500/15 text-emerald-700 ring-1 ring-emerald-500/25 dark:text-accent-glow dark:ring-accent/25"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-ink-muted dark:hover:bg-white/5 dark:hover:text-ink"
    );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-surface dark:text-ink">
      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-200 bg-white shadow-lg transition-transform dark:border-white/5 dark:bg-surface-raised dark:shadow-none md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-14 items-center justify-between gap-2 border-b border-slate-200 px-4 dark:border-white/5 md:h-16 md:px-5">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/15 ring-1 ring-emerald-500/30 dark:bg-accent/15 dark:ring-accent/30">
              <Zap className="h-5 w-5 text-emerald-600 dark:text-accent-glow" aria-hidden />
            </div>
            <div className="min-w-0">
              <p className="truncate font-display text-sm font-semibold text-slate-900 dark:text-ink">
                ChargeOps
              </p>
              <p className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-ink-faint">
                Operations
              </p>
            </div>
          </div>
          <button
            type="button"
            className={cn(inputShell, "p-2 md:hidden")}
            onClick={() => setMobileOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3">
          {nav.map(({ to, label, end, Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={linkClass}
              onClick={() => setMobileOpen(false)}
            >
              <Icon className="h-5 w-5 shrink-0 opacity-80" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-slate-200 p-4 dark:border-white/5">
          <p className="text-xs text-slate-500 dark:text-ink-faint">Database: EV (MySQL)</p>
          <p className="mt-1 text-[11px] text-slate-400 dark:text-ink-faint/80">
            Live data via Express API.
          </p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col md:pl-64">
        <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-3 py-3 backdrop-blur-md dark:border-white/5 dark:bg-surface-raised/90 sm:px-5">
          <button
            type="button"
            className={cn(inputShell, "p-2 md:hidden")}
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-ink-faint sm:text-[11px]">
              EV Charging Management System
            </p>
            <h1 className="truncate text-base font-semibold text-slate-900 dark:text-ink sm:text-lg">
              {pageTitle}
            </h1>
          </div>

          <button
            type="button"
            onClick={toggleTheme}
            className={cn(inputShell, "p-2.5")}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5 text-amber-400" />
            ) : (
              <Moon className="h-5 w-5 text-slate-700" />
            )}
          </button>
        </header>

        <main className="flex-1 px-3 py-5 sm:px-5 sm:py-6 lg:px-8 lg:py-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
