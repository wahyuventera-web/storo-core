-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Schedule auto-generate blog to run daily at 9:00 AM UTC (4:00 PM WIB)
SELECT cron.schedule(
  'auto-generate-blog-daily',
  '0 9 * * *',
  $$
  SELECT net.http_post(
    url:='https://wfthvovlhphnrodrqxqt.supabase.co/functions/v1/generate-blog',
    headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmdGh2b3ZsaHBobnJvZHJxeHF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTU1NjYsImV4cCI6MjA3MzgzMTU2Nn0.cXHWZbabCY93LbzgCgle9lVOW407MPV4jrtw1BuPkHo"}'::jsonb,
    body:='{}'::jsonb
  ) as request_id;
  $$
);