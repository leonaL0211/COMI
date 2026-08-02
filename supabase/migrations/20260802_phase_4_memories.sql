begin;

create table public.memories (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text not null,
  content text not null,
  category text not null default 'general',
  importance smallint not null default 3,
  source text not null,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint memories_title_length_check
    check (char_length(btrim(title)) between 1 and 160),
  constraint memories_content_not_empty_check
    check (char_length(btrim(content)) > 0),
  constraint memories_content_length_check
    check (char_length(content) <= 2000),
  constraint memories_category_check
    check (
      category in (
        'general',
        'preference',
        'person',
        'project',
        'health',
        'routine',
        'other'
      )
    ),
  constraint memories_importance_check
    check (importance between 1 and 5),
  constraint memories_source_check
    check (source in ('auto', 'manual'))
);

create index memories_owner_priority_idx
  on public.memories (
    owner_id,
    is_pinned desc,
    importance desc,
    updated_at desc
  );

alter table public.memories enable row level security;

revoke select, insert, update, delete on public.memories from anon;
revoke select, insert, update, delete on public.memories from authenticated;

grant select, insert, update, delete on public.memories to service_role;

commit;
