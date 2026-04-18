// server/db.js — MySQL connection pool
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

export const dbConfig = {
  host:     process.env.DB_HOST     || "localhost",
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASS     || "",
  database: process.env.DB_NAME     || "ev",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

export const pool = mysql.createPool(dbConfig);

/**
 * Quick smoke-test that the pool can talk to MySQL and the target DB exists.
 * Run at server boot so credential / db-name mistakes fail loudly instead of
 * silently breaking every API call.
 */
export async function pingDatabase() {
  const conn = await pool.getConnection();
  try {
    await conn.query("SELECT 1");
    const [[row]] = await conn.query("SELECT DATABASE() AS db");
    return row.db;
  } finally {
    conn.release();
  }
}
