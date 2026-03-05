# Dev Todo (Autonomous)

## Rules

- 每次开发先更新本清单，再执行。
- 不等待额外指令，按优先级从高到低连续推进。
- 每完成一个任务必须有可验证结果（命令输出或代码证据）。

## P0 (Current Sprint)

- [x] T1. 新增并维护统一代办清单（本文件）
  - 验收：`docs/dev-todo.md` 存在并持续更新
- [x] T2. 把 `delete-post` 路由接入统一 guard（同源+鉴权+标准错误）
  - 验收：无手写重复同源/鉴权分支
- [x] T3. 统一 `login` 路由常量与审计 route 字段来源
  - 验收：`ROUTE_PATH` 统一复用
- [x] T4. 清理剩余重复/冗余逻辑并保持行为不变
  - 验收：冗余分支删除且回归通过
- [x] T5. 运行全量回归（lint/tsc/build/release-drill）
  - 验收：四项命令全部通过
- [x] T6. 把 guard 继续覆盖到其余可复用入口
  - 验收：管理 API 核心路由统一 guard 化
- [x] T7. 新增静态架构检查脚本并接入 CI
  - 验收：`npm run check:architecture` 可执行，CI 已包含该步骤

## P1 (Next)

- [x] T8. 补强 `drill:api`：覆盖 `forbidden/unauthorized` 负向场景
  - 验收：脚本输出包含对应断言
- [x] T9. 统一审计动作枚举与路由映射表，消除散落字面量
  - 验收：主要 API 路由通过映射取值
- [x] T10. 管理页错误提示映射补充未知错误兜底 telemetry 标识
  - 验收：UI 显示统一 + 可追踪 code
- [x] T11. 发布流程加一条结构检查：`content/blog/.state` JSON schema 粗校验
  - 验收：脚本能识别损坏状态文件
- [x] T12. Runbook 增加“只读排障步骤”（不修改线上数据）
  - 验收：文档新增独立章节

## P2 (Backlog)

- [x] T13. 为 `publishing.ts` 核心分支补最小测试基线（脚本化）
  - 验收：`check:publishing` 覆盖 `rollback/not_found/schedule_invalid`，并校验 `release-drill` 回滚步骤
- [x] T14. 后台操作按钮增加幂等保护（防连点）
  - 验收：重复提交可被前后端任一层抑制
- [x] T15. 审计事件持久化策略设计（可选文件落盘）
  - 验收：方案文档 + 开关设计

## Done (Milestones)

- [x] M1. API 错误响应统一
- [x] M2. 请求上下文统一（requestId/durationMs）
- [x] M3. 管理 API guard 化第一阶段

## P3 (Hardening Queue)

- [x] T16. `admin/health` 输出补充审计持久化状态
  - 验收：`/api/admin/health` 返回 `audit.mode/filePath/lastError`
- [x] T17. 为 `admin-health` 增加结构回归脚本（字段存在性断言）
  - 验收：脚本可检测 `checks.auth/content_rw/write_probe/storage/audit`
- [x] T18. 为 `admin-diag` 增加关键字段回归脚本
  - 验收：脚本可检测 `health.summary + audit.mode + events` 基本结构
- [x] T19. `ops-runbook` 增加“审计落盘异常”排障手册
  - 验收：包含只读检查、恢复策略、风险说明
- [x] T20. 新增内容目录权限预检脚本（只读）
  - 验收：输出 `content/blog` 读写权限与错误码
- [x] T21. 补充 `check:architecture` 规则：关键管理路由必须走统一 guard
  - 验收：遗漏路由可被脚本检测失败
- [x] T22. 管理端表单错误码展示统一为可本地化 key
  - 验收：UI 不直接散落硬编码中文文案
- [x] T23. 后台列表页增加“最后操作 requestId”可见性（便于审计关联）
  - 验收：关键动作完成后可见 requestId
- [x] T24. 增加 `docs/release-checklist.md` 发布前核对清单
  - 验收：覆盖构建、演练、回滚、会话失效验证
- [x] T25. 建立最小 smoke 命令集合入口
  - 验收：单命令串起 lint/tsc/build/checks/drills

## P4 (Next Autonomous Batch)

