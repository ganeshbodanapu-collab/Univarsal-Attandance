-- Migration: 0018_fix_approval_tokens_rls.sql
-- Description: Allow Admins full access (SELECT, INSERT, UPDATE, DELETE) on login_approval_tokens

DROP POLICY IF EXISTS "Admins can read approval tokens" ON public.login_approval_tokens;

CREATE POLICY "Admins can manage approval tokens"
  ON public.login_approval_tokens
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );
