import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSubscription } from "@/lib/subscription";
import { listAllUsers, setUserAdmin, setUserTier, type AdminUserRow } from "@/lib/admin.functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Shield, Search, Crown, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({ component: AdminPage });

function AdminPage() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useSubscription();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const fetchList = useServerFn(listAllUsers);
  const callSetAdmin = useServerFn(setUserAdmin);
  const callSetTier = useServerFn(setUserTier);

  // Route guard – redirect non-admins
  useEffect(() => {
    if (!authLoading && !isAdmin) navigate({ to: "/hem", replace: true });
  }, [authLoading, isAdmin, navigate]);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await fetchList();
      setUsers(rows);
    } catch (e) {
      toast.error("Kunde inte hämta användare", { description: (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter(
      (u) =>
        (u.display_name ?? "").toLowerCase().includes(s) ||
        (u.email ?? "").toLowerCase().includes(s),
    );
  }, [users, q]);

  const toggleAdmin = async (u: AdminUserRow, next: boolean) => {
    setBusy(u.id);
    try {
      await callSetAdmin({ data: { userId: u.id, isAdmin: next } });
      setUsers((xs) => xs.map((x) => (x.id === u.id ? { ...x, is_admin: next } : x)));
      toast.success(next ? "Användare är nu admin" : "Admin-rollen togs bort");
    } catch (e) {
      toast.error("Misslyckades", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const toggleFullAccess = async (u: AdminUserRow, fullAccess: boolean) => {
    const tier = fullAccess ? "pro_allt" : "free";
    setBusy(u.id);
    try {
      await callSetTier({ data: { userId: u.id, tier } });
      setUsers((xs) => xs.map((x) => (x.id === u.id ? { ...x, subscription_tier: tier } : x)));
      toast.success(fullAccess ? "Gratis full tillgång aktiverad" : "Full tillgång borttagen");
    } catch (e) {
      toast.error("Misslyckades", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const changeTier = async (u: AdminUserRow, tier: AdminUserRow["subscription_tier"]) => {
    setBusy(u.id);
    try {
      await callSetTier({ data: { userId: u.id, tier: tier as "free" | "bas" | "recept" | "pro" | "pro_allt" } });
      setUsers((xs) => xs.map((x) => (x.id === u.id ? { ...x, subscription_tier: tier } : x)));
      toast.success("Prenumeration uppdaterad");
    } catch (e) {
      toast.error("Misslyckades", { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  if (authLoading || !isAdmin) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-muted-foreground">
        Kontrollerar behörighet…
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
      <header className="flex items-center gap-3">
        <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-warning/30 to-primary/20 border border-warning/40 flex items-center justify-center">
          <ShieldCheck className="h-5 w-5 text-warning" />
        </div>
        <div>
          <h1 className="text-xl font-bold">Admin Dashboard</h1>
          <p className="text-xs text-muted-foreground">Hantera användare, roller och prenumerationer</p>
        </div>
      </header>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Sök på namn eller e-post…"
          className="pl-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Laddar användare…
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground">{filtered.length} av {users.length} användare</p>
          {filtered.map((u) => {
            const fullAccess = u.subscription_tier === "pro_allt";
            return (
              <div
                key={u.id}
                className="rounded-2xl border border-border bg-card p-4 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold truncate">{u.display_name || "(utan namn)"}</p>
                      {u.is_admin && (
                        <Badge className="bg-warning/20 text-warning border-warning/40 hover:bg-warning/20">
                          <Shield className="h-3 w-3 mr-1" /> Admin
                        </Badge>
                      )}
                      {fullAccess && (
                        <Badge className="bg-primary/20 text-primary border-primary/40 hover:bg-primary/20">
                          <Crown className="h-3 w-3 mr-1" /> Full tillgång
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email ?? "—"}</p>
                  </div>
                  {busy === u.id && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Administratör</p>
                      <p className="text-xs text-muted-foreground">Full åtkomst till admin-menyn</p>
                    </div>
                    <Switch
                      checked={u.is_admin}
                      disabled={busy === u.id}
                      onCheckedChange={(v) => toggleAdmin(u, v)}
                    />
                  </label>

                  <label className="flex items-center justify-between gap-3 rounded-lg border border-border bg-secondary/40 p-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium">Testare – gratis tillgång</p>
                      <p className="text-xs text-muted-foreground">Obegränsad FitFlow Pro utan betalning</p>
                    </div>
                    <Switch
                      checked={fullAccess}
                      disabled={busy === u.id}
                      onCheckedChange={(v) => toggleFullAccess(u, v)}
                    />
                  </label>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">Prenumerationsnivå</p>
                  <select
                    value={u.subscription_tier}
                    disabled={busy === u.id}
                    onChange={(e) => changeTier(u, e.target.value as AdminUserRow["subscription_tier"])}
                    className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                  >
                    <option value="free">Gratisversion</option>
                    <option value="bas">FitFlow Bas</option>
                    <option value="recept">FitFlow Recept</option>
                    <option value="pro">FitFlow Pro</option>
                    <option value="pro_allt">FitFlow Pro – Allt</option>
                  </select>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div className="text-center py-10 text-sm text-muted-foreground">Inga användare matchar sökningen.</div>
          )}

          <Button variant="outline" className="w-full" onClick={load}>Uppdatera lista</Button>
        </div>
      )}
    </div>
  );
}