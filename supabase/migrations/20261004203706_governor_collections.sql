-- Add office isolation while preserving all existing presidential history.
alter table tse_private.file_versions add column office text not null default 'president' check (office in ('president','governor'));
alter table tse_private.snapshots add column office text not null default 'president' check (office in ('president','governor'));
alter table public.tse_latest add column office text not null default 'president' check (office in ('president','governor'));
alter table tse_private.collector_state add column office text not null default 'president' check (office in ('president','governor'));
alter table tse_private.collection_runs add column office text not null default 'president' check (office in ('president','governor'));
alter table public.tse_latest drop constraint tse_latest_pkey;
alter table public.tse_latest add primary key(environment,office);
alter table tse_private.collector_state drop constraint collector_state_pkey;
alter table tse_private.collector_state add primary key(environment,office);
drop function public.tse_claim_collection(text);
drop function public.tse_store_collection(text,uuid,jsonb,jsonb,text);
drop function public.tse_fail_collection(text,uuid,text,integer);
create function public.tse_claim_collection(p_environment text, p_office text default 'president') returns uuid
language plpgsql security invoker set search_path = '' as $$
declare claimed uuid;
begin
  insert into tse_private.collector_state(environment,office, lease_id, leased_until)
  values(p_environment,p_office, gen_random_uuid(), now() + interval '3 minutes')
  on conflict(environment,office) do update set lease_id = excluded.lease_id, leased_until = excluded.leased_until
    where tse_private.collector_state.leased_until < now() and tse_private.collector_state.next_allowed_at <= now()
  returning lease_id into claimed;
  return claimed;
end;
$$;

create function public.tse_store_collection(p_environment text, p_lease uuid, p_files jsonb, p_snapshot jsonb, p_hash text, p_office text default 'president')
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  election text := case when p_office='governor' and p_environment='oficial' then '6259' when p_office='president' and p_environment='oficial' then '6257' when p_office='president' and p_environment='simulado2026' then '21270' end;
  phase text := case p_environment when 'oficial' then 'o' else 's' end;
  expected_source text := case p_environment when 'oficial' then 'tse' else 'tse-sim' end;
  item jsonb; file_id uuid; file_ids uuid[] := '{}'; snapshot_id uuid; previous_id uuid;
