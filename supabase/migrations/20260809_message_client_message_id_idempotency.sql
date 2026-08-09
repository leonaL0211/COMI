begin;

alter table public.messages
  add column if not exists client_message_id text null;

create unique index if not exists messages_user_client_message_id_key
  on public.messages (owner_id, conversation_id, role, client_message_id);

commit;
