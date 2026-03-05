export const API_ROUTE_PATH = {
  WRITE: "/api/write",
  ADMIN_HEALTH: "/api/admin/health",
  ADMIN_DIAG_SNAPSHOT: "/api/admin/diag/snapshot",
  ADMIN_INVALIDATE_SESSIONS: "/api/admin/invalidate-sessions",
  ADMIN_PUBLISH_SCHEDULED: "/api/admin/publish-scheduled",
  ADMIN_WRITE_CHECK: "/api/admin/write-check",
  ADMIN_DELETE_POST: "/api/admin/delete-post",
  ADMIN_UPDATE_POST: "/api/admin/update-post",
  ADMIN_LOGIN: "/api/admin/login",
  ADMIN_LOGOUT: "/api/admin/logout"
} as const;

export const AUDIT_ACTION = {
  CREATE: "create",
  UPDATE: "update",
  DELETE: "delete",
  LOGIN: "login",
  INVALIDATE_SESSIONS: "invalidate_sessions",
  HEALTH: "health",
  SAVE_DRAFT: "save_draft",
  PUBLISH: "publish",
  SCHEDULE: "schedule",
  ROLLBACK: "rollback",
  ARCHIVE: "archive"
} as const;
