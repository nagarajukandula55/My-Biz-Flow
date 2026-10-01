# Requested release gate — 1 October 2026

The owner authorized a push after a fresh database backup, with the additional requirement that existing Service Centre modules/code remain untouched. This supersedes the earlier local-only restriction, but does not authorize database mutations.

## Owner decisions

- Direct edits inside Service Centre module folders must be excluded from the push.
- Shared code used by Service Centre can remain when needed for the approved system, stock, authentication and Admin-control work.
- The partner app release target is the existing remote `main` branch.
- The Admin release target is the existing remote `master` branch; no new Admin `main` branch will be created.

## Fresh backup

Workflow: Database backup, on existing remote main.
Run: https://github.com/nagarajukandula55/My-Biz-Flow/actions/runs/36851074533
Started: 2026-10-01 10:45:08 UTC.
Release: https://github.com/nagarajukandula55/My-Biz-Flow/releases/tag/backup-20261001-104517

Verification completed before release preparation continued:

- `db-backup-20261001-104517.sql.gz`, 5,831,615 bytes, SHA256 `fb6e4c74464e3ca68972596b0c65ef7db627d9197e250cc22aabec217d0946d3`
- `mongo-backup-20261001-104517.archive`, 3,535,788 bytes, SHA256 `fc79493de19e505382586f47b0c93df08b205150ebc3ef66db80b9c4f3fd0c3f`
- `manifest-20261001-104517.json`, 2,958 bytes, SHA256 `3c7a79fdd0f97db3e3e7c0b182a3f9b8d9a711c8a7cc392921a13de33df3d6c3`

The downloaded asset hashes matched the published manifest. PostgreSQL gzip streaming, Mongo archive reading and manifest JSON/count validation passed. This was a backup verification only; no live database changes or restores were applied.

## Restricted release preparation

- Main remote `origin/main` advanced to `ca9b3d72faa99aa5405c354fb8b45b7a55378366`; it was merged locally and must be preserved. Force push is forbidden.
- Admin remote `origin/master` remains the target branch. No remote Admin `main` branch exists.
- Direct Service Centre folder edits were restored to match the release branch in both repositories. As of this note, `git diff origin/main -- src/app/partner/[partnerId]/service-centre` in the partner app and `git diff origin/master -- src/app/partner/[partnerId]/service-centre` in Admin produce no file changes.
- Admin needs compatibility outside the protected folder because the unchanged historical Service Centre Telegram page imports legacy shared Telegram exports. The active route is redirected to the current Admin notification controls, and stale legacy form actions authenticate then redirect instead of writing obsolete database columns.
- The partner app homepage and module-guide detail page were changed to render on request instead of querying live partner-type data during deployment builds. This keeps Admin-managed business-type data live while preventing production builds from depending on a database connection.
- Admin's module overview now exposes a no-code readiness and acceptance checklist for every module: route coverage, workflow acceptance, dashboard/analytics coverage, settings/editor controls, provider dependencies, business workflow checks and the relevant Admin control link. This does not change partner data.
- Admin now has a Database Maintenance control map at `/admin/system/database`. It separates read-only checks, typed maintenance writes, guarded restore-only paths and disabled dangerous actions such as raw SQL and bulk partner deletion.
- Existing user temporary files remain unstaged: `check-columns.tmp.js`, `manifest-backup.tmp.json`, `backup-dump.tmp.sql`, and `restore-missing.js`.
- No code has been pushed by this release task; no live database changes have been applied.

## Verification status

- The earlier full local checkpoint passed 34 partner-app and 14 Admin offline safety checks, eight disposable PostgreSQL checks and isolated production builds.
- After excluding direct Service Centre folder edits, the restricted release passed 34 partner-app offline safety checks and 17 Admin offline safety checks. TypeScript checks also passed in both repositories.
- Local production builds pass in both repositories. The Admin build still reports the known non-fatal jose/Edge runtime warning from `adminAuth.ts`.
- Disposable database checks still need to be repeated immediately before push. That verification is currently blocked by the local approval/usage gate, not by a test failure.

See `release-status-2026-10-01.md` for implementation and earlier test results. Those results apply to the full checkpoint unless explicitly repeated here for the restricted release.
