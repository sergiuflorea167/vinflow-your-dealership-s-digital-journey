CREATE TABLE public.customer_tracking_snapshots (
  token TEXT PRIMARY KEY,
  process_id TEXT NOT NULL,
  snapshot JSONB NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_tracking_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tracking snapshot with token"
ON public.customer_tracking_snapshots
FOR SELECT
USING (expires_at IS NULL OR expires_at > now());

CREATE POLICY "Anyone can create tracking snapshots"
ON public.customer_tracking_snapshots
FOR INSERT
WITH CHECK (expires_at IS NULL OR expires_at > now());

CREATE POLICY "Anyone can refresh tracking snapshots"
ON public.customer_tracking_snapshots
FOR UPDATE
USING (expires_at IS NULL OR expires_at > now())
WITH CHECK (expires_at IS NULL OR expires_at > now());

CREATE OR REPLACE FUNCTION public.update_customer_tracking_snapshots_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_customer_tracking_snapshots_updated_at
BEFORE UPDATE ON public.customer_tracking_snapshots
FOR EACH ROW
EXECUTE FUNCTION public.update_customer_tracking_snapshots_updated_at();

CREATE INDEX idx_customer_tracking_snapshots_process_id ON public.customer_tracking_snapshots (process_id);