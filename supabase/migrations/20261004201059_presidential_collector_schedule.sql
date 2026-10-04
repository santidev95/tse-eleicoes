create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

-- Generate the collector credential inside Postgres. Never return its plaintext.
do $$
declare token text;
begin
  select decrypted_secret into token from vault.decrypted_secrets where name='tse_collector_token';
  if token is null then
    token := gen_random_uuid()::text || gen_random_uuid()::text;
    perform vault.create_secret(token, 'tse_collector_token', 'Opaque credential for TSE collector');
  end if;
  insert into tse_private.collector_credentials(token_hash)
  values(encode(sha256(convert_to(token,'UTF8')),'hex')) on conflict do nothing;
end;
$$;

create function tse_private.invoke_collection(p_environment text default 'oficial')
returns bigint language plpgsql security invoker set search_path = '' as $$
declare project_url text; token text; request_id bigint;
begin
  if p_environment not in ('oficial','simulado2026') then raise exception 'Invalid environment'; end if;
  select decrypted_secret into project_url from vault.decrypted_secrets where name='tse_project_url';
  select decrypted_secret into token from vault.decrypted_secrets where name='tse_collector_token';
  if project_url is null or token is null then raise exception 'Collector configuration missing'; end if;
  select net.http_post(
    url := project_url || '/functions/v1/tse-collect',
    headers := jsonb_build_object('Content-Type','application/json','x-collector-token',token),
    body := jsonb_build_object('environment',p_environment),
    timeout_milliseconds := 120000
  ) into request_id;
  return request_id;
end;
$$;
revoke all on function tse_private.invoke_collection(text) from public, anon, authenticated, service_role;
-- The postgres-owned cron job invokes this function. Enable the job only after the first successful collection.
