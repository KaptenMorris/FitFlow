import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/fitflow-logo.png";

export const Route = createFileRoute("/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase sets a temporary recovery session when the user lands here from the email link.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) return toast.error("Lösenordet måste vara minst 6 tecken");
    if (password !== confirm) return toast.error("Lösenorden matchar inte");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Lösenord uppdaterat!");
    navigate({ to: "/hem", replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-background">
      <div className="w-full max-w-md flex flex-col items-center">
        <img src={logo} alt="FitFlow" width={120} height={120} className="mb-2" />
        <div className="w-full bg-card border border-border rounded-2xl p-5 mt-4">
          <h1 className="text-xl font-semibold mb-1">Återställ lösenord</h1>
          <p className="text-sm text-muted-foreground mb-4">Välj ett nytt lösenord för ditt konto.</p>
          {!ready ? (
            <p className="text-sm text-muted-foreground">Verifierar återställningslänk...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label>Nytt lösenord</Label>
                <Input type="password" placeholder="Minst 6 tecken" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
              </div>
              <div>
                <Label>Bekräfta lösenord</Label>
                <Input type="password" placeholder="Upprepa lösenordet" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={6} required />
              </div>
              <Button type="submit" className="w-full h-11 rounded-full font-semibold" disabled={loading}>
                {loading ? "Sparar..." : "Uppdatera lösenord"}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}