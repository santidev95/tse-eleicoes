-- Run as postgres after migrations and deployment. Replace the URL for a new project.
-- No collector token or service key needs to be copied into this script.
do $$
declare project_url text := 'https://YOUR_PROJECT.supabase.co';
begin
  if project_url !~ '^https://[a-z0-9]{20}\.supabase\.co$' then
    raise exception 'Set your project URL before bootstrapping';
  end if;
  if not exists(select 1 from vault.decrypted_secrets where name='tse_project_url') then
    perform vault.create_secret(project_url, 'tse_project_url', 'TSE project API URL');
  end if;
end;
$$;
select tse_private.invoke_collection('oficial');
-- Verify a successful first collection before enabling this recurring job:
-- select cron.schedule('tse-presidential-official', '* * * * *', $$select tse_private.invoke_collection('oficial');$$);
