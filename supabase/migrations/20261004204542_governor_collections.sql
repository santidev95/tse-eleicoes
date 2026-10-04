-- Additive isolated governor storage. Existing presidential tables, functions and jobs are unchanged.
create table tse_private.governor_file_versions (
  id uuid primary key default gen_random_uuid(),
  environment text not null check (environment in ('oficial')),
  election_code text not null,
  scope text not null,
  generation_id text not null,
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  source_url text not null,
  generated_at timestamptz not null,
  totalized_at timestamptz,
  fetched_at timestamptz not null,
  etag text,
  last_modified text,
  payload jsonb not null,
  unique (environment, election_code, scope, generation_id, content_sha256)
);
create table tse_private.governor_snapshots (
  id uuid primary key default gen_random_uuid(),
  environment text not null,
  election_code text not null,
  content_sha256 text not null,
  collected_at timestamptz not null,
  adapter_version integer not null default 1,
  file_ids uuid[] not null,
  payload jsonb not null,
  unique (environment, election_code, content_sha256)
);
create table public.tse_governor_latest (
  environment text primary key check (environment in ('oficial')),
  election_code text not null,
  snapshot_id uuid not null references tse_private.governor_snapshots(id),
  snapshot jsonb not null,
  last_checked_at timestamptz not null,
  last_attempt_at timestamptz not null,
  last_error text
);
create index tse_governor_latest_snapshot_idx on public.tse_governor_latest(snapshot_id);
create table tse_private.governor_collector_state (
  environment text primary key check (environment in ('oficial')),
  lease_id uuid not null,
  leased_until timestamptz not null,
  next_allowed_at timestamptz not null default now()
);
create table tse_private.governor_collection_runs (
  id bigint generated always as identity primary key,
  environment text not null,
  attempted_at timestamptz not null default now(),
  outcome text not null check (outcome in ('stored', 'unchanged', 'error')),
  snapshot_id uuid references tse_private.governor_snapshots(id),
  error_message text
);
create index governor_runs_snapshot_idx on tse_private.governor_collection_runs(snapshot_id);
create index governor_runs_time_idx on tse_private.governor_collection_runs(environment, attempted_at desc);

alter table tse_private.governor_file_versions enable row level security;
alter table tse_private.governor_snapshots enable row level security;
alter table tse_private.governor_collector_state enable row level security;
alter table tse_private.governor_collection_runs enable row level security;
alter table public.tse_governor_latest enable row level security;
revoke all on tse_private.governor_file_versions, tse_private.governor_snapshots, tse_private.governor_collector_state, tse_private.governor_collection_runs from public, anon, authenticated;
grant select, insert, update on tse_private.governor_file_versions, tse_private.governor_snapshots, tse_private.governor_collector_state, tse_private.governor_collection_runs to service_role;
grant usage, select on sequence tse_private.governor_collection_runs_id_seq to service_role;
revoke all on public.tse_governor_latest from public, anon, authenticated;
grant select on public.tse_governor_latest to anon, authenticated;
grant select, insert, update on public.tse_governor_latest to service_role;
create policy tse_governor_latest_public_read on public.tse_governor_latest for select to anon, authenticated using (true);


create function public.tse_governor_claim_collection(p_environment text) returns uuid
language plpgsql security invoker set search_path = '' as $$
declare claimed uuid;
begin
  insert into tse_private.governor_collector_state(environment, lease_id, leased_until)
  values(p_environment, gen_random_uuid(), now() + interval '3 minutes')
  on conflict(environment) do update set lease_id = excluded.lease_id, leased_until = excluded.leased_until
    where tse_private.governor_collector_state.leased_until < now() and tse_private.governor_collector_state.next_allowed_at <= now()
  returning lease_id into claimed;
  return claimed;
end;
$$;

