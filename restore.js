require("dotenv").config();
// ============================================================
//  restore.js — Restore Backup to a New Atlas Cluster
//  Temflo Systems | MongoDB Backup Strategy | June 2026
require("dotenv").config();
// ============================================================
//
//  What this does:
//    Restores a full BSON backup (created by backup-full.js)
//    to a completely separate MongoDB Atlas cluster to simulate
//    disaster recovery.
//
//  Before running:
//    1. Set MONGO_RESTORE_URI in your .env file
//       (connection string of the NEW/target cluster)
//    2. Update BACKUP_FOLDER below to point to the correct
//       timestamped folder inside /backups/
//
//  How to run:
//    node restore.js
require("dotenv").config();
// ============================================================

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");

const NEW_CONNECTION_STRING = process.env.MONGO_RESTORE_URI;
const DB_NAME = "testDB";

// Update this to the backup folder you want to restore from
const BACKUP_FOLDER = "full_2026-06-25_16-18-01";
const BACKUP_PATH = path.join(__dirname, "backups", BACKUP_FOLDER);

if (!NEW_CONNECTION_STRING) {
  console.error("[ERROR] MONGO_RESTORE_URI not set. Add it to your .env file.");
  process.exit(1);
}

if (!fs.existsSync(BACKUP_PATH)) {
  console.error("[ERROR] Backup folder not found:", BACKUP_PATH);
  process.exit(1);
}

const command = `mongorestore --uri="${NEW_CONNECTION_STRING}" --db=${DB_NAME} --ssl --tlsInsecure "${BACKUP_PATH}/${DB_NAME}"`;

console.log("[INFO] Starting restore to new cluster...");
console.log("[INFO] Source backup:", BACKUP_PATH);

try {
  execSync(command, { stdio: "inherit" });
  console.log("\n[SUCCESS] Restore completed!");
  console.log("[INFO] Verify on Atlas dashboard: new cluster should now contain testDB.students");
} catch (err) {
  console.error("[ERROR] mongorestore failed:", err.message);
  process.exit(1);
}
