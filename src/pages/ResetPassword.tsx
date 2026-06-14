import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, KeyRound } from "lucide-react";

const getRecoveryParams = () => {
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const searchParams = new URLSearchParams(window.location.search);
  return {
    isRecovery: hashParams.get("type") === "recovery" || searchParams.get("type") === "recovery",
    accessToken: hashParams.get("access_token") ?? searchParams.get("access_token"),
    refreshToken: hashParams.get("refresh_token") ?? searchParams.get("refresh_token"),
  };
};

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [canReset, setCanReset] = useState(false);

  useEffect(() => {
    const prepareReset = async () => {
      const { isRecovery, accessToken, refreshToken } = getRecoveryParams();

      if (isRecovery && accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          toast.error("Der Reset-Link ist ungültig oder abgelaufen.");
          setCanReset(false);
          setCheckingLink(false);
          return;
        }

        window.history.replaceState(null, "", "/reset-password");
        setCanReset(true);
        setCheckingLink(false);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      setCanReset(Boolean(session));
      setCheckingLink(false);
    };

    void prepareReset();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      toast.error("Passwort muss mind. 8 Zeichen haben.");
      return;
    }
    if (password !== confirmPassword) {
      toast.error("Passwörter stimmen nicht überein.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Passwort erfolgreich geändert. Du wirst weitergeleitet.");
    setTimeout(() => navigate("/auth"), 2000);
  };

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-2">
            <div className="size-10 rounded-xl bg-gradient-brand grid place-items-center">
              <KeyRound className="size-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold tracking-tight font-heading">VINflow</span>
          </div>
          <p className="text-sm text-muted-foreground">Fahrzeughandel intelligent organisiert</p>
        </div>

        <Card className="border-border/60 backdrop-blur-md bg-card/80">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl">Neues Passwort</CardTitle>
            <CardDescription>Lege ein neues Passwort für dein Konto fest.</CardDescription>
          </CardHeader>
          <CardContent>
            {checkingLink ? (
              <div className="grid place-items-center py-8">
                <Loader2 className="size-6 animate-spin text-primary" />
              </div>
            ) : canReset ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>Neues Passwort</Label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <div>
                  <Label>Passwort wiederholen</Label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
                <Button type="submit" className="w-full bg-gradient-brand" disabled={busy}>
                  {busy ? <Loader2 className="size-4 mr-2 animate-spin" /> : null}
                  Passwort speichern
                </Button>
              </form>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">
                  Dieser Reset-Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.
                </p>
                <Button variant="outline" onClick={() => navigate("/auth")}>
                  Zurück zum Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
