require("dotenv").config();
// ============================================================
//  backup-incremental.js — Incremental Backup (Last 24 Hours)
//  Temflo Systems | MongoDB Backup Strategy | June 2026
require("dotenv").config();
// ============================================================
//
//  What this does:
//    Queries only records where updatedAt >= last 24 hours
//    and saves them as a JSON file inside /backups/
//
//  How to run:
//    node backup-incremental.js
require("dotenv").config();
// ============================================================

const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");

const CONNECTION_STRING = process.env.MONGO_URI;
const DB_NAME = "testDB";
const COLLECTION = "students";

if (!CONNECTION_STRING) {
  console.error("[ERROR] MONGO_URI not set. Add it to your .env file.");
  process.exit(1);
}

async function incrementalBackup() {
  const client = new MongoClient(CONNECTION_STRING);

  try {
    await client.connect();
    console.log("[INFO] Connected to Atlas");

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    console.log(`[INFO] Fetching records updated since: ${since.toLocaleString()}`);

    const db = client.db(DB_NAME);
    const docs = await db.collection(COLLECTION)
      .find({ updatedAt: { $gte: since } })
      .toArray();

    console.log(`[INFO] Found ${docs.length} record(s) changed in last 24 hours`);

    if (docs.length === 0) {
      console.log("[INFO] Nothing to back up — no recent changes.");
      return;
    }

    const timestamp = new Date()
      .toISOString()
      .replace(/T/, "_")
      .replace(/:/g, "-")
      .slice(0, 19);

    const outDir = path.join(__dirname, "backups", `incremental_${timestamp}`);
    fs.mkdirSync(outDir, { recursive: true });

    const outFile = path.join(outDir, "students_incremental.json");
    fs.writeFileSync(outFile, JSON.stringify(docs, null, 2));

    console.log("[SUCCESS] Incremental backup saved!");
    console.log(`[INFO] File: ${outFile}`);
    console.log("[INFO] Records backed up:");
    docs.forEach(d => console.log(`  - ${d.name} (updatedAt: ${d.updatedAt})`));

  } catch (err) {
    console.error("[ERROR]", err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

incrementalBackup();
