begin;

create extension if not exists pgcrypto;

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  title text not null default '新对话',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_message_at timestamptz null,
  constraint conversations_title_length_check check (
    char_length(btrim(title)) between 1 and 160
  ),
  constraint conversations_id_owner_id_key unique (id, owner_id)
);

create index if not exists conversations_owner_last_message_at_idx
  on public.conversations (owner_id, last_message_at desc);

create index if not exists conversations_owner_updated_at_idx
  on public.conversations (owner_id, updated_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  conversation_id uuid not null,
  role text not null,
  content text not null,
  model text null,
  stop_reason text null check (
    stop_reason is null or stop_reason in ('end_turn', 'max_tokens', 'unknown')
  ),
  input_tokens integer null check (input_tokens is null or input_tokens >= 0),
  output_tokens integer null check (output_tokens is null or output_tokens >= 0),
  created_at timestamptz not null default now(),
  constraint messages_role_check
    check (role in ('user', 'assistant')),
  constraint messages_content_not_empty_check check (char_length(btrim(content)) > 0),
  constraint messages_conversation_owner_fk foreign key (conversation_id, owner_id)
    references public.conversations(id, owner_id)
    on delete cascade
);

create index if not exists messages_owner_conversation_created_at_idx
  on public.messages (owner_id, conversation_id, created_at asc);

create index if not exists messages_conversation_created_at_idx
  on public.messages (conversation_id, created_at asc);

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

revoke select, insert, update, delete on public.conversations from anon;
revoke select, insert, update, delete on public.conversations from authenticated;
revoke select, insert, update, delete on public.messages from anon;
revoke select, insert, update, delete on public.messages from authenticated;

grant select, insert, update, delete on public.conversations to service_role;
grant select, insert, update, delete on public.messages to service_role;

-- Phase 2A uses server-only access through a secret/service key.
-- Do not create anon or authenticated policies in this phase.

commit;
