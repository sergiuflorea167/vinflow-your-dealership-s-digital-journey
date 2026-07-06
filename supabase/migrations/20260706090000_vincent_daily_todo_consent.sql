-- Täglicher, unveränderlicher Nachweis für den transparenten VINcent-Datenhinweis.

CREATE TABLE public.vincent_notice_acceptances (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  notice_version text NOT NULL,
  accepted_local_date date NOT NULL,
  timezone text NOT NULL,
  accepted_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY (user_id, accepted_local_date, notice_version)
);

CREATE INDEX vincent_notice_acceptances_org_date_idx
  ON public.vincent_notice_acceptances (organization_id, accepted_local_date DESC);

ALTER TABLE public.vincent_notice_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "VINcent-Hinweisannahmen: eigene lesen"
ON public.vincent_notice_acceptances FOR SELECT TO authenticated
USING (user_id = auth.uid() AND organization_id = public.get_user_org(auth.uid()));

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
  local_date date;
BEGIN
  IF current_user_id IS NULL THEN RETURN false; END IF;
  IF char_length(_notice_version) NOT BETWEEN 1 AND 100 THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = _timezone) THEN RETURN false; END IF;

  current_org_id := public.get_user_org(current_user_id);
  IF current_org_id IS NULL THEN RETURN false; END IF;
  local_date := (clock_timestamp() AT TIME ZONE _timezone)::date;

  INSERT INTO public.vincent_notice_acceptances (
    user_id, organization_id, notice_version, accepted_local_date, timezone
  ) VALUES (
    current_user_id, current_org_id, _notice_version, local_date, _timezone
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
  local_date date;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = _timezone) THEN RETURN false; END IF;
  local_date := (statement_timestamp() AT TIME ZONE _timezone)::date;

  RETURN EXISTS (
    SELECT 1
    FROM public.vincent_notice_acceptances AS acceptance
    WHERE acceptance.user_id = auth.uid()
      AND acceptance.organization_id = public.get_user_org(auth.uid())
      AND acceptance.notice_version = _notice_version
      AND acceptance.accepted_local_date = local_date
  );
END;
$$;

REVOKE ALL ON public.vincent_notice_acceptances FROM anon, authenticated;
GRANT SELECT ON public.vincent_notice_acceptances TO authenticated;
REVOKE EXECUTE ON FUNCTION public.acknowledge_vincent_notice(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.acknowledge_vincent_notice(text, text) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.has_vincent_notice_acceptance(text, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.has_vincent_notice_acceptance(text, text) TO authenticated;
