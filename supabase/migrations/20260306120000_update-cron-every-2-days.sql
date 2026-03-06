-- Hapus cron job lama (daily-generate-blog)
-- Nama job: 'daily-generate-blog' dari migration sebelumnya
SELECT cron.unschedule('daily-generate-blog');

-- Buat cron job baru: generate blog setiap 2 hari jam 08:00 UTC (15:00 WIB)
-- Jadwal: menit 0, jam 8, setiap 2 hari (*/2), semua bulan, semua hari dalam minggu
SELECT cron.schedule(
  'auto-generate-blog-every-2-days',
  '0 8 */2 * *',
  $$
  SELECT net.http_post(
    url := 'https://wfthvovlhphnrodrqxqt.supabase.co/functions/v1/generate-blog',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndmdGh2b3ZsaHBobnJvZHJxeHF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgyNTU1NjYsImV4cCI6MjA3MzgzMTU2Nn0.cXHWZbabCY93LbzgCgle9lVOW407MPV4jrtw1BuPkHo"}'::jsonb,
    body := '{}'::jsonb
  ) AS request_id;
  $$
);
