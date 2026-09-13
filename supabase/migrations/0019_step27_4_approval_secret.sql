-- Migration: 0019_step27_4_approval_secret.sql
-- Description: Add approval_secret column to login_requests for 1-tap Telegram URL approval redirect

ALTER TABLE public.login_requests ADD COLUMN IF NOT EXISTS approval_secret TEXT;
