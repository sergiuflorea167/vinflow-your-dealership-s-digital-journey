-- Backend-Härtung: Organisationsgrenzen, Rollenprüfung und unveränderliche Profilzuordnung.

CREATE OR REPLACE FUNCTION public.get_user_org(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.organization_id
  FROM public.profiles AS p
  WHERE p.id = _user_id
    AND _user_id = auth.uid()
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id = auth.uid() AND EXISTS (
    SELECT 1
    FROM public.user_roles AS ur
    JOIN public.profiles AS p ON p.id = ur.user_id
    WHERE ur.user_id = _user_id
      AND ur.role = _role
      AND ur.organization_id = p.organization_id
  )
$$;

CREATE OR REPLACE FUNCTION public.prevent_profile_identity_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
     OR NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Profilidentität und Organisationszuordnung dürfen nicht geändert werden';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_profile_identity_change ON public.profiles;
CREATE TRIGGER prevent_profile_identity_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_profile_identity_change();

DROP POLICY IF EXISTS "Org-State: Mitglieder anlegen" ON public.organization_state;
CREATE POLICY "Org-State: Mitglieder anlegen"
ON public.organization_state
FOR INSERT
TO authenticated
WITH CHECK (
  organization_id = public.get_user_org(auth.uid())
  AND updated_by = auth.uid()
);

DROP POLICY IF EXISTS "Org-State: Mitglieder aktualisieren" ON public.organization_state;
CREATE POLICY "Org-State: Mitglieder aktualisieren"
ON public.organization_state
FOR UPDATE
TO authenticated
USING (organization_id = public.get_user_org(auth.uid()))
WITH CHECK (
  organization_id = public.get_user_org(auth.uid())
  AND updated_by = auth.uid()
);

-- Neue Organisationen erhalten künftig einen deutlich stärkeren Einladungscode.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id uuid;
  v_role public.app_role;
  v_meta jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
  v_invite text := NULLIF(trim(v_meta->>'invite_code'), '');
  v_new_org_name text := NULLIF(trim(v_meta->>'new_org_name'), '');
BEGIN
  IF v_invite IS NOT NULL THEN
    SELECT id INTO v_org_id FROM public.organizations WHERE invite_code = upper(v_invite);
    IF v_org_id IS NULL THEN
      RAISE EXCEPTION 'Ungültiger Einladungs-Code';
    END IF;
    v_role := 'mitarbeiter';
  ELSIF v_new_org_name IS NOT NULL THEN
    INSERT INTO public.organizations (name, invite_code)
    VALUES (
      v_new_org_name,
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12))
    )
    RETURNING id INTO v_org_id;
    v_role := 'geschaeftsfuehrer';
  ELSE
    v_org_id := NULL;
    v_role := NULL;
  END IF;

  INSERT INTO public.profiles (id, organization_id, email, first_name, last_name, position)
  VALUES (
    NEW.id,
    v_org_id,
    NEW.email,
    v_meta->>'first_name',
    v_meta->>'last_name',
    v_meta->>'position'
  );

  IF v_org_id IS NOT NULL AND v_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, organization_id, role)
    VALUES (NEW.id, v_org_id, v_role);
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_profile_identity_change() FROM public, anon, authenticated;
