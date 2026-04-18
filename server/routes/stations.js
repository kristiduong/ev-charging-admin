// server/routes/stations.js
import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

// GET /api/stations?state=TX&status=open
router.get("/", async (req, res, next) => {
  try {
    const conditions = [];
    const params = [];

    if (req.query.state) {
      conditions.push("s.Station_State = ?");
      params.push(req.query.state);
    }
    if (req.query.status) {
      conditions.push("s.Station_Status = ?");
      params.push(req.query.status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT s.Station_ID       AS id,
              s.Company_ID       AS company_id,
              c.Company_Name     AS company_name,
              s.Station_Name     AS name,
              s.Station_Street   AS address,
              s.Station_City     AS city_name,
              s.Station_State    AS state,
              s.Station_Zip      AS zip,
              s.Station_Slots    AS total_slots,
              s.Station_Status   AS operational_status,
              s.Station_Opening_Hours AS opening_hours
       FROM station s
       JOIN company c ON c.Company_ID = s.Company_ID
       ${where}
       ORDER BY s.Station_Name`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/stations/:id
router.get("/:id", async (req, res, next) => {
  try {
    const [[row]] = await pool.query(
      `SELECT s.*, c.Company_Name AS company_name
       FROM station s
       JOIN company c ON c.Company_ID = s.Company_ID
       WHERE s.Station_ID = ?`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: "Station not found" });
    res.json(row);
  } catch (err) {
    next(err);
  }
});

export default router;
