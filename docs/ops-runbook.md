# Ops Runbook

Last Updated: 2026-03-05

## 1. Pre-Release Gate

Run in project root:

```bash
npm run lint
npx tsc --noEmit
npm run build
npm run check:architecture
npm run check:state
npm run check:publishing
npm run check:admin-health
npm run check:admin-diag
npm run check:content-permissions
npm run check:routes-meta
npm run check:admin-route-meta-usage
npm run check:publish-scheduled-html
npm run check:publish-scheduled-zero
npm run check:route-guard
npm run check:env
npm run check:audit-file
npm run check:todo-consistency
npm run check:admin-ui-telemetry
npm run check:admin-i18n-coverage
npm run check:admin-redirect-rid
npm run check:request-id-presence
npm run check:docs-links
npm run check:api-error-codes
npm run check:runbook-commands
npm run check:runbook-matrix-sync
npm run check:ci-steps-order
npm run check:smoke-step-order
npm run check:api-route-count
npm run check:audit-action-coverage
npm run check:docs-toc
npm run check:script-shebang
npm run check:json-output
npm run check:admin-pages-params
npm run check:smoke-report-schema
npm run check:doc-command-sync
npm run check:admin-health-fields
npm run check:output-artifacts
npm run check:admin-page-links
npm run check:docs-version-stamp
npm run check:release-checklist-coverage
npm run check:health-shape-runtime
npm run check:diag-shape-runtime
npm run drill:api
npm run drill:release
```

Release is blocked if any command fails.

For restricted sandbox environments only:

```bash
DRILL_ALLOW_SKIP=1 npm run check:publishing
DRILL_ALLOW_SKIP=1 npm run drill:api
```

## 1.1 Restricted Environment Variable Matrix

1. `DRILL_ALLOW_SKIP=1`
   - Trigger: environment blocks child process or runtime probe startup.
   - Impact: drill keeps static assertions and marks restricted runtime branch as skipped.
2. `SMOKE_ALLOW_BUILD_SKIP=1`
   - Trigger: local host has persistent Next.js build worker crash (`next build` worker exit code 1).
   - Impact: smoke continues and marks build step as `skipped: true` in `output/smoke-last.json`.
3. `OUTPUT_ARTIFACT_STRICT=1`
   - Trigger: release wants stricter artifact gate before deployment.
   - Impact: `check:output-artifacts` additionally requires strict artifacts and enforces thresholds.

## 2. Production Deploy (Node + PM2)

```bash
git pull
npm install --omit=dev
npm run build
pm2 restart my-blog
```

## 3. Post-Deploy Verification

Check pages:

1. `/`
2. `/blog`
3. `/admin`
4. `/admin/posts`

Check APIs (authenticated session required):

1. `GET /api/admin/health`
2. `GET /api/admin/diag/snapshot?limit=5`

## 4. Content Rollback

From admin UI:

1. Open `/admin/posts`
2. Enter target post edit page
3. Select a historical revision and rollback
4. Re-check `/blog/[slug]`

## 5. Scheduled Publish Recovery

If scheduled publish looks stalled:

1. Open `/admin/posts`
2. Click `执行计划发布`
3. Confirm affected post status moved to `published`
4. Re-check `/blog` and `/blog/[slug]`

## 6. Session Incident Response

If admin credential exposure is suspected:

1. Rotate `ADMIN_WRITE_PASSWORD`
2. Trigger `全量会话失效` in admin posts page
3. Verify fresh login is required

## 7. Read-Only Troubleshooting

Only inspect, do not modify files/processes.

1. Check app health endpoint response:
`curl -sS http://127.0.0.1:3000/api/admin/health`
2. Check diagnostics snapshot:
`curl -sS \"http://127.0.0.1:3000/api/admin/diag/snapshot?limit=5\"`
3. Validate state file structure:
`npm run check:state`
4. Validate route architecture conventions:
`npm run check:architecture`
5. Check recent app logs (read-only):
`pm2 logs my-blog --lines 80 --nostream`

## 8. Audit Persistence Incident

Symptoms:
1. `/api/admin/health` shows `checks.audit=warn`
2. `/api/admin/health` includes `audit.lastError`
3. `/api/admin/diag/snapshot` includes audit mode/file error

Read-only checks:
1. Verify environment config:
`rg -n "^ADMIN_AUDIT_FILE=" .env.production .env.local 2>/dev/null || true`
2. Verify target directory/file permission:
`npm run check:content-permissions`
3. Verify app health payload:
`curl -sS http://127.0.0.1:3000/api/admin/health`
4. Verify diagnostics payload:
`curl -sS "http://127.0.0.1:3000/api/admin/diag/snapshot?limit=5"`

Recovery strategy:
1. If audit file path is unavailable, keep service online with memory mode temporarily.
2. Restore writable path and switch `ADMIN_AUDIT_FILE` to a durable location.
3. Restart app and verify `checks.audit=ok`.

Risk notes:
1. Memory mode only keeps recent in-process events and may lose history after restart.
2. During persistence failure windows, audit trail continuity is reduced.
