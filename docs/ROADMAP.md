# Berry Chat v2 Roadmap

This roadmap is planning only. Do not implement code from later phases while working on an earlier phase.

## Phase 0: Documentation and Engineering Rules

- Confirm v2 is an independent Next.js project.
- Create project scope, architecture, roadmap, and code standards documents.
- Establish boundaries against Berry Chat v1.
- Run project verification after documentation changes.

## Phase 1: Minimal Non-Streaming Chat

- Implement the smallest usable non-streaming chat flow.
- Keep chat orchestration outside `page.tsx`.
- Keep provider-specific calls behind a provider adapter.
- Do not add persistence, memory, summary, themes, Clawd, or deferred features in this phase.

## Phase 2: Supabase Conversation and Message Persistence

- Add conversation storage.
- Add message storage.
- Introduce repository boundaries for database access.
- Keep API routes thin and service-oriented.

## Phase 3: Automatic Summary

- Add summary service.
- Store and update conversation summaries.
- Define when summaries are created or refreshed.
- Keep summary behavior separate from chat provider adapters.

## Phase 4: Long-Term Memory Library

- Add memory service.
- Add memory repository behavior.
- Define memory creation, update, deletion, and retrieval policy.
- Keep memory explainable and user-controllable.

## Phase 5: Backup, Import, and Migration

- Add export and backup format.
- Add restore/import flow.
- Add migration handling for future data format changes.
- Treat data safety and reversibility as primary requirements.

## Phase 6: Three Themes and Overall UI

- Implement milk tea, strawberry bavarois, and night sakura themes.
- Build the transparent, open chat interface.
- Add top and bottom fading glass areas without obvious hard dividers.
- Add reusable spring Popover menu component.

## Phase 7: Clawd

- Add Clawd desktop pet as a companion layer.
- Keep Clawd lightweight and non-disruptive.
- Avoid making Clawd responsible for core chat behavior.

## Phase 8: Stability, Testing, and Deployment

- Harden error handling and empty states.
- Add focused tests around service boundaries and critical flows.
- Run lint, typecheck, and build.
- Prepare deployment configuration and release checklist.
