const ZH_MESSAGES = {
  "admin.write.slug_conflict": "保存失败：Slug 已存在，请修改后重试。",
  "admin.write.write_conflict": "保存失败：同一文章正在被其他请求写入，请稍后重试。",
  "admin.write.invalid_slug": "保存失败：Slug 非法，仅支持小写字母、数字与连字符。",
  "admin.write.invalid_date": "保存失败：日期格式非法。",
  "admin.write.missing_required": "保存失败：请补全必填字段且正文不能为空。",
  "admin.write.invalid_action": "保存失败：不支持的操作。",
  "admin.write.schedule_invalid": "保存失败：计划发布时间必须是未来时间。",
  "admin.write.revision_not_found": "保存失败：目标历史版本不存在。",
  "admin.write.publish_failed": "保存失败：请检查输入后重试。",
  "admin.write.not_found": "保存失败：原文章不存在。",
  "admin.write.forbidden": "保存失败：请求来源不合法。",
  "admin.write.unauthorized": "保存失败：登录状态失效，请重新登录。",
  "admin.posts.success.deleted": "删除成功。",
  "admin.posts.success.updated": "保存成功。",
  "admin.posts.success.scheduled_run": "计划发布已执行。",
  "admin.posts.success.sessions_invalidated": "会话已全部失效。",
  "admin.posts.error.delete_failed": "删除失败：请稍后重试。",
  "admin.posts.error.unknown": "操作失败，请稍后重试。",
  "admin.posts.audit.tooltip.ok": "审计状态正常，可追踪最近管理操作。",
  "admin.posts.audit.tooltip.warn": "审计状态告警，请检查落盘配置与错误日志。",
  "admin.posts.audit.tooltip.error": "审计状态异常，建议立即执行排障流程。",
  "admin.login.error.invalid_password": "密码错误，请重试。",
  "admin.login.error.missing_password": "请先在服务端配置 ADMIN_WRITE_PASSWORD。",
  "admin.login.error.rate_limited": "尝试过于频繁，请在 {retry_after} 秒后重试。",
  "admin.login.error.rate_limited_fallback": "尝试过于频繁，请稍后重试。",
  "admin.login.error.unknown": "登录失败，请稍后重试。",
  "admin.login.warn.missing_password_config": "未配置 ADMIN_WRITE_PASSWORD，当前无法登录管理后台。",
  "admin.login.warn.session_invalidated": "所有会话已失效，请重新登录。"
} as const;

export type AdminMessageKey = keyof typeof ZH_MESSAGES;

export function tAdmin(key: AdminMessageKey, vars?: Record<string, string | number>): string {
  const template = ZH_MESSAGES[key];
  if (!vars) return template;
  return template.replace(/\{([a-z0-9_]+)\}/gi, (_, name: string) => {
    const value = vars[name];
    if (value === undefined || value === null) return "";
    return String(value);
  });
}
