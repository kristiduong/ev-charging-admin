// server/routes/sessions.js
import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

// GET /api/sessions?days=30&status=Completed
router.get("/", async (req, res, next) => {
  try {
    const conditions = [];
    const params = [];

    const days = Number(req.query.days);
    if (days && days > 0) {
      conditions.push("cs.Start_Time >= DATE_SUB(NOW(), INTERVAL ? DAY)");
      params.push(days);
    }
    if (req.query.status) {
      conditions.push("cs.Session_Status = ?");
      params.push(req.query.status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT cs.Session_ID  AS id,
              cs.User_ID     AS user_id,
              CONCAT(u.User_FName, ' ', u.User_LName) AS user_name,
              c.Station_ID   AS station_id,
              st.Station_Name AS station_name,
              cs.Charger_ID  AS charger_id,
              cs.Start_Time  AS started_at,
              cs.End_Time    AS ended_at,
              cs.Energy_Consumed AS kwh,
              cs.Total_Cost      AS cost_usd,
              cs.Session_Status  AS status
       FROM charging_session cs
       JOIN user u     ON u.User_ID     = cs.User_ID
       JOIN charger c  ON c.Charger_ID  = cs.Charger_ID
       JOIN station st ON st.Station_ID = c.Station_ID
       ${where}
       ORDER BY cs.Start_Time DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/sessions/count-by-day?days=30
router.get("/count-by-day", async (req, res, next) => {
  const days = Math.min(Number(req.query.days) || 30, 365);
  try {
    const [rows] = await pool.query(
      `SELECT DATE(Start_Time) AS date, COUNT(*) AS count
       FROM charging_session
       WHERE Start_Time >= DATE_SUB(NOW(), INTERVAL ? DAY)
       GROUP BY DATE(Start_Time)
       ORDER BY date ASC`,
      [days]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
