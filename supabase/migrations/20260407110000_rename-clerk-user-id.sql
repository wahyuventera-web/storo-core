-- Rename clerk_user_id → user_id in clients table
-- Column was originally named for Clerk auth; now using Supabase Auth

ALTER TABLE public.clients RENAME COLUMN clerk_user_id TO user_id;
