// server/routes/dashboard.js
import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

// GET /api/dashboard/kpis
router.get("/kpis", async (_req, res, next) => {
  try {
    const [[stationRow]] = await pool.query("SELECT COUNT(*) AS total FROM station");
    const [[chargerRow]] = await pool.query("SELECT COUNT(*) AS total FROM charger");
    const [[userRow]]    = await pool.query("SELECT COUNT(*) AS total FROM user");
    const [[planRow]]    = await pool.query("SELECT COUNT(*) AS total FROM membership");

    res.json({
      totalStations: stationRow.total,
      totalChargers: chargerRow.total,
      totalUsers:    userRow.total,
      totalPlans:    planRow.total,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/revenue-by-city
// Uses a case-insensitive status match so rows stored as "completed",
// "COMPLETED", "Complete", etc. still count.
router.get("/revenue-by-city", async (_req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT st.Station_City AS city,
             ROUND(SUM(p.Payment_Amount), 2) AS revenue
      FROM payment p
      JOIN charging_session cs ON cs.Session_ID = p.Session_ID
      JOIN charger c  ON c.Charger_ID  = cs.Charger_ID
      JOIN station st ON st.Station_ID = c.Station_ID
      WHERE LOWER(TRIM(p.Payment_Status)) IN ('completed', 'complete', 'success', 'successful')
      GROUP BY st.Station_City
      HAVING revenue IS NOT NULL AND revenue > 0
      ORDER BY revenue DESC
      LIMIT 8
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/charger-availability
router.get("/charger-availability", async (_req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT Charger_Availability_Status AS status, COUNT(*) AS count
      FROM charger
      GROUP BY Charger_Availability_Status
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/dashboard/recent-sessions?limit=10
router.get("/recent-sessions", async (req, res, next) => {
  const limit = Math.min(Number(req.query.limit) || 10, 50);
  try {
    const [rows] = await pool.query(
      `SELECT cs.Session_ID AS id,
              CONCAT(u.User_FName, ' ', u.User_LName) AS user_name,
              st.Station_Name AS station_name,
              cs.Start_Time  AS started_at,
              cs.End_Time    AS ended_at,
              cs.Energy_Consumed AS kwh,
              cs.Total_Cost      AS cost_usd,
              cs.Session_Status  AS status
       FROM charging_session cs
       JOIN user u     ON u.User_ID      = cs.User_ID
       JOIN charger c  ON c.Charger_ID   = cs.Charger_ID
       JOIN station st ON st.Station_ID  = c.Station_ID
       ORDER BY cs.Start_Time DESC
       LIMIT ?`,
      [limit]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