- [x] T26. 为 `content-permissions-check` 增加 JSON 输出 schema 自校验
  - 验收：字段结构变化会导致脚本失败
- [x] T27. 增加 `check:routes-meta`：校验关键 route 的 `ROUTE_PATH` 常量引用
  - 验收：若出现硬编码路由字符串则失败
- [x] T28. `admin/posts` 系统状态卡片增加 audit 详情（mode + lastError 摘要）
  - 验收：页面可见审计模式与异常摘要
- [x] T29. 为 `publish-scheduled` 增加 HTML 场景回归断言
  - 验收：脚本可验证重定向并含 `rid`
- [x] T30. 登录页错误提示接入统一 notice 组件样式
  - 验收：登录与管理页 notice 视觉/结构一致
- [x] T31. 增加 `docs/admin-api-contract.md`（状态码/错误码/requestId 约定）
  - 验收：覆盖所有 admin API 端点的成功与失败结构
- [x] T32. 为 `admin-route-guard` 增加最小行为测试脚本
  - 验收：覆盖 same-origin 拒绝与未登录拒绝
- [x] T33. 增加“发布前配置检查”脚本（环境变量完整性）
  - 验收：缺失关键 env 时失败并给出明确提示

## P5 (Next Autonomous Batch)

- [x] T34. 为 `check:env` 增加 `ADMIN_WRITE_PASSWORD` 强度最低标准检查
  - 验收：弱口令时返回明确错误码
- [x] T35. 增加 `check:audit-file`：当配置 `ADMIN_AUDIT_FILE` 时校验父目录可写
  - 验收：目录不可写时失败并返回 errorCode
- [x] T36. `admin/posts` 系统状态卡片补充 `audit.filePath` 展示（脱敏）
  - 验收：文件模式下展示路径摘要，内存模式下显示 `memory`
- [x] T37. 为 `docs/admin-api-contract.md` 补充示例响应（success/error）
  - 验收：每类关键接口至少有一个 JSON 示例
- [x] T38. 新增 `check:todo-consistency` 校验任务状态与验收描述完整性
  - 验收：存在无验收项的任务时脚本失败
- [x] T39. 为 `publish-scheduled` 增加“零任务执行”审计字段断言脚本
  - 验收：`count=0` 场景仍返回 `requestId`
- [x] T40. 增加 `docs/incident-response.md`（401/403/429 高频告警处理）
  - 验收：覆盖触发条件、排查顺序、回滚策略
- [x] T41. 为 `admin-ui-shared` 增加 unknown telemetry code 结构检查
  - 验收：未知错误分支必须输出 `admin_posts_unknown_error:*`

## P6 (Next Autonomous Batch)

- [x] T42. 为 `admin-i18n` 增加 key 覆盖检查（避免遗漏文案 key）
  - 验收：关键映射表中不存在未注册 key
- [x] T43. 增加 `check:admin-redirect-rid`（关键 HTML 重定向必须带 `rid`）
  - 验收：`update/delete/publish-scheduled` 可被静态脚本断言
- [x] T44. 增加 `check:request-id-presence`（关键 JSON 成功响应含 `requestId`）
  - 验收：关键管理 API 缺失 requestId 时失败
- [x] T45. 为 `docs/incident-response.md` 增加值班升级阈值（SLO/SLA）
  - 验收：包含触发升级的量化阈值示例
- [x] T46. 新增 `check:docs-links`（README 对核心文档引用完整）
  - 验收：缺失文档链接时脚本失败
- [x] T47. 增加 `check:health-shape-runtime`（health 关键字段运行时探测）
  - 验收：脚本输出必须包含 `summary/checks/audit`
- [x] T48. 增加 `check:diag-shape-runtime`（diag 关键字段运行时探测）
  - 验收：脚本输出必须包含 `health/audit/events`

## P7 (Next Autonomous Batch)

- [x] T49. 为 `check:env` 增加 `NEXT_PUBLIC_SITE_URL` 与运行端口一致性提示
  - 验收：不一致时返回 warning 且不阻断
- [x] T50. 为 `check:smoke` 增加执行时长统计与慢步骤告警
  - 验收：输出每步耗时与总耗时
