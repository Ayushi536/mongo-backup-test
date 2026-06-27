require("dotenv").config();
// ============================================================
//  pipeline.js — Automated DR Pipeline: Backup → Restore → Verify
//  Temflo Systems | MongoDB Backup Strategy | June 2026
require("dotenv").config();
// ============================================================
//
//  What this does:
//    Step 1 — Takes a full mongodump backup of the source cluster
//    Step 2 — Restores that backup to the target (new) cluster
//    Step 3 — Connects to the target and verifies data is there
//
//  Before running:
//    Set MONGO_URI and MONGO_RESTORE_URI in your .env file
//
//  How to run:
//    node pipeline.js
require("dotenv").config();
// ============================================================

const { execSync } = require("child_process");
const { MongoClient } = require("mongodb");
const path = require("path");
const fs = require("fs");

const SOURCE_CONNECTION_STRING = process.env.MONGO_URI;
const TARGET_CONNECTION_STRING = process.env.MONGO_RESTORE_URI;
const DB_NAME = "testDB";
const COLLECTION_NAME = "students";

if (!SOURCE_CONNECTION_STRING || !TARGET_CONNECTION_STRING) {
  console.error("[ERROR] MONGO_URI and MONGO_RESTORE_URI must both be set in .env");
  process.exit(1);
}

// ── STEP 1: FULL BACKUP ──────────────────────────────────────

function runFullBackup() {
  console.log("\n========================================");
  console.log(" STEP 1: Taking Full Backup (mongodump)");
  console.log("========================================");

  const timestamp = new Date()
    .toISOString()
    .replace(/T/, "_")
    .replace(/:/g, "-")
    .slice(0, 19);

  const backupDir = path.join(__dirname, "backups", `full_${timestamp}`);
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const command = `mongodump --uri="${SOURCE_CONNECTION_STRING}" --db=${DB_NAME} --out="${backupDir}" --ssl --tlsInsecure`;

  console.log("[INFO] Source: backup-test-cluster");
  console.log("[INFO] Output:", backupDir);

  try {
    execSync(command, { stdio: "inherit" });
    const files = fs.readdirSync(path.join(backupDir, DB_NAME));
    console.log("\n[SUCCESS] Backup completed! Files:", files.join(", "));
    return backupDir;
  } catch (err) {
    console.error("[ERROR] mongodump failed:", err.message);
    process.exit(1);
  }
}

// ── STEP 2: RESTORE TO NEW CLUSTER ──────────────────────────

function runRestore(backupDir) {
  console.log("\n==========================================");
  console.log(" STEP 2: Restoring to New Cluster");
  console.log("==========================================");

  const restorePath = path.join(backupDir, DB_NAME);
  if (!fs.existsSync(restorePath)) {
    console.error("[ERROR] Backup folder not found at:", restorePath);
    process.exit(1);
  }

  const command = `mongorestore --uri="${TARGET_CONNECTION_STRING}" --db=${DB_NAME} --ssl --tlsInsecure "${restorePath}"`;

  console.log("[INFO] Target: restore-cluster (new)");
  console.log("[INFO] Restoring from:", restorePath);

  try {
    execSync(command, { stdio: "inherit" });
    console.log("\n[SUCCESS] Restore completed!");
  } catch (err) {
    console.error("[ERROR] mongorestore failed:", err.message);
    process.exit(1);
  }
}

// ── STEP 3: VERIFY DATA ON NEW CLUSTER ──────────────────────

async function runVerification() {
  console.log("\n==========================================");
  console.log(" STEP 3: Verifying Data on New Cluster");
  console.log("==========================================");

  const client = new MongoClient(TARGET_CONNECTION_STRING);

  try {
    await client.connect();
    const collection = client.db(DB_NAME).collection(COLLECTION_NAME);
    const count = await collection.countDocuments();
    const records = await collection.find({}).toArray();

    console.log(`[INFO] Database  : ${DB_NAME}`);
    console.log(`[INFO] Collection: ${COLLECTION_NAME}`);
    console.log(`[INFO] Total docs: ${count}`);
    console.log("\n[INFO] Records found:");
    records.forEach((doc, i) => {
      console.log(`  [${i + 1}] ${JSON.stringify(doc)}`);
    });

    if (count > 0) {
      console.log("\n[SUCCESS] Verification passed! All records restored correctly.");
    } else {
      console.log("\n[WARNING] No documents found. Restore may have failed silently.");
    }
  } catch (err) {
    console.error("[ERROR] Verification failed:", err.message);
  } finally {
    await client.close();
  }
}

// ── MAIN ─────────────────────────────────────────────────────

async function main() {
  console.log("\n==========================================");
  console.log("  MongoDB DR Pipeline — pipeline.js");
  console.log("  Backup → Restore → Verify");
  console.log("==========================================");

  const backupDir = runFullBackup();
  runRestore(backupDir);
  await runVerification();

  console.log("\n==========================================");
  console.log(" Pipeline completed successfully!");
  console.log("==========================================\n");
}

main().catch((err) => {
  console.error("[ERROR] Pipeline crashed:", err.message);
  process.exit(1);
});
