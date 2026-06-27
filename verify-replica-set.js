require("dotenv").config();
// ============================================================
//  verify-replica-set.js — Replica Set Health Check
//  Temflo Systems | MongoDB Backup Strategy | June 2026
require("dotenv").config();
// ============================================================
//
//  What this does:
//    Connects to the Atlas cluster and checks the status of all
//    replica set members — which node is PRIMARY, which are
//    SECONDARY, and whether all nodes are healthy.
//
//  How to run:
//    node verify-replica-set.js
require("dotenv").config();
// ============================================================

const { MongoClient } = require("mongodb");

const CONNECTION_STRING = process.env.MONGO_URI;

if (!CONNECTION_STRING) {
  console.error("[ERROR] MONGO_URI not set. Add it to your .env file.");
  process.exit(1);
}

async function verifyReplicaSet() {
  const client = new MongoClient(CONNECTION_STRING);

  try {
    await client.connect();
    console.log("[INFO] Connected to Atlas");
    console.log("================================================");
    console.log("  Replica Set Verification Report");
    console.log("================================================");

    const admin = client.db("admin");
    const status = await admin.command({ replSetGetStatus: 1 });

    console.log(`\nReplica Set Name : ${status.set}`);
    console.log(`Total Members    : ${status.members.length}`);
    console.log(`\nMembers:`);

    status.members.forEach((member, i) => {
      const role = member.stateStr === "PRIMARY" ? "PRIMARY" :
                   member.stateStr === "SECONDARY" ? "SECONDARY" : member.stateStr;
      const health = member.health === 1 ? "Healthy" : "UNHEALTHY";
      const uptime = `${Math.floor(member.uptime / 3600)}h ${Math.floor((member.uptime % 3600) / 60)}m`;

      console.log(`\n  Member ${i + 1}: ${member.name}`);
      console.log(`  Role   : ${role}`);
      console.log(`  Health : ${health}`);
      console.log(`  Uptime : ${uptime}`);
    });

    const primary = status.members.find(m => m.stateStr === "PRIMARY");
    const secondaries = status.members.filter(m => m.stateStr === "SECONDARY");
    const allHealthy = status.members.every(m => m.health === 1);

    console.log("\n================================================");
    console.log("  Summary:");
    console.log(`  Replica Set Active : YES`);
    console.log(`  Primary node       : ${primary ? primary.name : "None"}`);
    console.log(`  Secondary nodes    : ${secondaries.length}`);
    console.log(`  All nodes healthy  : ${allHealthy ? "YES" : "NO"}`);
    console.log("================================================");

  } catch (err) {
    console.error("[ERROR]", err.message);
  } finally {
    await client.close();
  }
}

verifyReplicaSet();
