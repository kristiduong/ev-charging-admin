// server/routes/payments.js
import { Router } from "express";
import { pool } from "../db.js";

const router = Router();

// Case-insensitive check for "successfully charged" statuses.
const COMPLETED_WHERE =
  "LOWER(TRIM(Payment_Status)) IN ('completed', 'complete', 'success', 'successful')";

// GET /api/payments/revenue-by-month  ← must come BEFORE "/:id" style routes
router.get("/revenue-by-month", async (_req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT DATE_FORMAT(Created_Time, '%Y-%m') AS month,
             ROUND(SUM(Payment_Amount), 2) AS revenue
      FROM payment
      WHERE ${COMPLETED_WHERE}
        AND Created_Time IS NOT NULL
      GROUP BY DATE_FORMAT(Created_Time, '%Y-%m')
      ORDER BY month DESC
      LIMIT 12
    `);
    res.json(rows.reverse());
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/type-breakdown
router.get("/type-breakdown", async (_req, res, next) => {
  try {
    const [rows] = await pool.query(`
      SELECT Payment_Type AS type,
             COUNT(*) AS count,
             ROUND(SUM(Payment_Amount), 2) AS total
      FROM payment
      WHERE ${COMPLETED_WHERE}
      GROUP BY Payment_Type
      HAVING total IS NOT NULL AND total > 0
      ORDER BY total DESC
    `);
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/payments/status-values — diagnostic: shows actual status values
router.get("/status-values", async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      "SELECT DISTINCT Payment_Status FROM payment ORDER BY Payment_Status"
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

// GET /api/payments?type=Charging&status=Completed
router.get("/", async (req, res, next) => {
  try {
    const conditions = [];
    const params = [];

    if (req.query.type)   { conditions.push("p.Payment_Type = ?");   params.push(req.query.type);   }
    if (req.query.status) { conditions.push("p.Payment_Status = ?"); params.push(req.query.status); }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await pool.query(
      `SELECT p.Payment_ID     AS id,
              p.User_ID        AS user_id,
              CONCAT(u.User_FName, ' ', u.User_LName) AS user_name,
              p.Payment_Type   AS type,
              p.Payment_Method AS method,
              p.Payment_Amount AS amount,
              p.Payment_Status AS status,
              p.Session_ID     AS session_id,
              p.Created_Time   AS created_at
       FROM payment p
       LEFT JOIN user u ON u.User_ID = p.User_ID
       ${where}
       ORDER BY p.Created_Time DESC`,
      params
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

export default router;
