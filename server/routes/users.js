// server/routes/users.js
import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

// GET /api/users?plan=Gold&subStatus=active
router.get("/", async (req, res, next) => {
  try {
    const conditions = [];
    const params = [];

    if (req.query.plan) {
      conditions.push("m.Plan_Name = ?");
      params.push(req.query.plan);
    }
    if (req.query.subStatus) {
      conditions.push("sub.Status = ?");
      params.push(req.query.subStatus);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT u.User_ID    AS id,
              CONCAT(u.User_FName, ' ', u.User_LName) AS name,
              u.User_Email AS email,
              u.User_Phone_Num AS phone,
              u.User_Vehicle_Brand AS vehicle_brand,
              u.User_Vehicle_Model AS vehicle_model,
              sub.Subscription_ID  AS subscription_id,
              m.Plan_Name          AS plan_tier,
              sub.Start_Date       AS started,
              sub.End_Date         AS renews,
              sub.Status           AS subscription_status
       FROM user u
       LEFT JOIN subscription sub ON sub.User_ID  = u.User_ID
       LEFT JOIN membership m     ON m.Plan_ID    = sub.Plan_ID
       ${where}
       ORDER BY u.User_FName`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/users/:id
router.get("/:id", async (req, res, next) => {
  try {
    const [[row]] = await pool.query(
      `SELECT u.*,
              m.Plan_Name   AS plan_tier,
              sub.Status    AS subscription_status,
              sub.Start_Date AS started,
              sub.End_Date   AS renews
       FROM user u
       LEFT JOIN subscription sub ON sub.User_ID = u.User_ID
       LEFT JOIN membership m     ON m.Plan_ID   = sub.Plan_ID
       WHERE u.User_ID = ?`,
      [req.params.id]
    );
    if (!row) return res.status(404).json({ error: "User not found" });
    res.json(row);
  } catch (err) {
    next(err);
  }
});

export default router;
