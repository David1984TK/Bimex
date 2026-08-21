-- Fix: audit_log insert policy is open to anon/authenticated
--
-- Problem: "Allow insert only" on audit_log has no TO clause, so it applies
-- to PUBLIC (anon + authenticated). Anyone with the anon key (publicly
-- embedded in client bundles) can INSERT fake audit entries via the
-- Supabase REST API, fabricating "admin approved project X" records in
-- what is presented as a public transparency log.
--
-- The indexer uses SUPABASE_KEY (should be service_role, not anon) to
-- write audit entries. service_role bypasses RLS entirely, so this
-- policy was never needed for the stated purpose.
--
-- Fix: scope to service_role. The read policy remains open (audit log
-- is public transparency data).

-- Drop the mis-scoped insert policy
DROP POLICY IF EXISTS "Allow insert only" ON audit_log;

-- Re-create scoped to service_role only
CREATE POLICY "Allow service_role insert" ON audit_log
  FOR INSERT TO service_role
  WITH CHECK (true);
