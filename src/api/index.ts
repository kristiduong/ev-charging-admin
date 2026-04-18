// src/api/index.ts — typed API calls matching EV MySQL schema
import { apiFetch } from "./client";

// ── Dashboard ────────────────────────────────────────────────────────────────

export interface DashboardKpis {
  totalStations: number;
  totalChargers: number;
  totalUsers:    number;
  totalPlans:    number;
}

export interface RevenueByCity {
  city:    string;
  revenue: number;
}

export interface ChargerAvailabilityRow {
  status: string;
  count:  number;
}

export interface RecentSession {
  id:           string;
  user_name:    string;
  station_name: string;
  started_at:   string;
  ended_at:     string | null;
  kwh:          number;
  cost_usd:     number;
  status:       string;
}

// ── Stations ─────────────────────────────────────────────────────────────────

export interface Station {
  id:                 string;
  company_id:         string;
  company_name:       string;
  name:               string;
  address:            string;
  city_name:          string;
  state:              string;
  zip:                string;
  total_slots:        number;
  operational_status: string;
  opening_hours:      string;
}

// ── Chargers ─────────────────────────────────────────────────────────────────

export interface Charger {
  id:                    string;
  station_id:            string;
  station_name:          string;
  charger_type:          string;
  max_kw:                number;
  rate_per_kwh:          number;
  status:                string;
  last_maintenance_date: string | null;
}

// ── Users ─────────────────────────────────────────────────────────────────────

export interface User {
  id:                  string;
  name:                string;
  email:               string;
  phone:               string;
  vehicle_brand:       string;
  vehicle_model:       string;
  subscription_id:     string | null;
  plan_tier:           string | null;
  started:             string | null;
  renews:              string | null;
  subscription_status: string | null;
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export interface ChargingSession {
  id:           string;
  user_id:      string;
  user_name:    string;
  station_id:   string;
  station_name: string;
  charger_id:   string;
  started_at:   string;
  ended_at:     string | null;
  kwh:          number;
  cost_usd:     number;
  status:       string;
}

export interface SessionCountByDay {
  date:  string;
  count: number;
}

// ── Payments ──────────────────────────────────────────────────────────────────

export interface Payment {
  id:         string;
  user_id:    string;
  user_name:  string;
  type:       string;
  method:     string;
  amount:     number;
  status:     string;
  session_id: string | null;
  created_at: string;
}

export interface RevenueByMonth {
  month:   string;
  revenue: number;
}

export interface PaymentTypeBreakdown {
  type:  string;
  count: number;
  total: number;
}

// ── Maintenance ───────────────────────────────────────────────────────────────

export interface MaintenanceLog {
  id:            string;
  station_id:    string;
  station_name:  string;
  charger_id:    string | null;
  issue_type:    string;
  status:        string;
  resolved_time: string | null;
  technician_id: string | null;
}

export interface MaintenanceSummaryRow {
  issue_type: string;
  status:     string;
  count:      number;
}

// ── API functions ─────────────────────────────────────────────────────────────

export const fetchDashboardKpis       = () => apiFetch<DashboardKpis>("/dashboard/kpis");
export const fetchRevenueByCity       = () => apiFetch<RevenueByCity[]>("/dashboard/revenue-by-city");
export const fetchChargerAvailability = () => apiFetch<ChargerAvailabilityRow[]>("/dashboard/charger-availability");
export const fetchRecentSessions      = (limit = 10) => apiFetch<RecentSession[]>("/dashboard/recent-sessions", { limit });

export const fetchStations = (filters?: { state?: string; status?: string }) =>
  apiFetch<Station[]>("/stations", filters);
export const fetchStation  = (id: string) => apiFetch<Station>(`/stations/${id}`);

export const fetchChargers = (filters?: { stationId?: string; type?: string; status?: string }) =>
  apiFetch<Charger[]>("/chargers", filters);
export const fetchCharger  = (id: string) => apiFetch<Charger>(`/chargers/${id}`);

export const fetchUsers = (filters?: { plan?: string; subStatus?: string }) =>
  apiFetch<User[]>("/users", filters);
export const fetchUser  = (id: string) => apiFetch<User>(`/users/${id}`);

export const fetchSessions          = (filters?: { days?: number; status?: string }) =>
  apiFetch<ChargingSession[]>("/sessions", filters);
export const fetchSessionCountByDay = (days = 30) =>
  apiFetch<SessionCountByDay[]>("/sessions/count-by-day", { days });

export const fetchPayments             = (filters?: { type?: string; status?: string }) =>
  apiFetch<Payment[]>("/payments", filters);
export const fetchRevenueByMonth       = () => apiFetch<RevenueByMonth[]>("/payments/revenue-by-month");
export const fetchPaymentTypeBreakdown = () => apiFetch<PaymentTypeBreakdown[]>("/payments/type-breakdown");

export const fetchMaintenanceLogs    = (filters?: { status?: string; issueType?: string }) =>
  apiFetch<MaintenanceLog[]>("/maintenance", filters);
export const fetchMaintenanceSummary = () => apiFetch<MaintenanceSummaryRow[]>("/maintenance/summary");