create function public.tse_governor_store_collection(p_environment text, p_lease uuid, p_files jsonb, p_snapshot jsonb, p_hash text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  election text := case p_environment when 'oficial' then '6259' end;
  phase text := case p_environment when 'oficial' then 'o' else 's' end;
  expected_source text := case p_environment when 'oficial' then 'tse' else 'tse-sim' end;
  item jsonb; file_id uuid; file_ids uuid[] := '{}'; snapshot_id uuid; previous_id uuid;
begin
  perform 1 from tse_private.governor_collector_state where environment = p_environment and lease_id = p_lease and leased_until > now() for update;
  if not found then raise exception 'Lease expired or invalid'; end if;
  if election is null or p_snapshot->>'source' is distinct from expected_source
    or p_snapshot->>'office' is distinct from 'governor'
    or p_snapshot->>'year' is distinct from '2026' or p_snapshot->>'round' is distinct from '1'
    or p_snapshot#>>'{upstream,electionCode}' is distinct from election
    or p_snapshot#>>'{upstream,environment}' is distinct from p_environment
    or jsonb_array_length(p_files) is distinct from 27
    or jsonb_array_length(p_snapshot->'states') is distinct from 27
    or (select count(distinct f->>'scope') from jsonb_array_elements(p_files) f) <> 27
    or p_hash !~ '^[0-9a-f]{64}$'
  then raise exception 'Invalid governor collection'; end if;
  for item in select value from jsonb_array_elements(p_files) loop
    if item#>>'{raw,ele}' is distinct from election or item#>>'{raw,f}' is distinct from phase
      or item#>>'{raw,t}' is distinct from '1'
      or item->>'scope' is distinct from item#>>'{raw,cdabr}'
      or jsonb_array_length(item#>'{raw,carg}') is distinct from 1
      or item#>>'{raw,carg,0,cd}' is distinct from '3'
      or not (item->>'scope' = any(array['ac','al','am','ap','ba','ce','df','es','go','ma','mg','ms','mt','pa','pb','pe','pi','pr','rj','rn','ro','rr','rs','sc','se','sp','to']))
    then raise exception 'Invalid source file'; end if;
    insert into tse_private.governor_file_versions(environment,election_code,scope,generation_id,content_sha256,source_url,generated_at,totalized_at,fetched_at,etag,last_modified,payload)
    values(p_environment,election,item->>'scope',item#>>'{raw,idg}',item->>'sha256',item->>'url',(item->>'generatedAt')::timestamptz,(item->>'totalizedAt')::timestamptz,(p_snapshot#>>'{upstream,fetchedAt}')::timestamptz,item->>'etag',item->>'modified',item->'raw')
    on conflict(environment,election_code,scope,generation_id,content_sha256) do nothing
    returning id into file_id;
    if file_id is null then
      select id into file_id from tse_private.governor_file_versions
      where environment=p_environment and election_code=election and scope=item->>'scope' and generation_id=item#>>'{raw,idg}' and content_sha256=item->>'sha256';
    end if;
    file_ids := array_append(file_ids, file_id);
  end loop;
  insert into tse_private.governor_snapshots(environment,election_code,content_sha256,collected_at,file_ids,payload)
  values(p_environment,election,p_hash,(p_snapshot#>>'{upstream,fetchedAt}')::timestamptz,file_ids,p_snapshot)
  on conflict(environment,election_code,content_sha256) do nothing returning id into snapshot_id;
  if snapshot_id is null then
    select id into snapshot_id from tse_private.governor_snapshots where environment=p_environment and election_code=election and content_sha256=p_hash;
  end if;
  select l.snapshot_id into previous_id from public.tse_governor_latest l where l.environment=p_environment;
  insert into public.tse_governor_latest(environment,election_code,snapshot_id,snapshot,last_checked_at,last_attempt_at)
  values(p_environment,election,snapshot_id,p_snapshot,now(),now())
  on conflict(environment) do update set snapshot_id=excluded.snapshot_id,snapshot=excluded.snapshot,last_checked_at=now(),last_attempt_at=now(),last_error=null;
  insert into tse_private.governor_collection_runs(environment,outcome,snapshot_id)
  values(p_environment,case when previous_id=snapshot_id then 'unchanged' else 'stored' end,snapshot_id);
  update tse_private.governor_collector_state set leased_until=now(),next_allowed_at=now()+interval '30 seconds' where environment=p_environment and lease_id=p_lease;
  return snapshot_id;
end;
$$;

create function public.tse_governor_fail_collection(p_environment text, p_lease uuid, p_error text, p_retry_seconds integer)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from tse_private.governor_collector_state where environment=p_environment and lease_id=p_lease for update;
  if not found then return; end if;
  insert into tse_private.governor_collection_runs(environment,outcome,error_message) values(p_environment,'error',left(p_error,500));
  update public.tse_governor_latest set last_attempt_at=now(),last_error=left(p_error,500) where environment=p_environment;
  update tse_private.governor_collector_state set leased_until=now(),next_allowed_at=now()+make_interval(secs=>greatest(30,least(p_retry_seconds,3600))) where environment=p_environment and lease_id=p_lease;
end;
$$;

revoke all on function public.tse_governor_claim_collection(text), public.tse_governor_store_collection(text,uuid,jsonb,jsonb,text), public.tse_governor_fail_collection(text,uuid,text,integer) from public, anon, authenticated;
grant execute on function public.tse_governor_claim_collection(text), public.tse_governor_store_collection(text,uuid,jsonb,jsonb,text), public.tse_governor_fail_collection(text,uuid,text,integer) to service_role;

revoke update on tse_private.governor_file_versions, tse_private.governor_snapshots, tse_private.governor_collection_runs from service_role;

create function tse_private.invoke_governor_collection(p_environment text default 'oficial')
returns bigint language plpgsql security invoker set search_path = '' as $$
declare project_url text; token text; request_id bigint;
begin
  if p_environment not in ('oficial') then raise exception 'Invalid environment'; end if;
  select decrypted_secret into project_url from vault.decrypted_secrets where name='tse_project_url';
  select decrypted_secret into token from vault.decrypted_secrets where name='tse_collector_token';
  if project_url is null or token is null then raise exception 'Collector configuration missing'; end if;
  select net.http_post(
    url := project_url || '/functions/v1/tse-governor-collect',
    headers := jsonb_build_object('Content-Type','application/json','x-collector-token',token),
    body := jsonb_build_object('environment',p_environment),
    timeout_milliseconds := 120000
  ) into request_id;
  return request_id;
end;
$$;
revoke all on function tse_private.invoke_governor_collection(text) from public, anon, authenticated, service_role;
-- The postgres-owned cron job invokes this function. Enable the job only after the first successful collection.
