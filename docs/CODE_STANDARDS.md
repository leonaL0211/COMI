# Berry Chat v2 Code Standards

## Scope Discipline

- Implement only the current phase.
- Do not add features from later phases while touching nearby code.
- Do not add new npm dependencies unless a future task explicitly approves them.
- Do not copy Berry Chat v1 wholesale.
- Do not modify, format, install dependencies in, or write to Berry Chat v1.
- Do not commit changes unless explicitly requested.

## Next.js Structure

- `page.tsx` files compose screens and should not contain chat business logic.
- API route handlers validate input, enforce permission boundaries, call services, and shape responses.
- Route handlers should generally stay below 150 lines.
- Keep server-only behavior out of client components.
- Keep provider, repository, summary, and memory logic behind their assigned server modules.

## Frontend Structure

- Split frontend code by feature: chat, conversations, memory, settings, and Clawd.
- Use `components/` for reusable UI building blocks that are not owned by one feature.
- Avoid giant global components.
- Ordinary components should generally stay below 250 lines.
- Components over 300 lines must be evaluated for splitting.
- Prefer React built-in state for Phase 1.
- Evaluate Zustand only when a specific state-sharing need appears.

## Server Structure

- Centralize model calls in provider adapters.
- Centralize database access in repositories.
- Keep chat orchestration in chat services.
- Keep summary behavior in summary services.
- Keep long-term memory behavior in memory services.
- Avoid leaking provider-specific or database-specific details into UI code.

## Duplication and Abstraction

- Do not copy and paste the same business logic across modules.
- Extract shared behavior only when it removes real duplication or clarifies a boundary.
- Prefer small, named pure helpers for repeated transformations.
- Avoid speculative abstractions for features that are not in the active phase.

## Verification

- After each phase, run at least one project verification command: lint, typecheck, or build.
- Before finalizing a change, run the verification requested by the task.
- For this project, use `npm run build` when a full Next.js verification is requested.
- Run `git diff --check` before reporting completion when requested.

## Documentation

- Keep product scope, architecture, roadmap, and code standards current when product decisions change.
- Document boundaries and exclusions clearly so later implementation work does not drift.
- Roadmap documents plan future phases but must not be treated as permission to implement them early.
