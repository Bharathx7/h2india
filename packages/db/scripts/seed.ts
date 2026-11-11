import { createDb } from "../src/client";

// Seed data for local development and staging: roles and permissions arrive with step 3.4,
// categories with Stage 4. Every seed is idempotent (safe to run twice).
const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");
const { pool } = createDb(url, { max: 1 });
await pool.query("SELECT 1");
await pool.end();
console.log("seed: nothing to seed yet");
