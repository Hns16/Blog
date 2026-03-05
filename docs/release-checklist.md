# Release Checklist

Last Updated: 2026-03-05

## 1. Build Gate

1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm run build`

## 2. Architecture & State Gate

1. `npm run check:architecture`
2. `npm run check:state`
3. `npm run check:publishing`
4. `npm run check:admin-health`
5. `npm run check:admin-diag`
6. `npm run check:content-permissions`
7. `npm run check:routes-meta`
8. `npm run check:admin-route-meta-usage`
9. `npm run check:publish-scheduled-html`
10. `npm run check:publish-scheduled-zero`
11. `npm run check:route-guard`
12. `npm run check:env`
13. `npm run check:audit-file`
14. `npm run check:todo-consistency`
15. `npm run check:admin-ui-telemetry`
16. `npm run check:admin-i18n-coverage`
17. `npm run check:admin-redirect-rid`
18. `npm run check:request-id-presence`
19. `npm run check:docs-links`
20. `npm run check:api-error-codes`
21. `npm run check:runbook-commands`
22. `npm run check:runbook-matrix-sync`
23. `npm run check:ci-steps-order`
24. `npm run check:smoke-step-order`
25. `npm run check:api-route-count`
26. `npm run check:audit-action-coverage`
27. `npm run check:docs-toc`
28. `npm run check:script-shebang`
29. `npm run check:json-output`
30. `npm run check:admin-pages-params`
31. `npm run check:smoke-report-schema`
32. `npm run check:doc-command-sync`
33. `npm run check:admin-health-fields`
34. `npm run check:output-artifacts`
35. `npm run check:admin-page-links`
36. `npm run check:docs-version-stamp`
37. `npm run check:release-checklist-coverage`
38. `npm run check:health-shape-runtime`
39. `npm run check:diag-shape-runtime`

## 3. Drill Gate

1. `npm run drill:release`
2. `npm run drill:api`

Restricted sandbox fallback only:
1. `DRILL_ALLOW_SKIP=1 npm run check:publishing`
2. `DRILL_ALLOW_SKIP=1 npm run drill:api`

## 4. Manual Verification

1. Open `/`, `/blog`, `/admin`, `/admin/posts`
2. Create draft in `/admin/new`
3. Publish or schedule one post
4. Rollback one revision in `/admin/edit/[slug]`
5. Trigger `执行计划发布` once and confirm result
6. Trigger `全量会话失效` and verify re-login is required

## 5. Rollback Readiness

1. Confirm previous deployment artifact is available
2. Confirm content state files exist:
`content/blog/.state/publish-store.json`
`content/blog/.state/schedule-queue.json`
3. Confirm admin can rollback revision from UI

## 6. Post-Release 10-Minute Watch

1. Error rate watch: monitor `401/403/429/5xx` trend and ensure no rapid climb.
2. Latency watch: verify core pages (`/`, `/blog`, `/admin/posts`) stay within expected response time.
3. Availability watch: verify admin write flow is still operational (draft/save/publish minimal probe).
4. Diagnostics watch: confirm `/api/admin/health` summary remains stable and no new critical diag events.

## 7. Post-Rollback Verification

1. Page verification: `/`, `/blog`, `/admin`, `/admin/posts` can be opened successfully.
2. API verification: `/api/admin/health` and `/api/admin/diag/snapshot?limit=5` return expected structure.
3. Audit verification: latest admin actions include valid `requestId` and no new persistent audit errors.

## 8. On-Call Handover Check

1. Confirm current release owner and next on-call owner.
2. Confirm handover acknowledgment timestamp is recorded.
3. Confirm monitoring dashboard link is attached in release notes.

## 9. Coverage Exclusion Rule

1. `check:release-checklist-coverage` intentionally excludes `check:smoke`.
2. Reason: `check:smoke` is an aggregate meta-command that wraps all checks and drills; listing it together with full command list creates redundant gate duplication.
