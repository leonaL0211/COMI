# Berry Chat v2 Architecture

## Project Boundary

Berry Chat v2 is a new independent Next.js project.

Berry Chat v1 may be used only as read-only reference material. Do not modify, format, install dependencies in, copy wholesale from, or combine v1 and v2 into a shared workspace or monorepo.

## Current Project Check

The v2 project is expected to remain a standalone Next.js application with its own `package.json`, lockfile, configuration, source tree, and Git repository.

## Layering Principles

- `page.tsx` is responsible only for page composition and must not carry chat business logic.
- API routes perform parameter validation, permission boundaries, service calls, and response shaping.
- Model calls are centralized in provider adapters.
- Database operations are centralized in repositories.
- Summary, memory, and chat orchestration are implemented as separate services.
- Frontend code is split by feature instead of collected into oversized global components.
- Avoid complex state management up front. Phase 1 should prefer React built-in state; evaluate Zustand only when a concrete need appears.

## Suggested Directory Boundaries

```text
app/
features/chat/
features/conversations/
features/memory/
features/settings/
features/clawd/
server/chat/
server/providers/
server/repositories/
server/summary/
server/memory/
shared/
components/
docs/
supabase/
```

## Responsibilities

### App Routes

`app/` owns routing, layouts, and page-level composition. Route files should wire feature components together and stay thin.

### Features

`features/` owns user-facing flows grouped by product area. Feature modules may contain local components, hooks, types, and helpers when they are specific to that feature.

### Components

`components/` owns reusable UI building blocks that are not tied to one feature. The spring Popover menu belongs here once implemented.

### Server Services

`server/chat/` owns chat orchestration.

`server/providers/` owns AI provider adapters and hides provider-specific request and response formats.

`server/repositories/` owns database access.

`server/summary/` owns summary generation and summary update policy.

`server/memory/` owns long-term memory extraction, storage coordination, and retrieval policy.

### Shared

`shared/` owns cross-cutting types, constants, validation helpers, and pure utilities that are safe to use across frontend and server code.

### Supabase

`supabase/` owns database migrations, generated schema-related artifacts when needed, and Supabase project configuration.

## Engineering Guardrails

- Do not duplicate business logic through copy and paste.
- Keep ordinary components below 250 lines when practical.
- Components over 300 lines must be evaluated for splitting.
- Route handlers should stay below 150 lines when practical.
- Prefer explicit module boundaries over broad global helpers.
- Keep provider-specific behavior out of UI and route handlers.
- Keep persistence details out of UI and page composition.
- After each phase, run lint, typecheck, or build.