- [x] T51. 新增 `check:api-error-codes` 覆盖 guard/write/login 关键码
  - 验收：缺失预期 code 时脚本失败
- [x] T52. 为 `docs/admin-api-contract.md` 增加“兼容性约束”章节
  - 验收：明确 uppercase legacy code 的范围
- [x] T53. 新增 `check:runbook-commands`（runbook 命令可执行性静态校验）
  - 验收：命令拼写错误可被识别
- [x] T54. 增加 `check:ci-steps-order`（关键步骤顺序保护）
  - 验收：构建/检查/演练顺序变化时失败
- [x] T55. 为 `admin/posts` 增加审计状态 tooltip 文案 key
  - 验收：tooltip 文案不再硬编码

## P8 (Next Autonomous Batch)

- [x] T56. 为 `check:smoke` 增加 JSON 报告落盘（output/smoke-last.json）
  - 验收：每次运行后可读取最新报告文件
- [x] T57. 新增 `check:api-route-count` 防止关键 API 路由意外增减
  - 验收：路由数量异常时脚本失败
- [x] T58. 新增 `check:audit-action-coverage`（route 与 AUDIT_ACTION 映射完整）
  - 验收：关键 route 缺少 audit action 时失败
- [x] T59. 为 `docs/incident-response.md` 增加“演练记录模板”
  - 验收：包含时间线、影响范围、根因、改进项
- [x] T60. 新增 `check:docs-toc` 校验关键文档标题结构存在
  - 验收：缺失一级标题或关键章节时失败

## P9 (Next Autonomous Batch)

- [x] T61. 为 `check:smoke` 增加失败重试（仅 runtime 探测步骤）
  - 验收：`health/diag runtime` 失败时可重试 1 次
- [x] T62. 新增 `check:script-shebang` 校验所有脚本 shebang 一致
  - 验收：缺失 `#!/usr/bin/env node` 的脚本会失败
- [x] T63. 新增 `check:json-output` 统一校验脚本输出包含 `ok` 和时间戳
  - 验收：不合规脚本可被识别
- [x] T64. 为 `docs/release-checklist.md` 增加“发布后 10 分钟观察项”
  - 验收：包含错误率、响应时间、关键页面可用性
- [x] T65. 新增 `check:admin-pages-params` 校验关键页面 `searchParams` 类型字段
  - 验收：字段缺失/漂移时失败

## P10 (Next Autonomous Batch)

- [x] T66. 为 runtime 检查脚本增加端口冲突探测与随机端口回退
  - 验收：固定端口被占用时脚本不直接失败
- [x] T67. 新增 `check:smoke-report-schema` 校验 `output/smoke-last.json` 结构
  - 验收：缺失 `steps/durations/totalDurationMs` 时失败
- [x] T68. 新增 `check:doc-command-sync`（README/Runbook/Checklist 命令集合一致）
  - 验收：三份文档命令不一致时失败
- [x] T69. 为 `docs/admin-api-contract.md` 增加字段级兼容策略（新增字段仅向后兼容）
  - 验收：明确“可新增不可破坏”约束
- [x] T70. 新增 `check:admin-health-fields` 校验 health API 精简响应字段集
  - 验收：关键字段漂移时失败

## P11 (Next Autonomous Batch)

- [x] T71. 为 `check:doc-command-sync` 增加允许名单（文档特有命令）
  - 验收：减少合法差异造成的误报
- [x] T72. 为 `check:json-output` 增加字段白名单（避免过宽匹配）
  - 验收：脚本输出规范更严格且可维护
- [x] T73. 新增 `check:output-artifacts` 校验 `output/` 关键产物存在
  - 验收：`smoke-last.json` 与诊断输出可被识别
- [x] T74. 为 `docs/release-checklist.md` 增加“回滚后验证项”
  - 验收：包含页面/API/审计三类验证
- [x] T75. 新增 `check:admin-page-links` 校验 admin 页面关键跳转链接
  - 验收：缺失 `/admin/posts`、`/admin/new` 等入口时报错

## P12 (Next Autonomous Batch)

- [x] T76. 为 `check:output-artifacts` 增加文件大小与更新时间阈值检查
  - 验收：过旧或空文件被标记失败
