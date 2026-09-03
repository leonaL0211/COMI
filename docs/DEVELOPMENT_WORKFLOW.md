# COMI Development Workflow

This document is the standing operating procedure for every development task in this
repository (the real COMI product, formerly Berry Chat v2). It exists to prevent a
specific recurring failure: work is finished locally but never committed, pushed, or
deployed, and gets reported (or assumed) as "done" / "live" anyway.

This file is referenced from [`CLAUDE.md`](../CLAUDE.md), which Claude Code loads
automatically at the start of every session in this repo. Claude must follow this
workflow for all development work here unless the user explicitly overrides a step in
the current request.

See [`DEVELOPMENT_CHECKLIST.md`](./DEVELOPMENT_CHECKLIST.md) for the condensed version.

---

## 0. Every task starts with a Mode declaration

Before doing anything else, state:

```
Mode: AUDIT
```
or
```
Mode: DELIVERY
```

If `DELIVERY`, also state the target delivery level:

```
Target delivery level: Local / Commit / Push / Production
```

---

## 1. Mode A — AUDIT (read-only)

Triggers (examples, Chinese or English): "帮我看看" / "查一下" / "分析一下" /
"判断有没有问题" / "先排查" / "先确认现状" / "look into" / "investigate" / "check
whether".

Fixed flow:

```
READ ONLY → FINDINGS → RISKS → RECOMMENDATION → STOP
```

Rules:

- No code changes, no `git add`/`commit`, no `git push`, no deploy.
- If a problem is found, report it — do not fix it in the same turn.
- Every AUDIT response ends with:
  ```
  Mode: AUDIT
  Code modified: NO
  ```

---

## 2. Mode B — DELIVERY

Triggers (examples): "实施" / "修改" / "修复" / "做掉" / "上线" / "部署" / "完成某功能"
/ "implement" / "fix" / "ship" / "deploy" / "finish this feature".

Fixed flow:

```
SCOPE → INSPECT → IMPLEMENT → LOCAL VERIFY → DIFF REVIEW → COMMIT → PUSH → DEPLOY
      → PRODUCTION VERIFY → FINAL REPORT
```

### 2.1 SCOPE

State explicitly, before touching anything:

- What this task will change.
- What this task will NOT change.
- Whether schema changes are allowed.
- Whether API changes are allowed.
- Whether real data may be touched.
- Whether production deploy is in scope.
- Whether commit + push are in scope.
- Whether production verification is required.

**Default when the user has not said "只在本地改，不要 commit / push / deploy":**
for any task phrased as "implement / fix / ship / finish", the default target level is
the full chain — commit, push, deploy, production verification. "Done locally" is never
treated as equivalent to "done."

### 2.2 INSPECT

Before writing code:

- Run `git status` and `git branch --show-current`.
- Separate pre-existing uncommitted diff (not from this task) from new changes this
  task will introduce. Never fold unrelated pre-existing diff into this task's commit
  or attribute it to this task's verification.
- Trace the real call chain / data flow before editing.
- Reuse existing capabilities; do not rebuild something that already exists (see
  "Capabilities To Preserve" in `CLAUDE.md`).
- If scope risk, real-data risk, or schema risk appears, stop and report before
  proceeding.

### 2.3 IMPLEMENT

- Minimal diff for the stated scope only.
- No incidental refactors, no scope creep, no unrequested features.
- Do not change already-verified behavior.
- Do not touch database schema or production env vars without explicit approval.
- Never print secrets or API keys.
- Any write against real user data must be minimized and have a stated recovery plan
  before it happens (see §4 Real-account protection).

### 2.4 LOCAL VERIFY

Run, at minimum, after every change:

- Typecheck (`npx tsc --noEmit`)
- Lint
- Build (`npm run build`)

Plus functional test/cases directly tied to this task's change.

Report these as **separate, explicitly labeled results** — never collapse into one
"tests passed":

- Code check (typecheck/lint/build): pass/fail
- Local functional verification: pass/fail
- Real API verification (if applicable): pass/fail
- Production verification (if applicable): pass/fail

If real Supabase data was written to verify something:

- Record exactly what was written (table, ids, participant).
- Clean up / restore after verification.
- Confirm the real account's data count/content is unchanged afterward.

### 2.5 DIFF REVIEW

Before committing, check `git diff` and `git status` and confirm:

- No leftover debug code.
- No unrelated files touched.
- No secrets.
- No test/debug junk data or debug config.
- No accidental changes in another repo (this workspace sits next to
  `comi-portfolio` — verify you are in the intended repo/directory).
