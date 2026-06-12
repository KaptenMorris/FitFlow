import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { searchUsers, sendFriendRequest, respondFriendRequest } from "@/lib/friends.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, UserPlus, Check, X, ArrowLeft, Loader2, Clock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/vanner")({ component: VannerPage });

type Profile = { id: string; display_name: string | null; avatar_url: string | null };
type Friendship = {
  id: string; requester_id: string; addressee_id: string; status: string;
  other?: Profile;
};

function VannerPage() {
  const router = useRouter();
  const search = useServerFn(searchUsers);
  const sendReq = useServerFn(sendFriendRequest);
  const respond = useServerFn(respondFriendRequest);
  const [me, setMe] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [searching, setSearching] = useState(false);
  const [friendships, setFriendships] = useState<Friendship[]>([]);

  const refresh = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setMe(u.user.id);
    const { data: fs } = await supabase
      .from("friendships")
      .select("*")
      .order("created_at", { ascending: false });
    const rows = (fs ?? []) as Friendship[];
    const otherIds = rows.map((f) => (f.requester_id === u.user!.id ? f.addressee_id : f.requester_id));
    if (otherIds.length) {
      const { data: profs } = await supabase
        .rpc("get_public_profiles", { _ids: otherIds });
      const map = new Map((profs ?? []).map((p) => [p.id, p as Profile]));
      rows.forEach((r) => { r.other = map.get(r.requester_id === u.user!.id ? r.addressee_id : r.requester_id); });
    }
    setFriendships(rows);
  };
  useEffect(() => { refresh(); }, []);

  const runSearch = async () => {
    if (!q.trim()) return;
    setSearching(true);
    try {
      const data = await search({ data: { query: q.trim() } });
      setResults(data as Profile[]);
    } catch (e: any) {
      toast.error(e.message);
    } finally { setSearching(false); }
  };

  const add = async (id: string) => {
    try {
      await sendReq({ data: { addressee_id: id } });
      toast.success("Vänförfrågan skickad");
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const reply = async (fid: string, accept: boolean) => {
    try {
      await respond({ data: { friendship_id: fid, accept } });
      toast.success(accept ? "Vänner!" : "Avböjd");
      refresh();
    } catch (e: any) { toast.error(e.message); }
  };

  const accepted = friendships.filter((f) => f.status === "accepted");
  const incoming = friendships.filter((f) => f.status === "pending" && f.addressee_id === me);
  const outgoing = friendships.filter((f) => f.status === "pending" && f.requester_id === me);

  return (
    <div className="max-w-md mx-auto pb-24">
      <header className="flex items-center gap-2 py-4 px-4 border-b border-border">
        <button onClick={() => router.history.back()} className="p-1"><ArrowLeft className="h-4 w-4" /></button>
        <h1 className="font-semibold flex-1 text-center pr-7">Vänner</h1>
      </header>
      <div className="px-4 pt-4 space-y-4">
        <div className="flex gap-2">
          <div className={cn("flex-1 flex items-center gap-2 rounded-xl border bg-card px-3", q ? "border-accent" : "border-border")}>
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && runSearch()}
              placeholder="Sök efter användarnamn..."
              className="border-0 bg-transparent focus-visible:ring-0 px-0 h-10"
            />
          </div>
          <Button onClick={runSearch} disabled={searching} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Sökresultat</p>
            {results.map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <Avatar p={p} />
                <span className="flex-1 text-sm font-medium truncate">{p.display_name ?? "Användare"}</span>
                <Button size="sm" onClick={() => add(p.id)} className="bg-accent text-accent-foreground hover:bg-accent/90">
                  <UserPlus className="h-3.5 w-3.5" />Lägg till
                </Button>
              </div>
            ))}
          </div>
        )}

        {incoming.length > 0 && (
          <Section title="Vänförfrågningar">
            {incoming.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-xl border border-accent/40 bg-accent/5 p-3">
                <Avatar p={f.other} />
                <span className="flex-1 text-sm font-medium truncate">{f.other?.display_name ?? "Användare"}</span>
                <button onClick={() => reply(f.id, true)} className="h-8 w-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center"><Check className="h-4 w-4" /></button>
                <button onClick={() => reply(f.id, false)} className="h-8 w-8 rounded-full bg-destructive/15 text-destructive flex items-center justify-center"><X className="h-4 w-4" /></button>
              </div>
            ))}
          </Section>
        )}

        {outgoing.length > 0 && (
          <Section title="Skickade förfrågningar">
            {outgoing.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-xl border border-border bg-card/50 p-3">
                <Avatar p={f.other} />
                <span className="flex-1 text-sm font-medium truncate">{f.other?.display_name ?? "Användare"}</span>
                <span className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />Väntar</span>
              </div>
            ))}
          </Section>
        )}

        <Section title={`Mina vänner (${accepted.length})`}>
          {accepted.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-6">Du har inga vänner ännu. Sök efter någon ovan.</p>
          ) : accepted.map((f) => (
            <div key={f.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
              <Avatar p={f.other} />
              <span className="flex-1 text-sm font-medium truncate">{f.other?.display_name ?? "Användare"}</span>
              <Users className="h-4 w-4 text-accent" />
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">{title}</p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Avatar({ p }: { p?: Profile }) {
  return p?.avatar_url ? (
    <img src={p.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
  ) : (
    <div className="h-9 w-9 rounded-full bg-accent/20 text-accent flex items-center justify-center font-bold">
      {(p?.display_name ?? "?").slice(0, 1).toUpperCase()}
    </div>
  );
}