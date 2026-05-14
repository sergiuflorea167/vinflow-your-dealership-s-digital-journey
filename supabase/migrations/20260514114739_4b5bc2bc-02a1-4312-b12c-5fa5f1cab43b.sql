DROP FUNCTION IF EXISTS public.get_customer_tracking_snapshot(TEXT);
DROP FUNCTION IF EXISTS public.upsert_customer_tracking_snapshot(TEXT, TEXT, JSONB, TIMESTAMP WITH TIME ZONE);

CREATE POLICY "No direct customer tracking snapshot access"
ON public.customer_tracking_snapshots
FOR ALL
USING (false)
WITH CHECK (false);