- No `.env.local` or other secret file staged.
- Only this task's changes are staged — pre-existing unrelated diff found in
  INSPECT stays out of the commit unless the user asked for it to be included.

### 2.6 COMMIT

Default: commit, unless the user explicitly said not to.

- Concise, readable commit message.
- Only the verified changes from this task.
- If the task bundled two clearly distinct features, split into two commits.

Report:

- commit hash
- commit message

If no commit was made, state `Commit: NO` explicitly — never report "done."

### 2.7 PUSH

Default: push, unless the user explicitly said "only local, don't push."

Confirm after pushing:

- push succeeded
- correct branch
- correct remote

If no push, state `Push: NO` explicitly. Never say "delivered" or "live" without a push
when push was in scope.

### 2.8 DEPLOY

If production is tied to Git/Vercel auto-deploy:

- After push, confirm whether a deployment was actually triggered.
- `push` is never assumed to mean "live" — check deployment status.

If a manual deploy step is required, run it and record the deployment/production URL.

If not deployed, state `Production: NO` explicitly.

### 2.9 PRODUCTION VERIFY

Required whenever the task's goal is "usable in production" or "ready for a user to
test."

- Local pass ≠ production pass.
- Dev server pass ≠ production pass.
- Preview pass ≠ production pass.

Re-verify the core path directly on the production URL, especially when the change
touches: login, Memory, About Me, testUser/participants, API routes, Vercel env,
data isolation.

If real accounts are involved, prefer a test participant, avoid polluting real data,
and clean up test data afterward.

---

## 3. COMI-specific rules

### 3.1 Real-account protection

The real COMI account uses `BERRY_OWNER_ID`, an access code, and the Supabase service
role. No test mechanism may fall back to the real account.

Test participants: `P01`, `P02`, `P03`, `P04`.

Must hold at all times:

- Participant data is isolated from other participants.
- Regular/real account data is isolated from participant data.
- An invalid `testUser` value must never resolve into the real account.
- Test accounts must never reach real Backup data.

### 3.2 Data / capability-status honesty

The portfolio's stated capability status (IMPLEMENTED / DESIGNED / EXPLORATION, in the
`comi-portfolio` repo) must match what the real product actually does.

Any change here that affects one of those statuses must be flagged in the final report
as "portfolio description may need to be updated," so the user can decide.

Never adjust real product behavior or claims to make the portfolio narrative look
better.

### 3.3 Memory

- Do not rewrite existing memory extraction logic casually.
- Do not change the memory schema without explicit approval.
- Reuse existing operations first: create, update, dedupe, ignore, edit, delete.
- Confirm current real behavior before changing anything memory-related.

### 3.4 Test data

Any real Supabase testing must:

- Prefer a test participant over any real identity.
- Write the minimum data needed to verify.
- Clean up afterward.
- End with an explicit confirmation that the real account's data volume/content is
  unchanged.

---

## 4. Definition of Done

"Done" means the task reached the delivery level the user actually asked for this
round — not just "code compiles locally."

Default Definition of Done when the user asked to "implement/fix this" without saying
"local only":

```
Code             ✅
Local Test       ✅
Commit           ✅
Push             ✅
Production Deploy ✅
Production Verify ✅
```

If any item is missing, the task is not "done" — report it as incomplete with the
specific missing item(s).

---

## 5. Final report format (Delivery Mode)

Every Delivery task ends with exactly this block:

```
## Delivery Status

- Code: ✅ / ❌
- Typecheck: ✅ / ❌
- Lint: ✅ / ❌
- Build: ✅ / ❌
- Functional Test: ✅ / ❌
- Commit: ✅ / ❌
  - hash:
  - message:
- Push: ✅ / ❌
- Production Deploy: ✅ / ❌
  - URL:
- Production Verify: ✅ / ❌
- Test Data Cleaned: ✅ / N/A / ❌
- Real Account Unchanged: ✅ / N/A / ❌

### Remaining Issues
<only what is genuinely not done yet>
```

Any item not completed must be written as `NO` / `❌` explicitly. Vague phrasing
("basically done", "should be live") is not acceptable in place of this block.

---

## 6. Relationship to other project rules

This workflow governs *process* (when to commit/push/deploy/verify, how to report).
It does not relax the product-safety rules already in `CLAUDE.md` — capability
preservation, the "do not touch without approval" list, and the UI/API/schema
boundaries there still apply in full. Where this workflow's default ("commit + push
unless told otherwise") differs from an older blanket "don't commit without asking"
note elsewhere in the repo, this document is the current source of truth for Delivery
Mode process; `CLAUDE.md` has been updated to point here instead of carrying a
conflicting rule.