begin
  perform 1 from tse_private.collector_state where office=p_office and environment = p_environment and lease_id = p_lease and leased_until > now() for update;
  if not found then raise exception 'Lease expired or invalid'; end if;
  if election is null or p_snapshot->>'source' is distinct from expected_source
    or p_snapshot->>'office' is distinct from p_office
    or p_snapshot->>'year' is distinct from '2026' or p_snapshot->>'round' is distinct from '1'
    or p_snapshot#>>'{upstream,electionCode}' is distinct from election
    or p_snapshot#>>'{upstream,environment}' is distinct from p_environment
    or jsonb_array_length(p_files) is distinct from (case p_office when 'governor' then 27 else 28 end)
    or jsonb_array_length(p_snapshot->'states') is distinct from 27
    or (select count(distinct f->>'scope') from jsonb_array_elements(p_files) f) <> (case p_office when 'governor' then 27 else 28 end)
    or p_hash !~ '^[0-9a-f]{64}$'
  then raise exception 'Invalid presidential collection'; end if;
  for item in select value from jsonb_array_elements(p_files) loop
    if item#>>'{raw,ele}' is distinct from election or item#>>'{raw,f}' is distinct from phase
      or item#>>'{raw,t}' is distinct from '1'
      or item->>'scope' is distinct from item#>>'{raw,cdabr}'
      or (p_office='governor' and item->>'scope'='br')
      or jsonb_array_length(item#>'{raw,carg}') is distinct from 1
      or item#>>'{raw,carg,0,cd}' is distinct from (case p_office when 'governor' then '3' else '1' end)
      or not (item->>'scope' = any(array['br','ac','al','am','ap','ba','ce','df','es','go','ma','mg','ms','mt','pa','pb','pe','pi','pr','rj','rn','ro','rr','rs','sc','se','sp','to']))
    then raise exception 'Invalid source file'; end if;
    insert into tse_private.file_versions(environment,office,election_code,scope,generation_id,content_sha256,source_url,generated_at,totalized_at,fetched_at,etag,last_modified,payload)
    values(p_environment,p_office,election,item->>'scope',item#>>'{raw,idg}',item->>'sha256',item->>'url',(item->>'generatedAt')::timestamptz,(item->>'totalizedAt')::timestamptz,(p_snapshot#>>'{upstream,fetchedAt}')::timestamptz,item->>'etag',item->>'modified',item->'raw')
    on conflict(environment,election_code,scope,generation_id,content_sha256) do nothing
    returning id into file_id;
    if file_id is null then
      select id into file_id from tse_private.file_versions
      where office=p_office and environment=p_environment and election_code=election and scope=item->>'scope' and generation_id=item#>>'{raw,idg}' and content_sha256=item->>'sha256';
    end if;
    file_ids := array_append(file_ids, file_id);
  end loop;
  insert into tse_private.snapshots(environment,office,election_code,content_sha256,collected_at,file_ids,payload)
  values(p_environment,p_office,election,p_hash,(p_snapshot#>>'{upstream,fetchedAt}')::timestamptz,file_ids,p_snapshot)
  on conflict(environment,election_code,content_sha256) do nothing returning id into snapshot_id;
  if snapshot_id is null then
    select id into snapshot_id from tse_private.snapshots where office=p_office and environment=p_environment and election_code=election and content_sha256=p_hash;
  end if;
  select l.snapshot_id into previous_id from public.tse_latest l where l.office=p_office and l.environment=p_environment;
  insert into public.tse_latest(environment,office,election_code,snapshot_id,snapshot,last_checked_at,last_attempt_at)
  values(p_environment,p_office,election,snapshot_id,p_snapshot,now(),now())
  on conflict(environment,office) do update set snapshot_id=excluded.snapshot_id,snapshot=excluded.snapshot,last_checked_at=now(),last_attempt_at=now(),last_error=null;
  insert into tse_private.collection_runs(environment,office,outcome,snapshot_id)
  values(p_environment,p_office,case when previous_id=snapshot_id then 'unchanged' else 'stored' end,snapshot_id);
  update tse_private.collector_state set leased_until=now(),next_allowed_at=now()+interval '30 seconds' where office=p_office and environment=p_environment and lease_id=p_lease;
  return snapshot_id;
end;
$$;

create function public.tse_fail_collection(p_environment text, p_lease uuid, p_error text, p_retry_seconds integer, p_office text default 'president')
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from tse_private.collector_state where office=p_office and environment=p_environment and lease_id=p_lease for update;
  if not found then return; end if;
  insert into tse_private.collection_runs(environment,office,outcome,error_message) values(p_environment,p_office,'error',left(p_error,500));
  update public.tse_latest set last_attempt_at=now(),last_error=left(p_error,500) where office=p_office and environment=p_environment;
  update tse_private.collector_state set leased_until=now(),next_allowed_at=now()+make_interval(secs=>greatest(30,least(p_retry_seconds,3600))) where office=p_office and environment=p_environment and lease_id=p_lease;
end;
$$;

revoke all on function public.tse_authorize_collector(text), public.tse_claim_collection(text,text), public.tse_store_collection(text,uuid,jsonb,jsonb,text,text), public.tse_fail_collection(text,uuid,text,integer,text) from public, anon, authenticated;
grant execute on function public.tse_authorize_collector(text), public.tse_claim_collection(text,text), public.tse_store_collection(text,uuid,jsonb,jsonb,text,text), public.tse_fail_collection(text,uuid,text,integer,text) to service_role;

drop function tse_private.invoke_collection(text);
create function tse_private.invoke_collection(p_environment text default 'oficial', p_office text default 'president')
returns bigint language plpgsql security invoker set search_path = '' as $$
declare project_url text; token text; request_id bigint;
begin
  if p_office not in ('president','governor') or (p_office='governor' and p_environment<>'oficial') or p_environment not in ('oficial','simulado2026') then raise exception 'Invalid environment'; end if;
  select decrypted_secret into project_url from vault.decrypted_secrets where name='tse_project_url';
  select decrypted_secret into token from vault.decrypted_secrets where name='tse_collector_token';
  if project_url is null or token is null then raise exception 'Collector configuration missing'; end if;
  select net.http_post(
    url := project_url || '/functions/v1/tse-collect',
    headers := jsonb_build_object('Content-Type','application/json','x-collector-token',token),
    body := jsonb_build_object('environment',p_environment,'office',p_office),
    timeout_milliseconds := 120000
  ) into request_id;
  return request_id;
end;
$$;
revoke all on function tse_private.invoke_collection(text,text) from public, anon, authenticated, service_role;
-- The postgres-owned cron job invokes this function. Enable the job only after the first successful collection.
