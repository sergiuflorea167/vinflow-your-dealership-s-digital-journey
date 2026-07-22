-- VINcents Datenschutzhinweis deckt inzwischen deutlich mehr ab (KPIs, Bestands-,
-- Vorgangs- und Kalenderübersichten zusätzlich zur To-Do-Liste und Fahrzeugakte).
-- Damit Nutzer diesen umfangreicheren Hinweis nicht mehr jeden Kalendertag erneut
-- wegklicken müssen, gilt eine Bestätigung jetzt 7 Tage statt nur für den aktuellen
-- Tag. Der Hinweis bleibt davon unabhängig jederzeit über den bestehenden Button
-- im Chat einsehbar; nur die Pflicht zur erneuten Bestätigung wird auf 1x pro
-- Woche reduziert. has_vincent_notice_acceptance prüft daher ab sofort, ob eine
-- Bestätigung innerhalb der letzten 7 Tage vorliegt, statt nur für exakt heute.

CREATE OR REPLACE FUNCTION public.acknowledge_vincent_notice(
  _notice_version text,
  _timezone text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  current_org_id uuid;
  effective_timezone text := 'UTC';
  local_date date;
BEGIN
  IF current_user_id IS NULL THEN RETURN false; END IF;
  IF char_length(_notice_version) NOT BETWEEN 1 AND 100 THEN RETURN false; END IF;
  IF _timezone IS NOT NULL AND EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = _timezone) THEN
    effective_timezone := _timezone;
  END IF;

  current_org_id := public.get_user_org(current_user_id);
  IF current_org_id IS NULL THEN RETURN false; END IF;
  local_date := (clock_timestamp() AT TIME ZONE effective_timezone)::date;

  INSERT INTO public.vincent_notice_acceptances (
    user_id, organization_id, notice_version, accepted_local_date, timezone
  ) VALUES (
    current_user_id, current_org_id, _notice_version, local_date, effective_timezone
  ) ON CONFLICT (user_id, accepted_local_date, notice_version) DO NOTHING;

  INSERT INTO public.vincent_preferences (
    user_id, organization_id, notice_version, acknowledged_at
  ) VALUES (
    current_user_id, current_org_id, _notice_version, clock_timestamp()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    organization_id = EXCLUDED.organization_id,
    notice_version = EXCLUDED.notice_version,
    acknowledged_at = EXCLUDED.acknowledged_at;

  RETURN true;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_vincent_notice_acceptance(
  _notice_version text,
  _timezone text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  effective_timezone text := 'UTC';
  local_date date;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF _timezone IS NOT NULL AND EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = _timezone) THEN
    effective_timezone := _timezone;
  END IF;
  local_date := (statement_timestamp() AT TIME ZONE effective_timezone)::date;

  RETURN EXISTS (
    SELECT 1
    FROM public.vincent_notice_acceptances AS acceptance
    WHERE acceptance.user_id = auth.uid()
      AND acceptance.organization_id = public.get_user_org(auth.uid())
      AND acceptance.notice_version = _notice_version
      AND acceptance.accepted_local_date > local_date - 7
      AND acceptance.accepted_local_date <= local_date
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.acknowledge_vincent_notice(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.acknowledge_vincent_notice(text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.has_vincent_notice_acceptance(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_vincent_notice_acceptance(text, text) TO authenticated;
