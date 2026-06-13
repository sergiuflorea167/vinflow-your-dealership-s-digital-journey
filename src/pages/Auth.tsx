import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { Loader2, Building2, KeyRound, Mail } from "lucide-react";

const loginSchema = z.object({
  email: z.string().trim().email("Ungültige E-Mail").max(255),
  password: z.string().min(6, "Mind. 6 Zeichen").max(72),
});

const signupSchema = z.object({
  email: z.string().trim().email("Ungültige E-Mail").max(255),
  password: z.string().min(8, "Mind. 8 Zeichen").max(72),
  firstName: z.string().trim().min(1, "Pflichtfeld").max(60),
  lastName: z.string().trim().min(1, "Pflichtfeld").max(60),
  position: z.string().trim().min(1, "Pflichtfeld").max(80),
  orgMode: z.enum(["create", "join"]),
  newOrgName: z.string().trim().max(120).optional(),
  inviteCode: z.string().trim().max(32).optional(),
}).refine((d) => d.orgMode === "create" ? !!d.newOrgName : !!d.inviteCode, {
  message: "Firmenname oder Einladungs-Code erforderlich",
  path: ["newOrgName"],
});

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { session, loading: authLoading } = useAuth();
  const [tab, setTab] = useState<"login" | "signup">("login");
  const [busy, setBusy] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");

  // login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // signup
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [position, setPosition] = useState("");
  const [orgMode, setOrgMode] = useState<"create" | "join">("create");
  const [newOrgName, setNewOrgName] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  useEffect(() => {
    if (!authLoading && session) {
      const from = (location.state as { from?: string } | null)?.from ?? "/";
      navigate(from, { replace: true });
    }
  }, [session, authLoading, navigate, location.state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });
    setBusy(false);
    if (error) {
      if (error.message.toLowerCase().includes("email not confirmed")) {
        toast.error("Bitte bestätige zuerst deine E-Mail-Adresse.");
      } else if (error.message.toLowerCase().includes("invalid login")) {
        toast.error("E-Mail oder Passwort ist falsch.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("Willkommen zurück!");
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = forgotEmail.trim();
    if (!email || !email.includes("@")) {
      toast.error("Bitte eine gültige E-Mail eingeben.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Falls ein Konto existiert, erhältst du einen Reset-Link per E-Mail.");
    setForgotMode(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = signupSchema.safeParse({
      email, password, firstName, lastName, position, orgMode, newOrgName, inviteCode,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          first_name: parsed.data.firstName,
          last_name: parsed.data.lastName,
          position: parsed.data.position,
          ...(parsed.data.orgMode === "create"
            ? { new_org_name: parsed.data.newOrgName }
            : { invite_code: parsed.data.inviteCode?.toUpperCase() }),
        },
      },
    });
    setBusy(false);
    if (error) {
      if (error.message.includes("Ungültiger Einladungs-Code") || error.message.includes("invite")) {
        toast.error("Ungültiger Einladungs-Code.");
      } else if (error.message.toLowerCase().includes("already registered")) {
        toast.error("Diese E-Mail ist bereits registriert.");
      } else {
        toast.error(error.message);
      }
      return;
    }
    toast.success("Registrierung erfolgreich! Bitte bestätige deine E-Mail.");
    setTab("login");
    setLoginEmail(parsed.data.email);
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="size-10 rounded-xl bg-gradient-brand grid place-items-center">
              <Building2 className="size-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold tracking-tight font-heading">VINflow</span>
          </div>
          <p className="text-sm text-muted-foreground">Fahrzeughandel intelligent organisiert</p>
        </div>

        <Card className="border-border/60 backdrop-blur-md bg-card/80">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Willkommen</CardTitle>
            <CardDescription>Melde dich an oder erstelle ein Konto.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={tab} onValueChange={(v) => setTab(v as "login" | "signup")}>
              <TabsList className="grid grid-cols-2 w-full mb-4">
                <TabsTrigger value="login">Anmelden</TabsTrigger>
                <TabsTrigger value="signup">Registrieren</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <Label>E-Mail</Label>
                    <Input type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required autoComplete="email" />
                  </div>
                  <div>
                    <Label>Passwort</Label>
                    <Input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required autoComplete="current-password" />
                  </div>
                  <Button type="submit" className="w-full bg-gradient-brand" disabled={busy}>
                    {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : <Mail className="size-4 mr-2" />}
                    Anmelden
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-xs">Vorname</Label>
                      <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                    </div>
                    <div>
                      <Label className="text-xs">Nachname</Label>
                      <Input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Position im Unternehmen</Label>
                    <Input value={position} onChange={(e) => setPosition(e.target.value)} placeholder="z.B. Geschäftsführer, Verkauf, Buchhaltung" required />
                  </div>
                  <div>
                    <Label className="text-xs">E-Mail</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
                  </div>
                  <div>
                    <Label className="text-xs">Passwort</Label>
                    <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
                    <p className="text-[10px] text-muted-foreground mt-1">Mind. 8 Zeichen, nicht in Daten-Leaks bekannt.</p>
                  </div>

                  <div className="pt-2 space-y-2">
                    <Label className="text-xs">Organisation</Label>
                    <RadioGroup value={orgMode} onValueChange={(v) => setOrgMode(v as "create" | "join")} className="grid grid-cols-2 gap-2">
                      <label className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-smooth ${orgMode === "create" ? "border-primary bg-primary/5" : "border-border"}`}>
                        <RadioGroupItem value="create" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold">Neue Firma</p>
                          <p className="text-[10px] text-muted-foreground">Du wirst Geschäftsführer</p>
                        </div>
                      </label>
                      <label className={`flex items-center gap-2 rounded-lg border p-2.5 cursor-pointer transition-smooth ${orgMode === "join" ? "border-primary bg-primary/5" : "border-border"}`}>
                        <RadioGroupItem value="join" />
                        <div className="flex-1">
                          <p className="text-xs font-semibold">Beitreten</p>
                          <p className="text-[10px] text-muted-foreground">Per Einladungs-Code</p>
                        </div>
                      </label>
                    </RadioGroup>

                    {orgMode === "create" ? (
                      <div>
                        <Label className="text-xs flex items-center gap-1"><Building2 className="size-3" /> Firmenname</Label>
                        <Input value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} placeholder="Muster Automobile GmbH" required />
                      </div>
                    ) : (
                      <div>
                        <Label className="text-xs flex items-center gap-1"><KeyRound className="size-3" /> Einladungs-Code</Label>
                        <Input value={inviteCode} onChange={(e) => setInviteCode(e.target.value.toUpperCase())} placeholder="z.B. A1B2C3D4" required className="uppercase tracking-wider" />
                        <p className="text-[10px] text-muted-foreground mt-1">Frage deinen Geschäftsführer nach dem Code.</p>
                      </div>
                    )}
                  </div>

                  <Button type="submit" className="w-full bg-gradient-brand mt-2" disabled={busy}>
                    {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
                    Konto erstellen
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <p className="text-center text-[11px] text-muted-foreground mt-4">
          Mit der Registrierung stimmst du den Nutzungsbedingungen zu.
        </p>
      </div>
    </div>
  );
};

export default Auth;
