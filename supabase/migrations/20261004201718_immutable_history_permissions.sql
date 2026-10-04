-- Version history is append-only for the runtime writer.
revoke update, delete on tse_private.file_versions, tse_private.snapshots, tse_private.collection_runs from service_role;
revoke insert, update, delete on tse_private.collector_credentials from service_role;
