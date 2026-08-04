begin;

create or replace function public.import_berry_chat_backup_v1(
  p_owner_id uuid,
  p_payload jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_conversations_inserted integer := 0;
  v_conversations_skipped integer := 0;
  v_messages_inserted integer := 0;
  v_messages_skipped integer := 0;
  v_summaries_inserted integer := 0;
  v_summaries_skipped integer := 0;
  v_memories_inserted integer := 0;
  v_memories_skipped integer := 0;
begin
  -- Berry Chat Backup v1 exposes timestamps through JavaScript Date.toISOString(),
  -- so equality checks intentionally ignore PostgreSQL sub-millisecond precision.
  if p_owner_id is null then
    raise exception using
      errcode = 'PBR01',
      message = 'BERRY_BACKUP_INVALID_REFERENCE';
  end if;

  if jsonb_typeof(p_payload) is distinct from 'object'
    or jsonb_typeof(p_payload #> '{data,conversations}') is distinct from 'array'
    or jsonb_typeof(p_payload #> '{data,messages}') is distinct from 'array'
    or jsonb_typeof(p_payload #> '{data,summaries}') is distinct from 'array'
    or jsonb_typeof(p_payload #> '{data,memories}') is distinct from 'array'
  then
    raise exception using
      errcode = 'PBR01',
      message = 'BERRY_BACKUP_INVALID_REFERENCE';
  end if;

  if exists (
    with incoming as (
      select *
      from jsonb_to_recordset(p_payload #> '{data,conversations}')
        as c(
          id uuid,
          title text,
          "createdAt" timestamptz,
          "updatedAt" timestamptz,
          "lastMessageAt" timestamptz
        )
    )
    select 1
    from incoming c
    where c.id is null
      or c.title is null
      or c."createdAt" is null
      or c."updatedAt" is null
      or char_length(btrim(c.title)) not between 1 and 160
  ) then
    raise exception using
      errcode = 'PBR01',
      message = 'BERRY_BACKUP_INVALID_REFERENCE';
  end if;

  if exists (
    with incoming as (
      select *
      from jsonb_to_recordset(p_payload #> '{data,conversations}')
        as c(id uuid)
    )
    select 1
    from incoming c
    group by c.id
    having count(*) > 1
  ) then
    raise exception using
      errcode = 'PBC01',
      message = 'BERRY_BACKUP_CONFLICT';
  end if;

  if exists (
    with incoming as (
      select *
      from jsonb_to_recordset(p_payload #> '{data,conversations}')
        as c(
          id uuid,
          title text,
          "createdAt" timestamptz,
          "updatedAt" timestamptz,
          "lastMessageAt" timestamptz
        )
    )
    select 1
    from incoming c
    join public.conversations existing on existing.id = c.id
    where existing.owner_id <> p_owner_id
      or existing.title is distinct from c.title
      or date_trunc('milliseconds', existing.created_at) is distinct from date_trunc('milliseconds', c."createdAt")
      or date_trunc('milliseconds', existing.updated_at) is distinct from date_trunc('milliseconds', c."updatedAt")
      or date_trunc('milliseconds', existing.last_message_at) is distinct from date_trunc('milliseconds', c."lastMessageAt")
  ) then
    raise exception using
      errcode = 'PBC01',
      message = 'BERRY_BACKUP_CONFLICT';
  end if;

  if exists (
    with incoming as (
      select *
      from jsonb_to_recordset(p_payload #> '{data,messages}')
        as m(
          id uuid,
          "conversationId" uuid,
          role text,
          content text,
          model text,
          "stopReason" text,
          "inputTokens" integer,
          "outputTokens" integer,
          "createdAt" timestamptz
        )
    )
    select 1
    from incoming m
    where m.id is null
      or m."conversationId" is null
      or m.role is null
      or m.content is null
      or m."createdAt" is null
      or m.role not in ('user', 'assistant')
      or char_length(btrim(m.content)) <= 0
      or (
        m."stopReason" is not null
        and m."stopReason" not in ('end_turn', 'max_tokens', 'unknown')
      )
      or (m."inputTokens" is not null and m."inputTokens" < 0)
      or (m."outputTokens" is not null and m."outputTokens" < 0)
  ) then
    raise exception using
      errcode = 'PBR01',
      message = 'BERRY_BACKUP_INVALID_REFERENCE';
  end if;

  if exists (
    with incoming as (
      select *
      from jsonb_to_recordset(p_payload #> '{data,messages}')
        as m(id uuid)
    )
    select 1
    from incoming m
    group by m.id
    having count(*) > 1
  ) then
    raise exception using
      errcode = 'PBC01',
      message = 'BERRY_BACKUP_CONFLICT';
  end if;

  if exists (
    with incoming as (
      select *
      from jsonb_to_recordset(p_payload #> '{data,messages}')
        as m(
          id uuid,
          "conversationId" uuid,
          role text,
          content text,
          model text,
          "stopReason" text,
          "inputTokens" integer,
          "outputTokens" integer,
          "createdAt" timestamptz
        )
    )
    select 1
    from incoming m
    join public.messages existing on existing.id = m.id
    where existing.owner_id <> p_owner_id
      or existing.conversation_id is distinct from m."conversationId"
      or existing.role is distinct from m.role
      or existing.content is distinct from m.content
      or existing.model is distinct from m.model
      or existing.stop_reason is distinct from m."stopReason"
      or existing.input_tokens is distinct from m."inputTokens"
      or existing.output_tokens is distinct from m."outputTokens"
      or date_trunc('milliseconds', existing.created_at) is distinct from date_trunc('milliseconds', m."createdAt")
  ) then
    raise exception using
      errcode = 'PBC01',
      message = 'BERRY_BACKUP_CONFLICT';
  end if;

  if exists (
    with incoming_messages as (
      select *
      from jsonb_to_recordset(p_payload #> '{data,messages}')
        as m("conversationId" uuid)
    ),
    incoming_conversations as (
      select *
      from jsonb_to_recordset(p_payload #> '{data,conversations}')
        as c(id uuid)
    )
    select 1
    from incoming_messages m
    where not exists (
      select 1
      from incoming_conversations c
      where c.id = m."conversationId"
    )
      and not exists (
        select 1
        from public.conversations c
        where c.id = m."conversationId"
          and c.owner_id = p_owner_id
      )
  ) then
    raise exception using
      errcode = 'PBR01',
      message = 'BERRY_BACKUP_INVALID_REFERENCE';
  end if;

  if exists (
    with incoming_messages as (
      select *
      from jsonb_to_recordset(p_payload #> '{data,messages}')
        as m("conversationId" uuid)
    ),
    incoming_conversations as (
      select *
      from jsonb_to_recordset(p_payload #> '{data,conversations}')
        as c(id uuid)
    )
    select 1
    from incoming_messages m
    join public.conversations c on c.id = m."conversationId"
    where c.owner_id <> p_owner_id
      and not exists (
        select 1
        from incoming_conversations incoming
        where incoming.id = m."conversationId"
      )
  ) then
    raise exception using
      errcode = 'PBC01',
      message = 'BERRY_BACKUP_CONFLICT';
  end if;

  if exists (
    with incoming as (
      select *
      from jsonb_to_recordset(p_payload #> '{data,summaries}')
        as s(
          "conversationId" uuid,
          content text,
          "coveredThroughMessageId" uuid,
          "coveredMessageCount" integer,
          "createdAt" timestamptz,
          "updatedAt" timestamptz
        )
    )
    select 1
    from incoming s
    where s."conversationId" is null
      or s.content is null
      or s."coveredThroughMessageId" is null
      or s."coveredMessageCount" is null
      or s."createdAt" is null
      or s."updatedAt" is null
      or char_length(btrim(s.content)) <= 0
      or s."coveredMessageCount" <= 0
  ) then
    raise exception using
      errcode = 'PBR01',
      message = 'BERRY_BACKUP_INVALID_REFERENCE';
  end if;

  if exists (
    with incoming as (
      select *
      from jsonb_to_recordset(p_payload #> '{data,summaries}')
        as s("conversationId" uuid)
    )
    select 1
    from incoming s
    group by s."conversationId"
    having count(*) > 1
  ) then
    raise exception using
      errcode = 'PBC01',
      message = 'BERRY_BACKUP_CONFLICT';
  end if;

  if exists (
    with incoming as (
      select *
      from jsonb_to_recordset(p_payload #> '{data,summaries}')
        as s(
          "conversationId" uuid,
          content text,
          "coveredThroughMessageId" uuid,
          "coveredMessageCount" integer,
          "createdAt" timestamptz,
          "updatedAt" timestamptz
        )
    )
    select 1
    from incoming s
    join public.conversation_summaries existing
      on existing.conversation_id = s."conversationId"
    where existing.owner_id <> p_owner_id
      or existing.content is distinct from s.content
      or existing.covered_through_message_id is distinct from s."coveredThroughMessageId"
      or existing.covered_message_count is distinct from s."coveredMessageCount"
      or date_trunc('milliseconds', existing.created_at) is distinct from date_trunc('milliseconds', s."createdAt")
      or date_trunc('milliseconds', existing.updated_at) is distinct from date_trunc('milliseconds', s."updatedAt")
  ) then
    raise exception using
      errcode = 'PBC01',
      message = 'BERRY_BACKUP_CONFLICT';
  end if;

  if exists (
    with incoming_summaries as (
      select *
      from jsonb_to_recordset(p_payload #> '{data,summaries}')
        as s("conversationId" uuid)
    ),
    incoming_conversations as (
      select *
      from jsonb_to_recordset(p_payload #> '{data,conversations}')
        as c(id uuid)
    )
    select 1
    from incoming_summaries s
    where not exists (
      select 1
      from incoming_conversations c
      where c.id = s."conversationId"
    )
      and not exists (
        select 1
        from public.conversations c
        where c.id = s."conversationId"
          and c.owner_id = p_owner_id
      )
  ) then
    raise exception using
      errcode = 'PBR01',
      message = 'BERRY_BACKUP_INVALID_REFERENCE';
  end if;

  if exists (
    with incoming_summaries as (
      select *
      from jsonb_to_recordset(p_payload #> '{data,summaries}')
        as s(
          "conversationId" uuid,
          "coveredThroughMessageId" uuid
        )
    ),
    incoming_messages as (
      select *
      from jsonb_to_recordset(p_payload #> '{data,messages}')
        as m(id uuid, "conversationId" uuid)
    )
    select 1
    from incoming_summaries s
    where not exists (
      select 1
      from incoming_messages m
      where m.id = s."coveredThroughMessageId"
        and m."conversationId" = s."conversationId"
    )
      and not exists (
        select 1
        from public.messages m
        where m.id = s."coveredThroughMessageId"
          and m.conversation_id = s."conversationId"
          and m.owner_id = p_owner_id
      )
  ) then
    raise exception using
      errcode = 'PBR01',
      message = 'BERRY_BACKUP_INVALID_REFERENCE';
  end if;

  if exists (
    with incoming_summaries as (
      select *
      from jsonb_to_recordset(p_payload #> '{data,summaries}')
        as s(
          "conversationId" uuid,
          "coveredThroughMessageId" uuid
        )
    ),
    incoming_messages as (
      select *
      from jsonb_to_recordset(p_payload #> '{data,messages}')
        as m(id uuid)
    )
    select 1
    from incoming_summaries s
    join public.messages m on m.id = s."coveredThroughMessageId"
    where (
      m.owner_id <> p_owner_id
      or m.conversation_id <> s."conversationId"
    )
      and not exists (
        select 1
        from incoming_messages incoming
        where incoming.id = s."coveredThroughMessageId"
      )
  ) then
    raise exception using
      errcode = 'PBC01',
      message = 'BERRY_BACKUP_CONFLICT';
  end if;

  if exists (
    with incoming as (
      select *
      from jsonb_to_recordset(p_payload #> '{data,memories}')
        as m(
          id uuid,
          title text,
          content text,
          category text,
          importance smallint,
          source text,
          "isPinned" boolean,
          "createdAt" timestamptz,
          "updatedAt" timestamptz
        )
    )
    select 1
    from incoming m
    where m.id is null
      or m.title is null
      or m.content is null
      or m.category is null
      or m.importance is null
      or m.source is null
      or m."isPinned" is null
      or m."createdAt" is null
      or m."updatedAt" is null
      or char_length(btrim(m.title)) not between 1 and 160
      or char_length(btrim(m.content)) <= 0
      or char_length(m.content) > 2000
      or m.category not in (
        'general',
        'preference',
        'person',
        'project',
        'health',
        'routine',
        'other'
      )
      or m.importance not between 1 and 5
      or m.source not in ('auto', 'manual')
  ) then
    raise exception using
      errcode = 'PBR01',
      message = 'BERRY_BACKUP_INVALID_REFERENCE';
  end if;

  if exists (
    with incoming as (
      select *
      from jsonb_to_recordset(p_payload #> '{data,memories}')
        as m(id uuid)
    )
    select 1
    from incoming m
    group by m.id
    having count(*) > 1
  ) then
    raise exception using
      errcode = 'PBC01',
      message = 'BERRY_BACKUP_CONFLICT';
  end if;

  if exists (
    with incoming as (
      select *
      from jsonb_to_recordset(p_payload #> '{data,memories}')
        as m(
          id uuid,
          title text,
          content text,
          category text,
          importance smallint,
          source text,
          "isPinned" boolean,
          "createdAt" timestamptz,
          "updatedAt" timestamptz
        )
    )
    select 1
    from incoming m
    join public.memories existing on existing.id = m.id
    where existing.owner_id <> p_owner_id
      or existing.title is distinct from m.title
      or existing.content is distinct from m.content
      or existing.category is distinct from m.category
      or existing.importance is distinct from m.importance
      or existing.source is distinct from m.source
      or existing.is_pinned is distinct from m."isPinned"
      or date_trunc('milliseconds', existing.created_at) is distinct from date_trunc('milliseconds', m."createdAt")
      or date_trunc('milliseconds', existing.updated_at) is distinct from date_trunc('milliseconds', m."updatedAt")
  ) then
    raise exception using
      errcode = 'PBC01',
      message = 'BERRY_BACKUP_CONFLICT';
  end if;

  with incoming as (
    select *
    from jsonb_to_recordset(p_payload #> '{data,conversations}')
      as c(
        id uuid,
        title text,
        "createdAt" timestamptz,
        "updatedAt" timestamptz,
        "lastMessageAt" timestamptz
      )
  ),
  inserted as (
    insert into public.conversations (
      id,
      owner_id,
      title,
      created_at,
      updated_at,
      last_message_at
    )
    select
      c.id,
      p_owner_id,
      c.title,
      c."createdAt",
      c."updatedAt",
      c."lastMessageAt"
    from incoming c
    where not exists (
      select 1
      from public.conversations existing
      where existing.id = c.id
    )
    returning 1
  )
  select count(*) into v_conversations_inserted from inserted;

  v_conversations_skipped :=
    jsonb_array_length(p_payload #> '{data,conversations}')
    - v_conversations_inserted;

  with incoming as (
    select *
    from jsonb_to_recordset(p_payload #> '{data,messages}')
      as m(
        id uuid,
        "conversationId" uuid,
        role text,
        content text,
        model text,
        "stopReason" text,
        "inputTokens" integer,
        "outputTokens" integer,
        "createdAt" timestamptz
      )
  ),
  inserted as (
    insert into public.messages (
      id,
      owner_id,
      conversation_id,
      role,
      content,
      model,
      stop_reason,
      input_tokens,
      output_tokens,
      created_at
    )
    select
      m.id,
      p_owner_id,
      m."conversationId",
      m.role,
      m.content,
      m.model,
      m."stopReason",
      m."inputTokens",
      m."outputTokens",
      m."createdAt"
    from incoming m
    where not exists (
      select 1
      from public.messages existing
      where existing.id = m.id
    )
    returning 1
  )
  select count(*) into v_messages_inserted from inserted;

  v_messages_skipped :=
    jsonb_array_length(p_payload #> '{data,messages}')
    - v_messages_inserted;

  with incoming as (
    select *
    from jsonb_to_recordset(p_payload #> '{data,summaries}')
      as s(
        "conversationId" uuid,
        content text,
        "coveredThroughMessageId" uuid,
        "coveredMessageCount" integer,
        "createdAt" timestamptz,
        "updatedAt" timestamptz
      )
  ),
  inserted as (
    insert into public.conversation_summaries (
      conversation_id,
      owner_id,
      content,
      covered_through_message_id,
      covered_message_count,
      created_at,
      updated_at
    )
    select
      s."conversationId",
      p_owner_id,
      s.content,
      s."coveredThroughMessageId",
      s."coveredMessageCount",
      s."createdAt",
      s."updatedAt"
    from incoming s
    where not exists (
      select 1
      from public.conversation_summaries existing
      where existing.conversation_id = s."conversationId"
    )
    returning 1
  )
  select count(*) into v_summaries_inserted from inserted;

  v_summaries_skipped :=
    jsonb_array_length(p_payload #> '{data,summaries}')
    - v_summaries_inserted;

  with incoming as (
    select *
    from jsonb_to_recordset(p_payload #> '{data,memories}')
      as m(
        id uuid,
        title text,
        content text,
        category text,
        importance smallint,
        source text,
        "isPinned" boolean,
        "createdAt" timestamptz,
        "updatedAt" timestamptz
      )
  ),
  inserted as (
    insert into public.memories (
      id,
      owner_id,
      title,
      content,
      category,
      importance,
      source,
      is_pinned,
      created_at,
      updated_at
    )
    select
      m.id,
      p_owner_id,
      m.title,
      m.content,
      m.category,
      m.importance,
      m.source,
      m."isPinned",
      m."createdAt",
      m."updatedAt"
    from incoming m
    where not exists (
      select 1
      from public.memories existing
      where existing.id = m.id
    )
    returning 1
  )
  select count(*) into v_memories_inserted from inserted;

  v_memories_skipped :=
    jsonb_array_length(p_payload #> '{data,memories}')
    - v_memories_inserted;

  return jsonb_build_object(
    'conversations',
    jsonb_build_object('inserted', v_conversations_inserted, 'skipped', v_conversations_skipped),
    'messages',
    jsonb_build_object('inserted', v_messages_inserted, 'skipped', v_messages_skipped),
    'summaries',
    jsonb_build_object('inserted', v_summaries_inserted, 'skipped', v_summaries_skipped),
    'memories',
    jsonb_build_object('inserted', v_memories_inserted, 'skipped', v_memories_skipped)
  );
exception
  when raise_exception then
    raise;
  when unique_violation then
    raise exception using
      errcode = 'PBC01',
      message = 'BERRY_BACKUP_CONFLICT';
  when foreign_key_violation
    or check_violation
    or not_null_violation
    or invalid_text_representation
    or invalid_datetime_format
    or numeric_value_out_of_range
  then
    raise exception using
      errcode = 'PBR01',
      message = 'BERRY_BACKUP_INVALID_REFERENCE';
end;
$$;

revoke execute on function public.import_berry_chat_backup_v1(uuid, jsonb)
  from PUBLIC;
revoke execute on function public.import_berry_chat_backup_v1(uuid, jsonb)
  from anon;
revoke execute on function public.import_berry_chat_backup_v1(uuid, jsonb)
  from authenticated;
grant execute on function public.import_berry_chat_backup_v1(uuid, jsonb)
  to service_role;

commit;
