# COMI Development Checklist (short form)

Full rules: [`DEVELOPMENT_WORKFLOW.md`](./DEVELOPMENT_WORKFLOW.md).

## Say the mode first

- `Mode: AUDIT` — for "look/check/analyze/investigate" requests. Read-only, no
  commit/push/deploy, ends in a recommendation only.
- `Mode: DELIVERY` + `Target delivery level: Local / Commit / Push / Production` —
  for "implement/fix/ship/deploy" requests.

## AUDIT mode

```
READ ONLY → FINDINGS → RISKS → RECOMMENDATION → STOP
```
End with: `Mode: AUDIT` / `Code modified: NO`.

## DELIVERY mode

```
SCOPE → INSPECT → IMPLEMENT → LOCAL VERIFY → DIFF REVIEW → COMMIT → PUSH → DEPLOY
      → PRODUCTION VERIFY → FINAL REPORT
```

- Default target (unless user says "local only"): Code → Commit → Push → Deploy →
  Production Verify, all the way.
- `git status` + `git branch` before touching anything; keep pre-existing diff out of
  this task's commit.
- Typecheck / Lint / Build + task-specific functional test — report each separately.
- `git diff` review before commit: no debug code, no secrets, no `.env.local`, no
  unrelated files, correct repo.
- Never write real account data for testing — use participants `P01`–`P04`; never let
  `BERRY_OWNER_ID` / real Supabase service role be touched by a test path.
- Clean up any test data written; confirm real account data unchanged.
- Never call something "done" without hitting the level the user asked for. Missing
  step → write `NO` / `❌`, not "basically done."

## Final report (Delivery)

```
## Delivery Status
- Code / Typecheck / Lint / Build / Functional Test: ✅ or ❌
- Commit: ✅/❌ (hash, message)
- Push: ✅/❌
- Production Deploy: ✅/❌ (URL)
- Production Verify: ✅/❌
- Test Data Cleaned: ✅/N/A/❌
- Real Account Unchanged: ✅/N/A/❌

### Remaining Issues
```
