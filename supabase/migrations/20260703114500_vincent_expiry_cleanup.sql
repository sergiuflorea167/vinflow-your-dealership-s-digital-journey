-- Abgelaufene Vincent-Chats werden unabhängig von einer erneuten Anmeldung
-- serverseitig entfernt; Nachrichten folgen per ON DELETE CASCADE.
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.schedule(
  'vincent-expired-chat-cleanup',
  '17 * * * *',
  $$DELETE FROM public.vincent_conversations WHERE expires_at <= now()$$
);
