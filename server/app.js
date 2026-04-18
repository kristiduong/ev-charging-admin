// server/app.js — Express app factory.
// Exports the configured Express `app` (no .listen()) so the same code runs:
//   - locally via server/index.js -> app.listen()
//   - on Vercel via api/index.js  -> exported as a serverless function
import express from "express";
import cors    from "cors";
import dotenv  from "dotenv";

import { pingDatabase } from "./db.js";

import dashboardRouter   from "./routes/dashboard.js";
import stationsRouter    from "./routes/stations.js";
import chargersRouter    from "./routes/chargers.js";
import usersRouter       from "./routes/users.js";
import sessionsRouter    from "./routes/sessions.js";
import paymentsRouter    from "./routes/payments.js";
import maintenanceRouter from "./routes/maintenance.js";

dotenv.config();

export const app = express();

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/dashboard",   dashboardRouter);
app.use("/api/stations",    stationsRouter);
app.use("/api/chargers",    chargersRouter);
app.use("/api/users",       usersRouter);
app.use("/api/sessions",    sessionsRouter);
app.use("/api/payments",    paymentsRouter);
app.use("/api/maintenance", maintenanceRouter);

// ── Health check ────────────────────────────────────────────────────────────
app.get("/api/health", async (_req, res) => {
  try {
    const db = await pingDatabase();
    res.json({ status: "ok", db });
  } catch (err) {
    res.status(500).json({ status: "error", error: err.message });
  }
});

// ── Centralized error handler ───────────────────────────────────────────────
// Every route `catch`es with `next(err)` and lands here. We surface the real
// MySQL error code/message to the browser so the user sees what's wrong
// instead of a generic "Failed to fetch …".
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error("[api error]", err);
  res.status(500).json({
    error: err.sqlMessage || err.message || "Internal server error",
    code:  err.code,
  });
});

export default app;
