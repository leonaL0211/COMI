# CLAUDE.md

## Project

COMI is an independent Personal Context AI product derived from BerryChat V2. Treat this directory as the active COMI product workspace, not as BerryChat V2.

## Development Workflow (read first, every task)

Full SOP: [`docs/DEVELOPMENT_WORKFLOW.md`](docs/DEVELOPMENT_WORKFLOW.md).
Short form: [`docs/DEVELOPMENT_CHECKLIST.md`](docs/DEVELOPMENT_CHECKLIST.md).

Every task in this repo starts by declaring a mode:

- **`Mode: AUDIT`** — for "帮我看看 / 查一下 / 分析一下 / look into / check whether"
  requests. Flow: `READ ONLY → FINDINGS → RISKS → RECOMMENDATION → STOP`. No code
  changes, no commit, no push, no deploy. Ends with `Mode: AUDIT` /
  `Code modified: NO`.
- **`Mode: DELIVERY`** — for "实施 / 修改 / 修复 / 上线 / 部署 / implement / fix / ship"
  requests. Flow: `SCOPE → INSPECT → IMPLEMENT → LOCAL VERIFY → DIFF REVIEW → COMMIT
  → PUSH → DEPLOY → PRODUCTION VERIFY → FINAL REPORT`. Unless the user says
  "local only, no commit/push/deploy," the default target is the full chain through
  production verification — local success alone is never reported as "done." Ends
  with the `## Delivery Status` block defined in `docs/DEVELOPMENT_WORKFLOW.md`.

This supersedes the old blanket "do not commit or push" line further below — see
`docs/DEVELOPMENT_WORKFLOW.md` §6 for how the two relate.

## Tech Stack

- Next.js App Router
- React
- TypeScript
- Supabase-backed persistence
- PWA assets and service worker
- CSS-driven COMI UI with theme variables

Common commands:

```powershell
npm.cmd ci
npm.cmd run build
npx.cmd tsc --noEmit
git diff --check
npm.cmd run dev
```

## Design Source of Truth

Figma: https://www.figma.com/design/eSZleodB2eXo4beQ1EhLpi/COMI-UI

The main mobile design baseline is 402 x 874. The UI must also support 375, 390, 402, and 430 px widths without horizontal overflow.

## Capabilities To Preserve

Do not break these existing capabilities:

- Chat and message state
- Existing streaming / non-streaming reply logic
- Multi-session conversations
- Memory
- File Knowledge Library
- Images and Sticker messages
- Model selection
- Clawd companion
- Theme persistence
- PWA behavior
- Supabase, OriginRouter, and current API integrations

## Areas UI Work Must Not Touch Without Explicit User Approval

- API routes
- Supabase schema or SQL
- Memory / Knowledge retrieval
- Chat request parameters
- Message persistence
- Service Worker behavior, unless the user specifically authorizes it

## Current UI State And Known Issues

- Claude mobile model selection uses a native transparent select over the visible pill and is clickable on iPhone. Preserve this unless the user explicitly asks otherwise.
- Composer still does not correctly stick to the bottom in iPhone Safari / PWA.
- Safe-area may be calculated in the wrong layer or more than once.
- Textarea focus currently shows a pink rectangular focus outline that is not in Figma.
- Day and Sakura Night themes exist and should not be redesigned from scratch.
- Future More menu work should be separate from Composer repair work.

## Recommended Strategy

- Do not rewrite the whole product.
- Locally rewrite or simplify only the Chat viewport, Composer dock, and safe-area layout when working on the iPhone Composer issue.
- Clean up repeated same-name CSS rules and establish one authoritative layout source.
- Keep native select for mobile model selection; desktop may use a custom Popover if implemented carefully.

## Working Rules

- Follow `docs/DEVELOPMENT_WORKFLOW.md` for commit/push/deploy defaults — in Delivery
  Mode, commit and push are the default unless the user says "local only"; in Audit
  Mode, never commit, push, or deploy.
- Do not execute SQL.
- Do not expand the change scope without user approval.
- Desktop responsive simulation is not a substitute for real iPhone Safari / PWA validation.
