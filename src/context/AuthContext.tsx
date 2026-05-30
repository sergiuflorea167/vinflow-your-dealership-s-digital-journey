import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { startOrgStateSync, stopOrgStateSync } from "@/lib/orgStateSync";

interface Profile {
  id: string;
  organization_id: string | null;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  position: string | null;
  avatar_url: string | null;
}

interface Organization {
  id: string;
  name: string;
  invite_code: string;
}

type AppRole = "geschaeftsfuehrer" | "mitarbeiter";

interface AuthCtx {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  organization: Organization | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const { data: prof } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();
    setProfile(prof as Profile | null);

    if (prof?.organization_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", prof.organization_id)
        .maybeSingle();
      setOrganization(org as Organization | null);
      // Daten aus Supabase laden + Live-Sync starten
      void startOrgStateSync(prof.organization_id, uid);
    } else {
      setOrganization(null);
      stopOrgStateSync();
    }

    const { data: rs } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);
    setRoles(((rs ?? []) as { role: AppRole }[]).map((r) => r.role));
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        setTimeout(() => loadProfile(sess.user.id), 0);
      } else {
        setProfile(null);
        setOrganization(null);
        setRoles([]);
        stopOrgStateSync();
      }
    });

    supabase.auth.getSession().then(({ data: { session: sess } }) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) loadProfile(sess.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    stopOrgStateSync();
    await supabase.auth.signOut();
  };

  const refresh = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <Ctx.Provider value={{ session, user, profile, organization, roles, loading, signOut, refresh }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used within AuthProvider");
  return c;
};
