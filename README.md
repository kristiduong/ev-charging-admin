# EV Charging Station Admin

A relational database system and full-stack admin dashboard for managing an Electric Vehicle (EV) charging station network. Designed as a coursework project and deployed end-to-end from schema to UI.

> 🔗 **Live demo:** https://ev-charging-management-systems-fina-tau.vercel.app/

The platform simulates a real-world EV charging service: customers charge their vehicles and pay by usage or membership, while operators monitor stations, chargers, sessions, payments, and maintenance — all from a single dashboard backed by a normalized MySQL database.

## Highlights

- **Normalized MySQL schema in 3NF** with surrogate keys and non-identifying relationships — scalable, free of update anomalies.
- **11 triggers** encode the business logic directly in the database, covering the full lifecycle of subscriptions, sessions, payments, and maintenance.
- **16 analytical SQL queries** demonstrating techniques from simple lookups through multi-join aggregates with window functions and CTEs.
- **Seeded with 2,800+ rows** of realistic dummy data across 9 entities.
- **Full-stack deployment** on Vercel — React/Vite frontend + Express API (as a serverless function) + managed cloud MySQL.

## Project goals

- Design a practical relational schema for a real-world EV charging network.
- Encode business rules directly in the database using 3NF, surrogate primary keys, and non-identifying relationships to keep the model scalable and free of update anomalies.
- Identify entities, keys, and relationships with explicit cardinality and optionality.
- Translate business rules into a Crow's Foot ERD and implement the schema in MySQL.
- Demonstrate SQL queries of varying complexity to extract meaningful operational insight about stations, utilization, revenue, and maintenance.

## Database design

Nine core entities: `station`, `charger`, `user`, `membership`, `subscription`, `charging_session`, `payment`, `maintenance_log`, `company`.

Key design decisions:

- **3NF** with surrogate integer primary keys on every entity.
- **Non-identifying relationships** so child rows are independent of parent keys — easier to evolve the schema without cascading key changes.
- **11 triggers** handle subscription, session, payment, and maintenance lifecycles directly in the database, so application code doesn't have to duplicate business logic.
- **16 SQL queries** organized by complexity, from simple lookups to multi-join aggregate analytics with window functions and CTEs.

### Seed data

Dummy data was generated with OpenClaw against the schema:

| Entity            | Rows   |
| ----------------- | ------ |
| Stations          | 51     |
| Chargers          | 859    |
| Charging sessions | 901    |
| Maintenance logs  | 1,000  |
| Companies         | 6      |

## Features

- **Dashboard** — KPIs, revenue-by-city, charger availability, and recent-session activity
- **Stations** — searchable list with map view, per-station metadata and charger counts
- **Chargers** — status, power rating, and maintenance history
- **Users** — customer directory with plan-tier and subscription-status filters
- **Sessions** — every charging session with start/end, energy delivered, cost
- **Payments** — revenue, successful / failed / pending breakdowns, monthly trend chart
- **Maintenance** — work-order log with issue-type analytics

## Tech stack

- **Database** — MySQL 8 (managed on Aiven in production; local MySQL for development)
- **Backend** — Node.js + Express, `mysql2/promise` connection pool, SSL for managed hosts
- **Frontend** — React 18, TypeScript, Vite, Tailwind CSS, Recharts, React Router, React-Leaflet
- **Deployment** — Vercel (Express served as a serverless function, React bundle served as a static SPA)
- **Tooling** — Crow's Foot ERD modeling, OpenClaw (seed data), Cursor (initial frontend scaffolding), Claude (backend integration and deployment)

## Architecture

```
┌──────────────┐    /api/*     ┌──────────────────┐   mysql2    ┌──────────────┐
│ Vite (5173)  │ ───proxy────▶ │ Express (4000)   │ ──────────▶ │ MySQL        │
│  React UI    │               │  dev: server/*   │             │  database=ev │
└──────────────┘               │  prod: api/*.js  │             └──────────────┘
                               │  (Vercel λ)      │
                               └──────────────────┘
```

The same Express app runs locally on port 4000 and as a Vercel serverless function in production — no duplicated routing code.

## Local development

### 1. Prerequisites

- Node.js 18+
- A running local MySQL instance with the `ev` database created and seeded.

