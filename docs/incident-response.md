# Incident Response

Last Updated: 2026-03-05

## Scope

This guide covers high-frequency admin API incidents:
1. `401 unauthorized`
2. `403 forbidden`
3. `429 RATE_LIMITED`

## 1. Trigger Conditions

1. Monitoring shows sudden spikes in `401/403/429`.
2. Admin users report repeated login failures or forced re-auth.
3. Audit snapshots show burst failures in short time windows.

## 2. Triage Order

1. Verify service baseline:
`npm run check:env`
`npm run check:state`
`npm run check:architecture`
2. Verify auth and guard health:
`curl -sS http://127.0.0.1:3000/api/admin/health`
`curl -sS "http://127.0.0.1:3000/api/admin/diag/snapshot?limit=20"`
3. Verify runtime logs:
`pm2 logs my-blog --lines 120 --nostream`

## 3. 401 Unauthorized Playbook

1. Confirm session invalidation event in audit timeline.
2. Confirm cookie/session storage mode in health payload.
3. If storage degraded, recover persistent storage and restart app.
4. Ask admins to re-login and verify `requestId` continuity.

## 4. 403 Forbidden Playbook

1. Check reverse proxy headers (`host`, `x-forwarded-host`, `origin`, `referer`).
2. Confirm same-origin policy expectations for admin forms and API clients.
3. If proxy rewrite changed host/proto, rollback proxy config to last good state.
4. Re-check with admin UI form submission and verify no 403 spikes.

## 5. 429 Rate Limited Playbook

1. Confirm source IP/session burst in audit logs.
2. Distinguish brute-force attempts vs. legitimate user retries.
3. If attack suspected, add temporary WAF/rate-limit at edge.
4. If false positive, review login retry behavior and client-side UX.

## 6. Rollback Strategy

1. Keep last stable deployment artifact ready.
2. Roll back only app version first; do not mutate content state files.
3. Re-run:
`npm run check:smoke`
4. Verify admin login and one write workflow end-to-end.

## 7. Exit Criteria

1. 401/403/429 error rate returns to baseline.
2. Health summary is `ok` or expected `warn` only.
3. No new critical failures in diag snapshot events.

## 8. Escalation Thresholds (SLO/SLA)

1. 5-minute window `401` ratio > 10% of admin requests for 10 minutes -> escalate to on-call backend engineer.
2. 5-minute window `403` count > 30 and rising -> escalate to on-call platform/network owner.
3. 5-minute window `429` count > 50 with user reports -> escalate to security + backend jointly.
4. Admin login success rate < 95% for 15 minutes -> incident severity at least `SEV-2`.
5. If guard/auth errors block all admin writes for > 20 minutes -> incident severity `SEV-1`.

## 9. Drill Record Template

1. Drill Time:
2. Incident Type (`401/403/429/other`):
3. Trigger Signal:
4. Impact Scope:
5. Timeline:
- `T0` detection
- `T1` triage start
- `T2` mitigation complete
- `T3` verification complete
6. Root Cause:
7. Corrective Actions:
8. Preventive Actions:
9. Owner and Due Date:

## 10. Postmortem Template

1. Incident Summary:
2. Facts (what happened, with timestamps only):
3. Decisions (who decided what, and when):
4. What Worked Well:
5. What Failed:
6. Action Items:
7. Action Item Owners:
8. Deadlines:

## 11. Cross-Team Communication Template

1. Affected Scope:
2. User Impact Summary:
3. Current Status:
4. Mitigation in Progress:
5. Next Update Time:
6. Public/Status-Page Message Draft:
