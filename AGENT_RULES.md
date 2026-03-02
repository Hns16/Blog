# AGENT_RULES.md

## 0. Core Principle

This project prioritizes:

1. Token efficiency
2. Minimal output
3. Strict engineering discipline
4. Maintainability
5. Controlled extensibility
6. Avoiding over-engineering

If any instruction conflicts with these principles, follow this file.

---

## 1. Output Policy (Mandatory)

Unless explicitly requested otherwise:

- Output must be minimal.
- No explanations.
- No reasoning.
- No summaries.
- No duplicated code.
- No restating unchanged files.
- No conversational text.
- No decorative formatting.

Only output:

- Modified file list
- Full final code of modified files
- Deleted file/dir list (if any)
- Required status indicators (if asked)

If diff is sufficient, prefer diff over full file.

Never output analysis process.

### Output Size Control

1. Never output large full-file code unless strictly necessary.
2. If modification is small, output unified diff only.
3. If change affects less than 30% of a file, use diff.
4. Do not regenerate entire files for minor edits.
5. Avoid long code blocks when structural summary is sufficient.
6. Prioritize minimal textual change representation.
7. Excessive code output is considered a rule violation.

---

## 2. Architecture Discipline

Follow strict layered minimalism:

Allowed structure pattern:

- app (routing only)
- src/lib (domain logic)
- src/types (types only)
- content (data)
- minimal config files

Rules:

1. Do not introduce new abstraction layers unless explicitly required.
2. Do not add adapter/source/query layers without multi-source need.
3. Do not create empty folders.
4. Do not scaffold future features.
5. Do not introduce new dependencies unless strictly necessary.
6. Prefer deletion over expansion.
7. Refactor only when measurable complexity signal exists.

Complexity scale (internal reference):
1 = minimal
2 = simple
3 = moderate
4 = layered
5 = over-engineered

Target range: 1–2.

---

## 3. Feature Development Rules

When implementing features:

1. Implement only the requested feature.
2. Avoid speculative extensibility.
3. Validate inputs strictly.
4. Fail fast on invalid data.
5. Keep data contracts explicit.
6. Keep functions pure where possible.
7. Minimize cross-module coupling.

---

## 4. Code Quality Rules

1. Strict TypeScript typing.
2. No any unless unavoidable.
3. Validate external input.
4. Deterministic sorting.
5. No hidden side effects.
6. No console noise.
7. No interactive CLI setup.

ESLint must be non-interactive.
Build must succeed without prompts.

---

## 5. Maintainability Constraints

Before adding structure, check:

- Is there duplication across 3+ places?
- Is there a second data source?
- Is team collaboration introduced?
- Is search/indexing introduced?

Only then consider structural evolution.

Otherwise: keep it flat.

---

## 6. Communication Contract

If prompt starts with:

[RULES]

You must strictly follow this file.
Do not restate these rules.

---
