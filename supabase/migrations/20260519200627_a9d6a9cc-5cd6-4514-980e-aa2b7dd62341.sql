
-- Enum für Rollen
CREATE TYPE public.app_role AS ENUM ('geschaeftsfuehrer', 'mitarbeiter');

-- Organisationen
CREATE TABLE public.organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profile
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  position TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rollen pro Organisation
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, organization_id, role)
);

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer Funktionen (verhindern RLS-Rekursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_org(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.profiles WHERE id = _user_id;
$$;

-- Policies: profiles
CREATE POLICY "Profil: eigenes ansehen"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "Profil: Org-Kollegen ansehen"
ON public.profiles FOR SELECT TO authenticated
USING (organization_id IS NOT NULL AND organization_id = public.get_user_org(auth.uid()));

CREATE POLICY "Profil: eigenes aktualisieren"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Policies: organizations
CREATE POLICY "Org: eigene ansehen"
ON public.organizations FOR SELECT TO authenticated
USING (id = public.get_user_org(auth.uid()));

CREATE POLICY "Org: GF darf updaten"
ON public.organizations FOR UPDATE TO authenticated
USING (id = public.get_user_org(auth.uid()) AND public.has_role(auth.uid(), 'geschaeftsfuehrer'))
WITH CHECK (id = public.get_user_org(auth.uid()) AND public.has_role(auth.uid(), 'geschaeftsfuehrer'));

-- Policies: user_roles
CREATE POLICY "Rollen: eigene ansehen"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Rollen: GF sieht Org"
ON public.user_roles FOR SELECT TO authenticated
USING (organization_id = public.get_user_org(auth.uid()) AND public.has_role(auth.uid(), 'geschaeftsfuehrer'));

-- updated_at Trigger Funktion
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER organizations_updated_at
BEFORE UPDATE ON public.organizations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bei neuer Registrierung: Profil + ggf. Org/Rolle anlegen
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
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8))
    )
    RETURNING id INTO v_org_id;
    v_role := 'geschaeftsfuehrer';
  ELSE
    -- ohne Org-Angabe nur Profil ohne Org-Zuordnung
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

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