### 2. Configure environment

```bash
cp .env.example .env                       # frontend — VITE_API_URL=/api
cp server/.env.example server/.env         # backend  — fill in your MySQL password
```

### 3. Install & run

```bash
npm install          # installs frontend + backend deps together
npm run dev:all      # runs Express (:4000) + Vite (:5173) concurrently
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies `/api/*` to Express, so there are no CORS issues.

Health check: [http://localhost:4000/api/health](http://localhost:4000/api/health) should return `{"status":"ok","db":"ev"}`.

## Deploy to Vercel

### 1. Provision a cloud MySQL

Vercel doesn't host databases — pick any managed MySQL reachable over the public internet: [Aiven](https://aiven.io), [Railway](https://railway.app), AWS RDS, Google Cloud SQL, or Azure Database. Import your schema + seed data and note the connection details.

### 2. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/ev-charging-admin.git
git push -u origin main
```

Secrets never ship to GitHub — both `.env` and `server/.env` are gitignored.

### 3. Import into Vercel

On [vercel.com](https://vercel.com) → **Add New → Project** → import the repo. Vercel auto-detects Vite; `vercel.json` handles routing. Under **Environment Variables**, add:

| Name      | Example                                       | Notes                          |
| --------- | --------------------------------------------- | ------------------------------ |
| `DB_HOST` | `mysql-xxx.aivencloud.com`                    | from your MySQL provider       |
| `DB_PORT` | `13674`                                       | the port your provider gave you |
| `DB_USER` | `avnadmin`                                    | MySQL username                 |
| `DB_PASS` | `••••••••`                                    | MySQL password                 |
| `DB_NAME` | `defaultdb`                                   | database name                  |
| `DB_SSL`  | `true`                                        | required for managed hosts     |

Deploy. Vercel will run `npm install` and `npm run build`, package `api/index.js` as a serverless function handling every `/api/*` request, and serve `dist/` as a static SPA.

After deploy, visit `https://<your-app>.vercel.app/api/health` — if it returns `{"status":"ok","db":"..."}`, you're live.

## Project layout

```
.
├── api/
│   └── index.js          ← Vercel serverless entry (exports the Express app)
├── server/
│   ├── app.js            ← Express app factory (shared local + Vercel)
│   ├── db.js             ← MySQL pool with optional SSL
│   ├── index.js          ← local-dev entry (app.listen on 4000)
│   └── routes/           ← dashboard, stations, chargers, users, sessions, payments, maintenance
├── src/                  ← React pages, components, API client
├── vercel.json           ← Vercel routing config (SPA + /api rewrites)
├── vite.config.ts        ← dev proxy /api → http://localhost:4000
└── package.json          ← single set of deps for frontend + backend
```

## Troubleshooting

- **`ER_ACCESS_DENIED_ERROR` / `ER_BAD_DB_ERROR`** — credentials wrong. Fix `server/.env` locally, or Vercel env vars in prod.
- **`ECONNREFUSED 127.0.0.1:3306` in prod** — `DB_HOST` isn't set on Vercel; it's falling back to localhost.
- **`ETIMEDOUT` in prod** — your cloud MySQL isn't reachable from Vercel. Allowlist `0.0.0.0/0` in the provider's network settings.
- **`Table '…' doesn't exist`** — MySQL on Linux is case-sensitive. Rename uppercase tables to lowercase: `RENAME TABLE STATION TO station;` (repeat for each table).
- **`Failed to fetch` in dev** — Express isn't running. Use `npm run dev:all`.
- **UI loads, tables empty** — the `ev` database has no rows. Load your seed SQL.
- **Sanity-check without the UI** — `curl https://<your-app>.vercel.app/api/health`.

## How the frontend finds the API

1. React pages call typed functions in `src/api/index.ts` (e.g. `fetchStations()`).
2. Those call `apiFetch()` in `src/api/client.ts`, which hits `VITE_API_URL` — defaulted to `/api`.
3. In dev, Vite's proxy (`vite.config.ts`) forwards `/api/*` to `http://localhost:4000`.
4. In prod, Vercel's rewrite sends `/api/*` to the serverless function in `api/index.js` — the same Express app.

## License

[MIT](./LICENSE)
