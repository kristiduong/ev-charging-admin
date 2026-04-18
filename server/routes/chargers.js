// server/routes/chargers.js
import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

// GET /api/chargers?stationId=&type=dc_fast&status=available
router.get("/", async (req, res, next) => {
  try {
    const conditions = [];
    const params = [];

    if (req.query.stationId) {
      conditions.push("c.Station_ID = ?");
      params.push(req.query.stationId);
    }
    if (req.query.type) {
      conditions.push("c.Charger_Type = ?");
      params.push(req.query.type);
    }
    if (req.query.status) {
      conditions.push("c.Charger_Availability_Status = ?");
      params.push(req.query.status);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT c.Charger_ID               AS id,
              c.Station_ID               AS station_id,
              s.Station_Name             AS station_name,
              c.Charger_Type             AS charger_type,
              c.Charger_Power_Capacity   AS max_kw,
              c.Charging_Rate_Per_kWh    AS rate_per_kwh,
              c.Charger_Availability_Status AS status,
              c.Last_Maintenance_Date    AS last_maintenance_date
       FROM charger c
       JOIN station s ON s.Station_ID = c.Station_ID
       ${where}
       ORDER BY s.Station_Name, c.Charger_ID`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/chargers/:id
router.get("/:id", async (req, res, next) => {
  try {
    const [[row]] = await pool.query(
      `SELECT c.*, s.Station_Name AS station_name
       FROM charger c
       JOIN station s ON s.Station_ID = c.Station_ID
       WHERE c.Charger_ID = ?`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: "Charger not found" });
    res.json(row);
  } catch (err) {
    next(err);
  }
});

export default router;
