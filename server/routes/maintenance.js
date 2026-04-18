// server/routes/maintenance.js
import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

// GET /api/maintenance?status=Open&issueType=hardware
router.get("/", async (req, res, next) => {
  try {
    const conditions = [];
    const params = [];

    if (req.query.status) {
      conditions.push("ml.Status = ?");
      params.push(req.query.status);
    }
    if (req.query.issueType) {
      conditions.push("ml.Issue_Reported = ?");
      params.push(req.query.issueType);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT ml.Maintenance_ID AS id,
              ml.Station_ID     AS station_id,
              s.Station_Name    AS station_name,
              ml.Charger_ID     AS charger_id,
              ml.Issue_Reported AS issue_type,
              ml.Status         AS status,
              ml.Resolved_Time  AS resolved_time,
              ml.Technician_ID  AS technician_id
       FROM maintenance_log ml
       JOIN station s ON s.Station_ID = ml.Station_ID
       ${where}
       ORDER BY ml.Maintenance_ID DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/maintenance/summary
router.get("/summary", async (_req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT Issue_Reported AS issue_type, Status AS status, COUNT(*) AS count
      FROM maintenance_log
      GROUP BY Issue_Reported, Status
      ORDER BY Issue_Reported, Status
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
