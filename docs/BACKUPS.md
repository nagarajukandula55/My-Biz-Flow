# Database backups

Automated by `.github/workflows/db-backup.yml`. Runs every 6 hours
(`0 */6 * * *`, plus manual trigger via the Actions tab), dumps both
production databases, and uploads them together as one GitHub Release in
this repo.

## What gets backed up

- **Postgres** (Neon, via `pg_dump`) — the app's primary database
- **MongoDB** (`mongodump`) — the second database added for this workflow

Each run creates a Release tagged `backup-<UTC timestamp>` with two assets:

- `db-backup-<timestamp>.sql.gz`
- `mongo-backup-<timestamp>.archive`

Releases older than 7 days are deleted automatically by the `cleanup` job,
so storage stays bounded. A `notify` job posts a ✅/❌ confirmation (with a
link to the run) to the "AN Group - Admin" Telegram group after every run.

## Restore

Download the two asset files from the relevant Release
(`https://github.com/<owner>/<repo>/releases/tag/backup-<timestamp>`), then:

```bash
# Postgres — use the DIRECT (unpooled) connection string, e.g.
# DATABASE_URL_UNPOOLED from Vercel/Neon
gunzip -c db-backup-<timestamp>.sql.gz | psql "$DATABASE_URL_UNPOOLED"

# MongoDB — use the mongodb+srv://... connection string
mongorestore --uri="$MONGODB_URI" --archive=mongo-backup-<timestamp>.archive --gzip
```

## Required GitHub Actions secrets

Set under Settings -> Secrets and variables -> Actions:

| Secret | Value |
|---|---|
| `BACKUP_DATABASE_URL` | Same as `DATABASE_URL_UNPOOLED` (Neon direct/unpooled connection — `pg_dump` needs direct, not pooled) |
| `BACKUP_MONGODB_URI` | The MongoDB `mongodb+srv://...` connection string |
| `TELEGRAM_BOT_TOKEN` | Bot token from @BotFather |
| `TELEGRAM_GROUP_CHAT_ID` | Chat id of the group to post backup status to (bot must be a member of the group) |

## Manually triggering a run

From the GitHub UI: **Actions -> Database backup -> Run workflow**.

From the CLI:

```bash
gh workflow run "Database backup" --repo <owner>/<repo>
gh run list --repo <owner>/<repo> --workflow "Database backup" --limit 3
```

## Notes / known gotchas

- Neon runs Postgres 18. Ubuntu's default `apt install postgresql-client`
  installs v16, which refuses to dump a newer server
  (`pg_dump: error: aborting because of server version mismatch`). The
  workflow installs `postgresql-client-18` from the PGDG apt repo and
  calls `/usr/lib/postgresql/18/bin/pg_dump` directly, since the unversioned
  `pg_dump` on `PATH` still resolves to the older default.
- This is a **separate, independent safety net** from Neon's own built-in
  point-in-time recovery (retention depends on your Neon plan tier — check
  the Neon dashboard). Treat both as complementary, not either/or.
- Backups are stored as **plaintext** GitHub Release assets in this repo.
  Anyone with read access to the repo can download the full database
  contents (customer data, invoices, GST/financial records). This was a
  deliberate choice (documented decision: private repo access is
  considered sufficient for now) — revisit adding encryption before
  granting repo access to anyone outside the current owner.
