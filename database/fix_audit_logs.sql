-- Fix for Audit Logs Relationship
-- This links audit_logs to profiles instead of directly to auth.users,
-- which allows Supabase/PostgREST to perform joins in queries.

ALTER TABLE audit_logs 
  DROP CONSTRAINT IF EXISTS audit_logs_user_id_fkey,
  ADD CONSTRAINT audit_logs_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
