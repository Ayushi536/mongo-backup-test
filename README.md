# MongoDB Backup & Disaster Recovery — Temflo Systems

A Node.js project implementing a complete MongoDB Atlas backup and disaster recovery pipeline, built and tested during an internship at Temflo Systems (June 2026).

---

## What this covers

| Strategy | Script | Description |
|---|---|---|
| Full Backup | `backup-full.js` | Dumps entire database to BSON using `mongodump` |
| Incremental Backup | `backup-incremental.js` | Saves only records changed in the last 24 hours |
| Real-Time Monitoring | `change-streams.js` | Watches for live insert/update/delete events |
| Replica Set Check | `verify-replica-set.js` | Checks health of all 3 Atlas cluster nodes |
| Restore | `restore.js` | Restores a BSON backup to a new Atlas cluster |
| Full DR Pipeline | `pipeline.js` | Runs backup → restore → verify in one command |

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Copy `.env.example` to `.env` and fill in your connection strings:
```bash
copy .env.example .env
```

Then open `.env` and set:
- `MONGO_URI` — connection string of your source Atlas cluster
- `MONGO_RESTORE_URI` — connection string of your target/restore cluster

### 3. Load .env before running scripts
Add this line at the top of any script you run, or use the `dotenv` package:
```js
require("dotenv").config();
```

Or run with:
```bash
node -r dotenv/config backup-full.js
```

---

## Running the scripts

```bash
# Seed test data
npm run seed

# Take a full backup
npm run backup

# Take an incremental backup (last 24h changes only)
npm run backup:incremental

# Watch for real-time changes
npm run watch

# Verify replica set health
npm run verify

# Restore a backup to a new cluster
npm run restore

# Run the full automated pipeline (backup → restore → verify)
npm run pipeline
```

---

## Test results

Testing was done against a live MongoDB Atlas M0 free cluster (AWS Mumbai, ap-south-1).

- Seed data: Ayushi, Rahul, Priya (3 records)
- Full backup: dumped `testDB.students` as BSON — all 3 records captured
- Added: Rocky, chunkyy, Garrette (3 more records)
- Incremental backup: captured the 3 new records correctly via `updatedAt` timestamp query
- Change streams: all inserts detected and logged in real time
- Restore: full BSON backup restored to a new Atlas cluster — all records verified on Atlas dashboard

---

## Stack

- Node.js v20, npm
- MongoDB Node.js Driver v7.3
- MongoDB Database Tools (`mongodump`, `mongorestore`) v100.17.0
- MongoDB Atlas Free Tier (M0)
- Windows 11

---

## Notes

- `backups/` folder is excluded from git (added to `.gitignore`) — BSON files are too large and not meant for version control
- Connection strings use direct shard hosts instead of SRV because college network DNS blocks SRV resolution
- All credentials are stored in `.env` — never committed to the repo
