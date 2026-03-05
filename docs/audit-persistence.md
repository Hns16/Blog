# Audit Persistence Strategy

## Goal

Provide optional file persistence for admin audit events while keeping in-memory behavior as default.

## Current Behavior

- Default mode: memory-only ring buffer (`MAX_AUDIT_EVENTS=400`)
- Optional mode: append JSONL to file when `ADMIN_AUDIT_FILE` is set

## Toggle

Set environment variable:

```bash
ADMIN_AUDIT_FILE=/absolute/path/to/admin-audit.log
```

## Data Format

Each line is one JSON object (JSONL), same shape as `AdminAuditEvent`.

## Failure Policy

- Persistence write failure does not block request handling.
- Last persistence error is exposed via diag snapshot `audit.lastError`.

