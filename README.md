# EV Charging Station Admin

A relational database system and full-stack admin dashboard for managing an Electric Vehicle (EV) charging station network.

The project designs a structured, scalable database that simulates a real-world EV charging platform — customers charge their vehicles and pay based on usage or membership plans, while operators monitor infrastructure, sessions, payments, and maintenance in one place.

## Project goals

- **Design a practical relational schema** for a real-world EV charging network.
- **Encode business rules directly in the database**, using a schema in Third Normal Form (3NF) with surrogate primary keys and non-identifying relationships to keep the model scalable and free of update anomalies.
- **Identify entities, keys, and relationships** with explicit cardinality and optionality.
- **Translate business rules into a Crow's Foot ERD** and implement the schema in MySQL.
- **Demonstrate SQL queries of varying complexity** to extract meaningful insights about stations, utilization, revenue, and maintenance.

## Database design

Nine core entities: `station`, `charger`, `user`, `membership`, `subscription`, `charging_session`, `payment`, `maintenance_log`, `company`.

Key design decisions:

- **3NF** with surrogate integer primary keys on every entity.
- **Non-identifying relationships** so child rows are independent of parent keys — easier to evolve the schema without cascading key changes.
- **11 triggers** handle the full lifecycle of subscriptions, charging sessions, payments, and maintenance updates directly in the database, so application code doesn't have to duplicate business logic.
- **16 SQL queries** of increasing complexity, from simple lookups to multi-join aggregate analytics with window functions and CTEs.

### Seed data

Dummy data was generated with OpenClaw against the schema:

| Entity            | Rows   |
| ----------------- | ------ |
| Stations          | 51     |
| Chargers          | 859    |
| Charging sessions | 901    |
| Maintenance logs  | 1,000  |
| Companies         | 6      |

## Tech stack

- **Database** — MySQL 8, schema in 3NF, 11 triggers, 16 demo queries
- **Backend** — Node.js + Express, `mysql2/promise` pool
- **Frontend** — React 18, Vite, TypeScript, Tailwind CSS, Recharts, React Router, React-Leaflet
- **Deployment** — Vercel (serverless function for the API + static SPA)
- **Tooling** — Crow's Foot ERD modeling, OpenClaw (seed data), Cursor (initial frontend scaffolding), Claude Opus 4.7 (backend + Vercel wiring)

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

### 1. Get a cloud MySQL

Vercel doesn't host databases — pick any managed MySQL reachable over the public internet: [PlanetScale](https://planetscale.com), [Railway](https://railway.app), [Aiven](https://aiven.io), AWS RDS, Google Cloud SQL, or Azure Database. Import your schema + seed data and note the connection details.

### 2. Push this repo to GitHub

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

On [vercel.com](https://vercel.com) → **Add New → Project** → import the repo. Vercel auto-detects Vite; `vercel.json` handles the build and routing. Under **Environment Variables**, add:

| Name      | Example                     | Notes                          |
| --------- | --------------------------- | ------------------------------ |
| `DB_HOST` | `aws.connect.psdb.cloud`    | from your MySQL provider       |
| `DB_PORT` | `3306`                      | usually 3306                   |
| `DB_USER` | `xxxxxxxxxxxx`              | MySQL username                 |
| `DB_PASS` | `pscale_pw_xxxxx`           | MySQL password                 |
| `DB_NAME` | `ev`                        | database name                  |

Deploy. Vercel will run `npm install` and `npm run build`, package `api/index.js` as a serverless function handling every `/api/*` request, and serve `dist/` as a static SPA.

After deploy, visit `https://<your-app>.vercel.app/api/health` — if it returns `{"status":"ok","db":"ev"}`, you're live.

## Project layout

```
.
├── api/
│   └── index.js          ← Vercel serverless entry (exports the Express app)
├── server/
│   ├── app.js            ← Express app factory (shared local + Vercel)
│   ├── db.js             ← MySQL pool
│   ├── index.js          ← local-dev entry (app.listen on 4000)
│   └── routes/           ← dashboard, stations, chargers, users, sessions, payments, maintenance
├── src/                  ← React pages, components, API client
├── vercel.json           ← Vercel routing + build config
├── vite.config.ts        ← dev proxy /api → http://localhost:4000
└── package.json          ← single set of deps for frontend + backend
```

## Troubleshooting

- **`ER_ACCESS_DENIED_ERROR` / `ER_BAD_DB_ERROR`** — credentials wrong. Fix `server/.env` locally, or Vercel env vars in prod.
- **`Failed to fetch` in dev** — Express isn't running. Use `npm run dev:all`.
- **UI loads, tables empty** — the `ev` database has no rows. Load your seed SQL.
- **`/api/health` returns 500 on Vercel** — cloud MySQL isn't reachable, or env vars are missing. Check Function Logs in the Vercel dashboard.
- **Sanity-check without the UI** — `curl https://<your-app>.vercel.app/api/health`.

## How the frontend finds the API

1. React pages call typed functions in `src/api/index.ts` (e.g. `fetchStations()`).
2. Those call `apiFetch()` in `src/api/client.ts`, which hits `VITE_API_URL` — defaulted to `/api`.
3. In dev, Vite's proxy (`vite.config.ts`) forwards `/api/*` to `http://localhost:4000`.
4. In prod, Vercel's rewrite sends `/api/*` to the serverless function in `api/index.js` — the same Express app.

## License

[MIT](./LICENSE)