- [x] T77. 为 `check:ci-steps-order` 增加分组顺序约束（lint/type/build/check/drill）
  - 验收：跨分组顺序错乱时失败
- [x] T78. 新增 `check:docs-version-stamp`（关键文档更新日期戳）
  - 验收：缺失日期戳时给出 warning
- [x] T79. 新增 `check:admin-route-meta-usage`（关键 route 均使用 `API_ROUTE_PATH`）
  - 验收：硬编码 route path 被识别
- [x] T80. 为 `docs/incident-response.md` 增加“复盘模板”
  - 验收：包含事实、决策、行动项、owner

## P13 (Next Autonomous Batch)

- [x] T81. 为 `check:docs-version-stamp` 增加“距今天数”警告阈值（默认 30 天）
  - 验收：超阈值时输出 warning 但不阻断
- [x] T82. 新增 `check:release-checklist-coverage`（清单包含所有 `check:*` 核心脚本）
  - 验收：遗漏关键检查命令时失败
- [x] T83. 为 `check:output-artifacts` 增加 `--strict` 模式（可选检查更多产物）
  - 验收：`OUTPUT_ARTIFACT_STRICT=1` 时启用扩展校验
- [x] T84. 为 `check:smoke` 增加失败步骤摘要文件 `output/smoke-failures.json`
  - 验收：任一步骤失败时可读取失败摘要
- [x] T85. 为 `docs/release-checklist.md` 增加“值班交接确认项”
  - 验收：包含 owner、回执时间、监控看板链接

## P14 (Next Autonomous Batch)

- [x] T86. 为 `check:output-artifacts` 增加 smoke 失败摘要产物校验（存在即校验 schema）
  - 验收：`output/smoke-failures.json` 结构漂移可被识别
- [x] T87. 新增 `check:smoke-step-order`（smoke 步骤与 CI 检查集合一致）
  - 验收：缺失/顺序漂移时失败
- [x] T88. 为 `docs/ops-runbook.md` 增加“受限环境变量矩阵”章节
  - 验收：包含 `DRILL_ALLOW_SKIP/SMOKE_ALLOW_BUILD_SKIP` 触发条件
- [x] T89. 为 `check:doc-command-sync` 增加“重复命令计数”warning
  - 验收：重复命令不会失败但会提示
- [x] T90. 为 `check:release-checklist-coverage` 增加排除规则文档化
  - 验收：`check:smoke` 排除原因在文档中可见

## P15 (Next Autonomous Batch)

- [x] T91. 为 `check:smoke-step-order` 增加 `npx` 步骤白名单（防未来工具链命令误报）
  - 验收：允许配置白名单且默认行为不变
- [x] T92. 为 `check:output-artifacts` 增加 `strictMissingAsWarning` 选项
  - 验收：在本地环境下可降级 strict 文件缺失为 warning
- [x] T93. 新增 `check:runbook-matrix-sync`（Runbook 变量矩阵与脚本 env 开关一致）
  - 验收：文档遗漏开关时失败
- [x] T94. 为 `docs/incident-response.md` 增加“跨团队沟通模板”
  - 验收：包含受影响范围、状态页文案、下一次更新时间
- [x] T95. 为 `check:smoke-report-schema` 增加 `slowStepWarnings` 字段类型断言
  - 验收：字段类型漂移可识别

## P16 (Next Autonomous Batch)

- [ ] T96. 为 `check:doc-command-sync` 增加 README 重复命令阈值（超阈值失败）
  - 验收：避免 README 命令区块无上限复制
- [ ] T97. 为 `check:output-artifacts` 增加 `artifactClass` 分类输出（required/optional/strict）
  - 验收：输出中可直接区分产物等级
- [ ] T98. 新增 `check:incident-template-sections`（事故模板章节完整性）
  - 验收：缺失 drill/postmortem/communication 模板时报错
- [ ] T99. 为 `check:smoke-step-order` 增加 drill 顺序单独断言（api 优先于 release）
  - 验收：drill 顺序漂移时给出精确错误
- [ ] T100. 为 `docs/ops-runbook.md` 增加“本地验证最小命令集”章节
  - 验收：包含 5 条内可完成基础回归
