require("dotenv").config();
// ============================================================
//  change-streams.js — Real-Time Change Stream Listener
//  Temflo Systems | MongoDB Backup Strategy | June 2026
require("dotenv").config();
// ============================================================
//
//  What this does:
//    Watches testDB.students for any insert/update/delete
//    and logs each event to the console in real time.
//    Saves a resume token so it can pick up where it left off
//    if the script is restarted.
//
//  How to run:
//    node change-streams.js
//    Press Ctrl+C to stop.
require("dotenv").config();
// ============================================================

const { MongoClient } = require("mongodb");
const fs = require("fs");
const path = require("path");

const CONNECTION_STRING = process.env.MONGO_URI;
const TOKEN_FILE = path.join(__dirname, "resume-token.json");

if (!CONNECTION_STRING) {
  console.error("[ERROR] MONGO_URI not set. Add it to your .env file.");
  process.exit(1);
}

function saveToken(token) {
  fs.writeFileSync(TOKEN_FILE, JSON.stringify(token));
}

function loadToken() {
  if (fs.existsSync(TOKEN_FILE)) {
    console.log("[INFO] Resume token found — resuming from last position");
    return JSON.parse(fs.readFileSync(TOKEN_FILE));
  }
  return null;
}

async function watchChanges() {
  const client = new MongoClient(CONNECTION_STRING);

  try {
    await client.connect();
    console.log("[INFO] Connected to Atlas");
    console.log("[INFO] Watching testDB.students for changes...");
    console.log("[INFO] Insert/update/delete a record in Atlas to see it logged");
    console.log("[INFO] Press Ctrl+C to stop\n");

    const collection = client.db("testDB").collection("students");

    const resumeToken = loadToken();
    const streamOptions = resumeToken ? { resumeAfter: resumeToken } : {};
    const changeStream = collection.watch([], streamOptions);

    changeStream.on("change", (change) => {
      saveToken(change._id);

      const time = new Date().toLocaleTimeString();
      console.log(`\n[${time}] Change detected!`);
      console.log(`  Operation : ${change.operationType.toUpperCase()}`);

      if (change.operationType === "insert") {
        console.log(`  New doc   :`, JSON.stringify(change.fullDocument, null, 2));
      } else if (change.operationType === "update") {
        console.log(`  Doc ID    : ${change.documentKey._id}`);
        console.log(`  Changes   :`, JSON.stringify(change.updateDescription, null, 2));
      } else if (change.operationType === "delete") {
        console.log(`  Deleted ID: ${change.documentKey._id}`);
      }
    });

    changeStream.on("error", (err) => {
      console.error("[ERROR] Stream error:", err.message);
      console.log("[INFO] Restart the script — it will resume from the last saved position");
    });

  } catch (err) {
    console.error("[ERROR] Connection error:", err.message);
    await client.close();
  }
}

watchChanges();
