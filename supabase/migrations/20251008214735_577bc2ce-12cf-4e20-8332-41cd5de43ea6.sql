-- Add was_auto_closed column to bathroom_passes table
ALTER TABLE public.bathroom_passes 
ADD COLUMN IF NOT EXISTS was_auto_closed BOOLEAN NOT NULL DEFAULT FALSE;

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Schedule the auto-close-passes function to run every 5 minutes
SELECT cron.schedule(
  'auto-close-passes-job',
  '*/5 * * * *',
  $$
  SELECT
    net.http_post(
        url:='https://jgicbewohdubulzdcuat.supabase.co/functions/v1/auto-close-passes',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpnaWNiZXdvaGR1YnVsemRjdWF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA5NTE3NjEsImV4cCI6MjA2NjUyNzc2MX0.kwhtihc5L_942UOWI7a7KUkA7n3UU-VvdAn2si8Hy_E"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$
);