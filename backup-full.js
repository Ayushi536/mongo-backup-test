require("dotenv").config();
// ============================================================
//  backup-full.js — Full Database Backup using mongodump
//  Temflo Systems | MongoDB Backup Strategy | June 2026
require("dotenv").config();
// ============================================================
//
//  What this does:
//    Takes a complete snapshot of testDB and saves it as BSON
//    files inside a timestamped folder under /backups/
//
//  How to run:
//    node backup-full.js
require("dotenv").config();
// ============================================================

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

// Load connection string from environment variable (set in .env)
const CONNECTION_STRING = process.env.MONGO_URI;
const DB_NAME = "testDB";

if (!CONNECTION_STRING) {
  console.error("[ERROR] MONGO_URI not set. Add it to your .env file.");
  process.exit(1);
}

const timestamp = new Date()
  .toISOString()
  .replace(/T/, "_")
  .replace(/:/g, "-")
  .slice(0, 19);

const OUTPUT_DIR = path.join(__dirname, "backups", `full_${timestamp}`);

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const command = `mongodump --uri="${CONNECTION_STRING}" --db=${DB_NAME} --out="${OUTPUT_DIR}" --ssl --tlsInsecure`;

console.log("[INFO] Starting full backup of", DB_NAME);
console.log("[INFO] Output:", OUTPUT_DIR);

try {
  execSync(command, { stdio: "inherit" });
  console.log("\n[SUCCESS] Backup completed!");

  const files = fs.readdirSync(path.join(OUTPUT_DIR, DB_NAME));
  console.log("[INFO] Files backed up:", files.join(", "));
} catch (err) {
  console.error("[ERROR] mongodump failed:", err.message);
  process.exit(1);
}
