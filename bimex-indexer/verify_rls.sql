-- verify_rls.sql
-- ⚠️  EJECUTAR SOLO EN ENTORNO DE PRUEBA.
-- En producción, el INSERT de prueba queda registrado permanentemente
-- en el audit log (no se puede borrar por las RLS).
-- Para testear en producción usar el rol 'postgres' en una DB de staging.
--
-- Run this script to verify that the Audit Log table correctly enforces immutability via Row Level Security (RLS).

-- 1. Insert a test record (Should succeed because INSERT is allowed)
INSERT INTO audit_log (action, actor_address, target, block_time) 
VALUES ('test_action', 'G_TEST_ACTOR', 'test_target', now());

-- 2. Try to update the record (Should FAIL / Return 0 rows updated)
UPDATE audit_log SET action = 'tampered_action' WHERE action = 'test_action';

-- 3. Try to delete the record (Should FAIL / Return 0 rows deleted)
DELETE FROM audit_log WHERE action = 'test_action';

-- 4. Select to verify the record is unchanged
SELECT * FROM audit_log WHERE action = 'test_action';

-- 5. Try to INSERT as the public API roles (anon / authenticated).
--    Should FAIL: only the indexer's service_role may write (see #301).
--    The frontend ships the anon key in its JS bundle, so a permissive insert
--    policy would let any visitor forge "admin approved project X" entries.
SET ROLE anon;
DO $$
BEGIN
  INSERT INTO audit_log (action, actor_address, target, block_time)
  VALUES ('forged_by_anon', 'G_ATTACKER', 'victim_project', now());
  RAISE EXCEPTION 'SECURITY REGRESSION: anon was able to insert into audit_log';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'OK: anon insert into audit_log correctly rejected (%).', SQLERRM;
END $$;
RESET ROLE;

-- Confirm the forged row never landed.
SELECT count(*) AS forged_rows FROM audit_log WHERE action = 'forged_by_anon';

-- ─────────────────────────────────────────────────────────────────────────────
-- Correct policy (as defined in schema.sql):
--
--   alter table audit_log enable row level security;
--   create policy "Allow public read" on audit_log for select using (true);
--   create policy "Only service role can insert" on audit_log
--     for insert to service_role with check (true);
--   revoke insert, update, delete on audit_log from anon, authenticated;
--   -- no update/delete policies => update/delete denied for every non-superuser role
--
-- Expected behavior:
--   * SELECT  — succeeds for anon/authenticated/service_role (public transparency).
--   * INSERT  — succeeds only for service_role (the indexer); anon/authenticated denied.
--   * UPDATE  — 0 rows for every non-superuser role (no policy).
--   * DELETE  — 0 rows for every non-superuser role (no policy).
--
-- If executed as a superuser (postgres), RLS is bypassed. Test as anon /
-- authenticated / service_role to see the real behavior.
