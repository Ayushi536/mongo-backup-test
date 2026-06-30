require("dotenv").config();
// ============================================================
//  backup-s3.js — Full Database Backup → uploaded to AWS S3
//  Temflo Systems | MongoDB Backup Strategy | June 2026
// ============================================================
//
//  What this does (per Madhav's decision in the meeting):
//    1. Takes a full mongodump backup (same as backup-full.js)
//    2. Uploads the backup folder to an S3 bucket
//    3. Writes a "heartbeat" timestamp file after every successful run
//    4. If THIS script fails to run/complete, raises an AIMS incident
//       (this is different from "backup failed" — this is
//       "the backup script itself didn't run")
//
//  Before running:
//    - Set MONGO_URI, AWS credentials, S3_BUCKET_NAME in .env
//    - Run on a schedule (cron / Windows Task Scheduler) — every run
//      updates heartbeat.json so a separate watchdog can tell if
//      this script has stopped firing on schedule.
//
//  How to run:
//    node backup-s3.js
// ============================================================

const { execSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const {
  S3Client,
  PutObjectCommand,
} = require("@aws-sdk/client-s3");
const createAimsIncident = require("./aimsIncident");

const CONNECTION_STRING = process.env.MONGO_URI;
const DB_NAME = "testDB";
const S3_BUCKET = process.env.S3_BUCKET_NAME;
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const HEARTBEAT_FILE = path.join(__dirname, "heartbeat.json");

if (!CONNECTION_STRING) {
  console.error("[ERROR] MONGO_URI not set. Add it to your .env file.");
  process.exit(1);
}
if (!S3_BUCKET) {
  console.error("[ERROR] S3_BUCKET_NAME not set. Add it to your .env file.");
  process.exit(1);
}

const s3 = new S3Client({ region: AWS_REGION });

// ── Step 1: local mongodump (same approach as backup-full.js) ──

function runLocalDump() {
  const timestamp = new Date()
    .toISOString()
    .replace(/T/, "_")
    .replace(/:/g, "-")
    .slice(0, 19);

  const outputDir = path.join(__dirname, "backups", `s3_${timestamp}`);
  fs.mkdirSync(outputDir, { recursive: true });

  const command = `mongodump --uri="${CONNECTION_STRING}" --db=${DB_NAME} --out="${outputDir}" --ssl --tlsInsecure`;
  console.log("[INFO] Running mongodump ->", outputDir);
  execSync(command, { stdio: "inherit" });

  return { outputDir, timestamp };
}

// ── Step 2: upload every file in the dump folder to S3 ──

async function uploadDirToS3(localDir, s3Prefix) {
  const dbDir = path.join(localDir, DB_NAME);
  const files = fs.readdirSync(dbDir);

  for (const file of files) {
    const filePath = path.join(dbDir, file);
    const fileContent = fs.readFileSync(filePath);
    const key = `${s3Prefix}/${file}`;

    await s3.send(
      new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: fileContent,
      })
    );
    console.log(`[INFO] Uploaded -> s3://${S3_BUCKET}/${key}`);
  }
}

// ── Step 3: heartbeat — proof that this script ran successfully ──

function writeHeartbeat(status, extra = {}) {
  const heartbeat = {
    lastRunAt: new Date().toISOString(),
    status, // "success" | "failed"
    ...extra,
  };
  fs.writeFileSync(HEARTBEAT_FILE, JSON.stringify(heartbeat, null, 2));
}

// ── MAIN ─────────────────────────────────────────────────────

async function main() {
  console.log("\n==========================================");
  console.log("  S3 Backup — backup-s3.js");
  console.log("==========================================");

  try {
    const { outputDir, timestamp } = runLocalDump();
    const s3Prefix = `mongo-backups/${DB_NAME}/${timestamp}`;

    await uploadDirToS3(outputDir, s3Prefix);

    writeHeartbeat("success", { s3Prefix });
    console.log("\n[SUCCESS] Backup uploaded to S3 and heartbeat updated.");
  } catch (err) {
    console.error("[ERROR] backup-s3.js failed:", err.message);
    writeHeartbeat("failed", { error: err.message });

    // This script itself failing/crashing -> raise an incident immediately.
    // (Separate watchdog-style check for "script didn't run at all" lives
    // in checkBackupHeartbeat.js, run on its own schedule.)
    await createAimsIncident({
      title: "MongoDB S3 backup script failed",
      description: `backup-s3.js threw an error during execution: ${err.message}`,
      severity: "High",
      categoryName: "Database",
      source: "backup-s3-script",
    });

    process.exit(1);
  }
}

main();
