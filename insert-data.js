require("dotenv").config();
// ============================================================
//  insert-data.js — Seed Test Data into testDB.students
//  Temflo Systems | MongoDB Backup Strategy | June 2026
require("dotenv").config();
// ============================================================
//
//  What this does:
//    Inserts dummy student records into testDB.students for
//    testing the backup and restore pipeline.
//
//  How to run:
//    node insert-data.js
require("dotenv").config();
// ============================================================

const { MongoClient } = require("mongodb");

const CONNECTION_STRING = process.env.MONGO_URI;

if (!CONNECTION_STRING) {
  console.error("[ERROR] MONGO_URI not set. Add it to your .env file.");
  process.exit(1);
}

async function main() {
  const client = new MongoClient(CONNECTION_STRING);
  try {
    console.log("[INFO] Connecting...");
    await client.connect();
    console.log("[INFO] Connected!");

    const db = client.db("testDB");
    const collection = db.collection("students");

    const result = await collection.insertMany([
      { name: "Ayushi",   age: 21, course: "CS",  updatedAt: new Date() },
      { name: "Rahul",    age: 22, course: "IT",  updatedAt: new Date() },
      { name: "Priya",    age: 20, course: "ECE", updatedAt: new Date() },
    ]);

    console.log("[SUCCESS] Inserted", result.insertedCount, "record(s)");
  } catch (err) {
    console.error("[ERROR]", err.message);
  } finally {
    await client.close();
    console.log("[INFO] Connection closed.");
  }
}

main();
