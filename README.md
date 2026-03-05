# My Blog

Last Updated: 2026-03-05

Next.js 14 + App Router + MDX 博客，支持后台管理（登录、发布、编辑、删除、搜索筛选分页）。

## Environment

在项目根目录创建 `.env.production`（或 `.env.local`）：

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.com
ADMIN_WRITE_PASSWORD=your-strong-password
# 可选：启用审计日志文件落盘（JSONL）
# ADMIN_AUDIT_FILE=/absolute/path/to/admin-audit.log
```

## Local Development

```bash
npm install
npm run dev
```

访问：
- 前台：`/blog`
- 管理登录：`/admin`
- 管理列表：`/admin/posts`
- 新建文章：`/admin/new`

## Production (Node)

```bash
npm install --omit=dev
npm run build
npm run start
```

## PM2

```bash
npm install --omit=dev
npm run build
pm2 start npm --name my-blog -- start
pm2 save
pm2 startup
```

## Short Deploy Commands

```bash
git pull
npm install --omit=dev
npm run build
pm2 restart my-blog
```

## 发布体系 v1

- 工作流：`保存草稿 -> 立即发布 / 计划发布 -> 回滚历史 revision`
- 管理入口：
  - 新建：`/admin/new`
  - 编辑/回滚：`/admin/edit/[slug]`
  - 列表筛选与计划任务执行：`/admin/posts`
- 自动输出：
  - `sitemap.xml`（仅 published 文章）
  - `rss.xml`（仅 published 文章）

生产建议顺序：
1. `npm run lint && npx tsc --noEmit && npm run build`
2. `npm run check:architecture`
3. `npm run check:state`
4. `npm run check:publishing`
5. `npm run check:admin-health`
6. `npm run check:admin-diag`
7. `npm run check:content-permissions`
8. `npm run check:routes-meta`
9. `npm run check:admin-route-meta-usage`
10. `npm run check:publish-scheduled-html`
11. `npm run check:publish-scheduled-zero`
12. `npm run check:route-guard`
13. `npm run check:env`
14. `npm run check:audit-file`
15. `npm run check:todo-consistency`
16. `npm run check:admin-ui-telemetry`
17. `npm run check:admin-i18n-coverage`
18. `npm run check:admin-redirect-rid`
19. `npm run check:request-id-presence`
20. `npm run check:docs-links`
21. `npm run check:api-error-codes`
22. `npm run check:runbook-commands`
23. `npm run check:runbook-matrix-sync`
24. `npm run check:ci-steps-order`
25. `npm run check:smoke-step-order`
26. `npm run check:api-route-count`
27. `npm run check:audit-action-coverage`
28. `npm run check:docs-toc`
29. `npm run check:script-shebang`
30. `npm run check:json-output`
31. `npm run check:admin-pages-params`
32. `npm run check:smoke-report-schema`
33. `npm run check:doc-command-sync`
34. `npm run check:admin-health-fields`
35. `npm run check:output-artifacts`
36. `npm run check:admin-page-links`
37. `npm run check:docs-version-stamp`
38. `npm run check:release-checklist-coverage`
39. `npm run check:health-shape-runtime`
40. `npm run check:diag-shape-runtime`
41. `npm run drill:release`
42. `npm run drill:api`
43. 正式发布与巡检

一键 smoke：
- `npm run check:smoke`

受限环境（例如无法拉起监听端口或禁止子进程）可临时使用：
- `DRILL_ALLOW_SKIP=1 npm run check:publishing`
- `DRILL_ALLOW_SKIP=1 npm run drill:api`

## CI

已内置 GitHub Actions 工作流：`.github/workflows/ci.yml`

自动执行：
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`
- `npm run check:architecture`
- `npm run check:state`
- `npm run check:publishing`
- `npm run check:admin-health`
- `npm run check:admin-diag`
- `npm run check:content-permissions`
- `npm run check:routes-meta`
- `npm run check:publish-scheduled-html`
- `npm run check:publish-scheduled-zero`
- `npm run check:route-guard`
- `npm run check:env`
- `npm run check:audit-file`
- `npm run check:todo-consistency`
- `npm run check:admin-ui-telemetry`
- `npm run check:admin-i18n-coverage`
- `npm run check:admin-redirect-rid`
- `npm run check:request-id-presence`
- `npm run check:docs-links`
- `npm run check:health-shape-runtime`
- `npm run check:diag-shape-runtime`
- `npm run check:api-error-codes`
- `npm run check:runbook-commands`
- `npm run check:runbook-matrix-sync`
- `npm run check:ci-steps-order`
- `npm run check:smoke-step-order`
- `npm run check:api-route-count`
- `npm run check:audit-action-coverage`
- `npm run check:docs-toc`
- `npm run check:script-shebang`
- `npm run check:json-output`
- `npm run check:admin-pages-params`
- `npm run check:smoke-report-schema`
- `npm run check:doc-command-sync`
- `npm run check:admin-health-fields`
- `npm run check:output-artifacts`
- `npm run check:admin-page-links`
- `npm run check:admin-route-meta-usage`
- `npm run check:docs-version-stamp`
- `npm run check:release-checklist-coverage`
- `npm run drill:api`
- `npm run drill:release`

## Ops Runbook

运维与回滚流程见：
- `docs/ops-runbook.md`
- `docs/release-checklist.md`
- `docs/admin-api-contract.md`
- `docs/incident-response.md`
