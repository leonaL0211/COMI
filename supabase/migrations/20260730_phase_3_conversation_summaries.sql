begin;

alter table public.messages
  add constraint messages_id_conversation_owner_key
  unique (id, conversation_id, owner_id);

create table public.conversation_summaries (
  conversation_id uuid primary key,
  owner_id uuid not null,
  content text not null,
  covered_through_message_id uuid not null,
  covered_message_count integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversation_summaries_content_not_empty_check
    check (char_length(btrim(content)) > 0),
  constraint conversation_summaries_covered_count_check
    check (covered_message_count > 0),
  constraint conversation_summaries_conversation_owner_fk
    foreign key (conversation_id, owner_id)
    references public.conversations(id, owner_id)
    on delete cascade,
  constraint conversation_summaries_checkpoint_message_fk
    foreign key (
      covered_through_message_id,
      conversation_id,
      owner_id
    )
    references public.messages(
      id,
      conversation_id,
      owner_id
    )
    on delete cascade
);

alter table public.conversation_summaries enable row level security;

revoke select, insert, update, delete on public.conversation_summaries from anon;
revoke select, insert, update, delete on public.conversation_summaries from authenticated;

grant select, insert, update, delete on public.conversation_summaries to service_role;

commit;
