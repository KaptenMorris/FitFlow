import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import logo from "@/assets/fitflow-logo.png";
import intro from "@/assets/fitflow-intro.jpg";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/hem", replace: true });
    });
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      const msg = /invalid login credentials/i.test(error.message)
        ? "Fel e-post eller lösenord"
        : /email not confirmed/i.test(error.message)
        ? "Din e-post är inte verifierad än. Kolla din inkorg."
        : error.message;
      return toast.error(msg);
    }
    navigate({ to: "/hem", replace: true });
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { emailRedirectTo: window.location.origin, data: { display_name: name } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Konto skapat! Kolla din e-post för att verifiera.");
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      return toast.error(result.error.message || "Kunde inte logga in med Google");
    }
    if (result.redirected) return;
    navigate({ to: "/hem", replace: true });
  };

  return (
    <div className="h-[100svh] min-h-[100svh] flex flex-col bg-background relative overflow-hidden">
      {/* Hero intro image */}
      <div className="relative h-[34svh] min-h-[180px] w-full overflow-hidden shrink-0">
        <img
          src={intro}
          alt="FitFlow – din personliga tränings- och kostapp"
          width={1080}
          height={1920}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/10 to-background" />
        <div className="absolute inset-x-0 bottom-3 flex flex-col items-center">
          <img src={logo} alt="" className="h-16 md:h-20 w-auto object-contain drop-shadow-[0_10px_60px_rgba(45,212,191,0.45)]" />
          <p className="mt-1 text-xs text-white/80">Din personliga tränings- och kostapp</p>
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col items-center px-4 pt-3 pb-3 overflow-y-auto">
        <div className="w-full max-w-md flex flex-col items-center">

        <div className="w-full bg-card border border-border rounded-2xl p-3">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid grid-cols-2 w-full bg-secondary rounded-full p-1 h-10">
              <TabsTrigger value="login" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Logga in</TabsTrigger>
              <TabsTrigger value="signup" className="rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Skapa konto</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-3 space-y-2">
              <form onSubmit={handleLogin} className="space-y-2">
                <div><Label>E-postadress</Label><Input type="email" placeholder="din@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                <div><Label>Lösenord</Label><Input type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
                <Button type="submit" className="w-full h-10 rounded-full font-semibold" disabled={loading}>Logga in</Button>
              </form>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate({ to: "/forgot-password" })}
                  className="text-xs text-primary hover:underline"
                >
                  Glömt lösenord?
                </button>
              </div>
            </TabsContent>

            <TabsContent value="signup" className="mt-3 space-y-2">
              <form onSubmit={handleSignup} className="space-y-2">
                <div><Label>Namn</Label><Input placeholder="Ditt namn" value={name} onChange={(e) => setName(e.target.value)} required /></div>
                <div><Label>E-postadress</Label><Input type="email" placeholder="din@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
                <div><Label>Lösenord</Label><Input type="password" placeholder="Minst 6 tecken" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /></div>
                <Button type="submit" className="w-full h-10 rounded-full font-semibold" disabled={loading}>Skapa konto</Button>
              </form>
            </TabsContent>
          </Tabs>
          <div className="mt-3 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">eller</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={handleGoogle}
            disabled={loading}
            className="mt-3 w-full h-10 rounded-full font-semibold gap-2"
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.17-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.91c1.7-1.57 2.69-3.88 2.69-6.62z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.82.96 4.04l3-2.33z"/>
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58z"/>
            </svg>
            Fortsätt med Google
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-3 text-center">
          Genom att fortsätta godkänner du våra{" "}
          <Link to="/villkor" className="underline hover:text-foreground">villkor</Link>
          {" "}och{" "}
          <Link to="/integritetspolicy" className="underline hover:text-foreground">integritetspolicy</Link>.
        </p>
        <p className="text-[10px] text-muted-foreground mt-1 text-center">
          <Link to="/aterbetalning" className="underline hover:text-foreground">Återbetalningspolicy</Link>
          {" · "}
          <Link to="/pricing" className="underline hover:text-foreground">Priser</Link>
        </p>
        <p className="text-[10px] text-muted-foreground mt-1 text-center">
          MC Tech säljer FitFlow och Paddle.com är Merchant of Record för köp och abonnemang.
        </p>
      </div>
      </div>
    </div>
  );
}
