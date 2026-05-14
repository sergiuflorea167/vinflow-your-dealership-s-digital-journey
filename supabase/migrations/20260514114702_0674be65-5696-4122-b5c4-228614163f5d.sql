DROP POLICY IF EXISTS "Anyone can view tracking snapshot with token" ON public.customer_tracking_snapshots;
DROP POLICY IF EXISTS "Anyone can create tracking snapshots" ON public.customer_tracking_snapshots;
DROP POLICY IF EXISTS "Anyone can refresh tracking snapshots" ON public.customer_tracking_snapshots;

CREATE OR REPLACE FUNCTION public.get_customer_tracking_snapshot(_token TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT snapshot
  FROM public.customer_tracking_snapshots
  WHERE token = _token
    AND (expires_at IS NULL OR expires_at > now())
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.upsert_customer_tracking_snapshot(
  _token TEXT,
  _process_id TEXT,
  _snapshot JSONB,
  _expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.customer_tracking_snapshots (token, process_id, snapshot, expires_at)
  VALUES (_token, _process_id, _snapshot, _expires_at)
  ON CONFLICT (token) DO UPDATE SET
    process_id = EXCLUDED.process_id,
    snapshot = EXCLUDED.snapshot,
    expires_at = EXCLUDED.expires_at,
    updated_at = now()
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_tracking_snapshot(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_customer_tracking_snapshot(TEXT, TEXT, JSONB, TIMESTAMP WITH TIME ZONE) TO anon, authenticated;