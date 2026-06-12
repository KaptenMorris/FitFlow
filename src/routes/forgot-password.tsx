import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import logo from "@/assets/fitflow-logo.png";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    setSent(true);
    toast.success("Mejl skickat! Kolla din inkorg.");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12 bg-background">
      <div className="w-full max-w-md flex flex-col items-center">
        <img src={logo} alt="FitFlow" width={120} height={120} className="mb-2" />
        <div className="w-full bg-card border border-border rounded-2xl p-5 mt-4">
          <h1 className="text-xl font-semibold mb-1">Glömt lösenord</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Ange din e-postadress så skickar vi en länk för att återställa lösenordet.
          </p>
          {sent ? (
            <div className="space-y-4">
              <p className="text-sm">Vi har skickat en återställningslänk till <strong>{email}</strong>.</p>
              <Button className="w-full h-11 rounded-full" onClick={() => navigate({ to: "/login" })}>
                Tillbaka till inloggning
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <Label>E-postadress</Label>
                <Input type="email" placeholder="din@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <Button type="submit" className="w-full h-11 rounded-full font-semibold" disabled={loading}>
                {loading ? "Skickar..." : "Skicka återställningslänk"}
              </Button>
              <button
                type="button"
                onClick={() => navigate({ to: "/login" })}
                className="w-full text-sm text-muted-foreground hover:text-foreground"
              >
                Tillbaka till inloggning
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}