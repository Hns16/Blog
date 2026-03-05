# Admin API Contract

Last Updated: 2026-03-05

## Base Rules

1. All admin APIs return JSON for non-HTML requests.
2. Error payload follows:
`{ ok?: false, error: string, code: string, requestId: string }`
3. Success payload always includes `requestId` for traceability.
4. HTML form requests may be redirected with query parameters (`success/error/rid`).

## Endpoints

1. `POST /api/admin/login`
- Success (HTML): `303 -> /admin/posts`
- Failure (HTML): `303 -> /admin?error=...`
- Failure (JSON): `429` with `RATE_LIMITED` when throttled

2. `POST /api/admin/logout`
- Success (HTML): `303 -> /admin`

3. `GET /api/admin/health`
- Success: `200` with `summary/checks/auth/contentRw/writeProbe/storage/audit/requestId`
- Failure:
  - `403` forbidden (same-origin guard)
  - `401` unauthorized (auth guard)

4. `GET /api/admin/diag/snapshot?limit=5`
- Success: `200` with `health/audit/events/requestId`
- Failure:
  - `403` forbidden
  - `401` unauthorized

5. `POST /api/admin/write-check`
- Success: `200` with validation result
- Failure:
  - `403` forbidden
  - `401` unauthorized
  - `400/404` based on write error code mapping

6. `POST /api/admin/update-post`
- Success:
  - HTML: `303 -> /admin/posts?success=updated&rid=...`
  - JSON: `200` with `ok/slug/status/revisionId/requestId`
- Failure:
  - HTML: `303 -> /admin/edit/[slug]?error=...&rid=...`
  - JSON: mapped status + `{ code, requestId }`

7. `POST /api/admin/delete-post`
- Success:
  - HTML: `303 -> /admin/posts?success=deleted&rid=...`
  - JSON: `200` with `ok/slug/requestId`
- Failure:
  - HTML: `303 -> /admin/posts?error=...&rid=...`
  - JSON: `400/404/500` based on reason

8. `POST /api/admin/publish-scheduled`
- Success:
  - HTML: `303 -> /admin/posts?success=scheduled_run&rid=...`
  - JSON: `200` with `count/results/requestId`
- Failure:
  - `403` forbidden
  - `401` unauthorized

9. `POST /api/admin/invalidate-sessions`
- Success:
  - HTML: `303 -> /admin?error=session_invalidated`
  - JSON: `200` with `ok/sessionVersion/requestId`
- Failure:
  - `403` forbidden
  - `401` unauthorized

10. `POST /api/write`
- Success: `200` JSON
- Failure: mapped write status with `{ code, requestId }`

## Error Code Families

1. Guard errors: `forbidden`, `unauthorized` (legacy uppercase on selected routes for compatibility)
2. Write errors: `slug_conflict`, `write_conflict`, `invalid_slug`, `invalid_date`, `missing_required`, `invalid_action`, `schedule_invalid`, `revision_not_found`, `publish_failed`, `not_found`
3. Login rate limit: `RATE_LIMITED`

## Compatibility Constraints

1. Default contract uses lowercase error codes (`forbidden`, `unauthorized`, write errors).
2. Legacy uppercase codes are only kept where historical clients depend on them:
`FORBIDDEN`, `UNAUTHORIZED`, `RATE_LIMITED`.
3. New endpoints should not introduce new uppercase codes.
4. If uppercase compatibility is removed in the future, versioned API notice is required.

## Field Compatibility Strategy

1. Response fields are backward-compatible by default: new optional fields may be added.
2. Existing required fields (`requestId`, `code`, `error`, key summary fields) must not be removed or renamed.
3. Field type changes are breaking changes and require explicit versioning.
4. Clients should ignore unknown fields to stay forward-compatible.

## Response Examples

1. Health success:
```json
{
  "ok": true,
  "requestId": "req_123",
  "summary": "ok",
  "checks": {
    "auth": "ok",
    "content_rw": "ok",
    "write_probe": "ok",
    "storage": "ok",
    "audit": "ok"
  },
  "audit": {
    "mode": "file",
    "filePath": "/var/log/my-blog/admin-audit.log",
    "lastError": null
  }
}
```

2. Write error (JSON):
```json
{
  "ok": false,
  "error": "Invalid slug",
  "code": "invalid_slug",
  "requestId": "req_456"
}
```

3. Publish scheduled success (JSON):
```json
{
  "ok": true,
  "requestId": "req_789",
  "count": 0,
  "results": []
}
```

4. Guard error (unauthorized):
```json
{
  "ok": false,
  "error": "Unauthorized",
  "code": "unauthorized",
  "requestId": "req_abc"
}
```
