-- Cleanup script for the n=4 exploratory test (participants P01-P04).
--
-- NOT run automatically by any code path. Run this manually in the
-- Supabase SQL editor (or via `psql`) only after the test is finished.
--
-- Scope: deletes rows ONLY under the four dedicated test owner_ids from
-- server/auth/participants.ts. It never touches the real BERRY_OWNER_ID
-- account, and it is safe to re-run (deleting already-gone rows is a
-- no-op).
--
-- Before running: double check these four UUIDs match
-- server/auth/participants.ts exactly. If that file's UUIDs ever change,
-- update this script to match before running it.

-- Optional: eyeball how much would be deleted before actually deleting.
-- Run this SELECT by itself first if you want to check.
--
-- select
--   owner_id,
--   (select count(*) from public.conversations c where c.owner_id = o.owner_id) as conversations,
--   (select count(*) from public.messages m where m.owner_id = o.owner_id) as messages,
--   (select count(*) from public.memories mm where mm.owner_id = o.owner_id) as memories,
--   (select count(*) from public.conversation_summaries s where s.owner_id = o.owner_id) as summaries
-- from (values
--   ('a1e5b6b0-0d1a-4a1a-9c3a-000000000001'::uuid), -- P01
--   ('a1e5b6b0-0d1a-4a1a-9c3a-000000000002'::uuid), -- P02
--   ('a1e5b6b0-0d1a-4a1a-9c3a-000000000003'::uuid), -- P03
--   ('a1e5b6b0-0d1a-4a1a-9c3a-000000000004'::uuid)  -- P04
-- ) as o(owner_id);

begin;

-- messages and conversation_summaries reference conversations via
-- foreign keys with `on delete cascade`, so deleting conversations also
-- removes their messages/summaries. memories has no such relationship
-- and is deleted separately.

delete from public.conversations
where owner_id in (
  'a1e5b6b0-0d1a-4a1a-9c3a-000000000001', -- P01
  'a1e5b6b0-0d1a-4a1a-9c3a-000000000002', -- P02
  'a1e5b6b0-0d1a-4a1a-9c3a-000000000003', -- P03
  'a1e5b6b0-0d1a-4a1a-9c3a-000000000004'  -- P04
);

delete from public.memories
where owner_id in (
  'a1e5b6b0-0d1a-4a1a-9c3a-000000000001', -- P01
  'a1e5b6b0-0d1a-4a1a-9c3a-000000000002', -- P02
  'a1e5b6b0-0d1a-4a1a-9c3a-000000000003', -- P03
  'a1e5b6b0-0d1a-4a1a-9c3a-000000000004'  -- P04
);

commit;
