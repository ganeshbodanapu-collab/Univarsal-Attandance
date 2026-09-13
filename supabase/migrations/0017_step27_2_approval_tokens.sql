-- Migration: 0017_step27_2_approval_tokens.sql
-- Description: Create login_approval_tokens table for secure short-lived single-use deep link approval tokens

CREATE TABLE IF NOT EXISTS public.login_approval_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Unique index on token_hash to enforce token uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS idx_login_approval_tokens_hash ON public.login_approval_tokens(token_hash);

-- Index on request_id for fast lookup
CREATE INDEX IF NOT EXISTS idx_login_approval_tokens_req ON public.login_approval_tokens(request_id);

-- Enable RLS
ALTER TABLE public.login_approval_tokens ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Authenticated Admins can read approval tokens
CREATE POLICY "Admins can read approval tokens"
  ON public.login_approval_tokens
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.app_users
      WHERE auth_user_id = auth.uid() AND role = 'admin'
    )
  );
