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
| **S3 Backup** | `backup-s3.js` | Full `mongodump` snapshot uploaded to an S3 bucket, with a heartbeat file proving the run happened |
| **AIMS Incident Helper** | `aimsIncident.js` | Shared function that raises an incident directly in AIMS when `backup-s3.js` itself fails |

---

## Backup → S3 + heartbeat (`backup-s3.js`)

What it does on every run:
1. Runs `mongodump` for a local snapshot (same as `backup-full.js`)
2. Uploads every file in that snapshot to an S3 bucket via `@aws-sdk/client-s3`
3. Writes `heartbeat.json` (last run time + status) **locally** for quick debugging
4. Uploads that same heartbeat to S3 at `heartbeats/backup-s3-heartbeat.json` — this is the copy that actually matters, since it lets `watchdog.js` (a separate repo, possibly running on a different machine) check whether the backup script is still firing on schedule, without needing access to this machine's filesystem
5. If the script itself throws/fails, it raises an AIMS incident immediately via `aimsIncident.js` (Critical, `Database` category) — this is different from "watchdog noticed it's been too long," which is the *script didn't run at all* case, handled on the `watchdog.js` side in the AWS repo

```bash
npm run backup:s3
```

Required `.env` additions: `S3_BUCKET_NAME`, `AWS_REGION`, `AIMS_BASE_URL`, `AIMS_API_KEY` (see `.env.example`).

Run this on a schedule (cron / Windows Task Scheduler) for it to be meaningful — a single manual run only proves the script works, not that backups are happening continuously.

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

# Take a full backup and upload it to S3, with heartbeat
npm run backup:s3
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
- `aimsIncident.js` is duplicated by hand in the AWS repo too (not a shared npm package) — both copies must use the same payload contract

---

## Status

| Item | Status |
|---|---|
| Full / incremental / change-streams backup | ✅ Verified locally against Atlas M0 |
| Restore to a second cluster | ✅ Verified locally |
| `backup-s3.js` (S3 upload + heartbeat) | ✅ Built and tested locally; heartbeat now also uploaded to S3 for cross-repo reads |
| AIMS incident on script failure | ✅ Wired via `aimsIncident.js`; not yet confirmed against a real AIMS API key |
| Production deployment (cron on EC2) | ⏳ Pending EC2 access |

*Ayushi Sharma — SDE Intern, Temflo Systems Pvt. Ltd.*