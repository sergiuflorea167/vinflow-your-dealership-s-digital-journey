-- Eine Tabelle pro Organisation, die den kompletten App-State als JSONB hält.
-- Schlanker Ansatz: ein Datensatz pro Org, Schreibzugriffe debounced aus dem Store.

CREATE TABLE public.organization_state (
  organization_id uuid PRIMARY KEY REFERENCES public.organizations(id) ON DELETE CASCADE,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  data_version text,
  updated_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_state TO authenticated;
GRANT ALL ON public.organization_state TO service_role;

ALTER TABLE public.organization_state ENABLE ROW LEVEL SECURITY;

-- Nur Mitglieder der Organisation dürfen Daten lesen
CREATE POLICY "Org-State: Mitglieder lesen"
ON public.organization_state
FOR SELECT
TO authenticated
USING (organization_id = public.get_user_org(auth.uid()));

-- Mitglieder der Org dürfen anlegen (für initiale Erstellung)
CREATE POLICY "Org-State: Mitglieder anlegen"
ON public.organization_state
FOR INSERT
TO authenticated
WITH CHECK (organization_id = public.get_user_org(auth.uid()));

-- Mitglieder der Org dürfen aktualisieren
CREATE POLICY "Org-State: Mitglieder aktualisieren"
ON public.organization_state
FOR UPDATE
TO authenticated
USING (organization_id = public.get_user_org(auth.uid()))
WITH CHECK (organization_id = public.get_user_org(auth.uid()));

-- Kein DELETE für Nutzer (nur service_role über GRANT)

-- updated_at Trigger
CREATE TRIGGER trg_organization_state_updated_at
BEFORE UPDATE ON public.organization_state
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime aktivieren, damit Kollegen Änderungen live sehen
ALTER TABLE public.organization_state REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.organization_state;