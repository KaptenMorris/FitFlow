import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Plus, Users, UserPlus, Heart, MessageCircle, MoreHorizontal,
  Flame, TrendingUp, Lightbulb, Sparkles, MessageSquare, MapPin, Trash2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/community")({ component: CommunityPage });

type Post = {
  id: string;
  user_id: string;
  category: string;
  content: string;
  created_at: string;
};
type Profile = { id: string; display_name: string | null; avatar_url: string | null };

const MOODS = [
  { key: "Super", emoji: "🤩", color: "bg-success/20 text-success border-success/40" },
  { key: "Bra", emoji: "😊", color: "bg-warning/20 text-warning border-warning/40" },
  { key: "Okej", emoji: "😐", color: "bg-muted/40 text-foreground border-border" },
  { key: "Dålig", emoji: "😟", color: "bg-destructive/15 text-destructive border-destructive/40" },
  { key: "Usel", emoji: "🤢", color: "bg-destructive/25 text-destructive border-destructive/50" },
];

const CATEGORIES = [
  { key: "Flöde", icon: TrendingUp, accent: "success" },
  { key: "Pass", icon: Flame, accent: "muted" },
  { key: "Framsteg", icon: TrendingUp, accent: "muted" },
  { key: "Tips", icon: Lightbulb, accent: "muted" },
  { key: "Motivation", icon: Sparkles, accent: "muted" },
  { key: "Allmänt", icon: MessageSquare, accent: "muted" },
  { key: "Min resa", icon: MapPin, accent: "muted" },
] as const;

function CommunityPage() {
  const [me, setMe] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [reactions, setReactions] = useState<Record<string, { count: number; mine: boolean }>>({});
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [activeCat, setActiveCat] = useState<string>("Flöde");
  const [mood, setMood] = useState<string | null>(null);
  const [friendsCount, setFriendsCount] = useState(0);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerCat, setComposerCat] = useState("Allmänt");
  const [composerText, setComposerText] = useState("");
  const [posting, setPosting] = useState(false);

  useEffect(() => { (async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setMe(u.user.id);

    // today's mood
    const today = new Date().toISOString().slice(0, 10);
    const { data: md } = await supabase
      .from("mood_logs").select("mood").eq("user_id", u.user.id).eq("logged_date", today).maybeSingle();
    if (md?.mood) setMood(md.mood);

    // friends count
    const { count: fc } = await supabase
      .from("friendships").select("*", { count: "exact", head: true }).eq("status", "accepted");
    setFriendsCount(fc ?? 0);

    await loadPosts();
  })(); }, []);

  const loadPosts = async () => {
    const { data: p } = await supabase
      .from("posts").select("*").order("created_at", { ascending: false }).limit(50);
    const list = (p ?? []) as Post[];
    setPosts(list);

    if (list.length === 0) return;
    const ids = list.map((x) => x.id);
    const uids = Array.from(new Set(list.map((x) => x.user_id)));

    const [{ data: profs }, { data: rxs }, { data: cms }, meRes] = await Promise.all([
      supabase.rpc("get_public_profiles", { _ids: uids }),
      supabase.from("post_reactions").select("post_id,user_id").in("post_id", ids),
      supabase.from("post_comments").select("post_id").in("post_id", ids),
      supabase.auth.getUser(),
    ]);
    const myId = meRes.data.user?.id;
    setProfiles(Object.fromEntries((profs ?? []).map((x: any) => [x.id, x])));
    const rmap: Record<string, { count: number; mine: boolean }> = {};
    for (const id of ids) rmap[id] = { count: 0, mine: false };
    (rxs ?? []).forEach((r: any) => {
      rmap[r.post_id].count += 1;
      if (r.user_id === myId) rmap[r.post_id].mine = true;
    });
    setReactions(rmap);
    const cmap: Record<string, number> = {};
    for (const id of ids) cmap[id] = 0;
    (cms ?? []).forEach((c: any) => { cmap[c.post_id] = (cmap[c.post_id] ?? 0) + 1; });
    setCommentCounts(cmap);
  };

  const saveMood = async (m: string) => {
    if (!me) return;
    setMood(m);
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await supabase
      .from("mood_logs")
      .upsert({ user_id: me, mood: m, logged_date: today }, { onConflict: "user_id,logged_date" });
    if (error) toast.error(error.message); else toast.success(`Humör sparat: ${m}`);
  };

  const toggleHeart = async (postId: string) => {
    if (!me) return;
    const cur = reactions[postId] ?? { count: 0, mine: false };
    if (cur.mine) {
      setReactions((p) => ({ ...p, [postId]: { count: Math.max(0, cur.count - 1), mine: false } }));
      await supabase.from("post_reactions").delete().eq("post_id", postId).eq("user_id", me);
    } else {
      setReactions((p) => ({ ...p, [postId]: { count: cur.count + 1, mine: true } }));
      const { error } = await supabase.from("post_reactions").insert({ post_id: postId, user_id: me });
      if (error) setReactions((p) => ({ ...p, [postId]: cur }));
    }
  };

  const deletePost = async (postId: string) => {
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) return toast.error(error.message);
    setPosts((p) => p.filter((x) => x.id !== postId));
    toast.success("Inlägg borttaget");
  };

  const submitPost = async () => {
    if (!me || !composerText.trim()) return;
    setPosting(true);
    const { data, error } = await supabase
      .from("posts")
      .insert({ user_id: me, category: composerCat, content: composerText.trim() })
      .select("*").single();
    setPosting(false);
    if (error) return toast.error(error.message);
    setPosts((p) => [data as Post, ...p]);
    setReactions((r) => ({ ...r, [(data as Post).id]: { count: 0, mine: false } }));
    setCommentCounts((c) => ({ ...c, [(data as Post).id]: 0 }));
    setComposerOpen(false);
    setComposerText("");
    toast.success("Inlägg publicerat");
  };

  const filtered = useMemo(
    () => (activeCat === "Flöde" ? posts : posts.filter((p) => p.category === activeCat)),
    [posts, activeCat],
  );

  return (
    <div className="max-w-md mx-auto pb-24">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border h-12 flex items-center justify-center px-3">
        <p className="font-bold text-sm">Community</p>
      </header>

      <div className="px-4 pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Community</h1>
          <div className="flex items-center gap-2">
            <Link
              to="/vanner"
              className="flex items-center gap-1.5 rounded-full bg-secondary border border-border px-3 py-1.5 text-xs font-semibold"
            >
              <Users className="h-3.5 w-3.5 text-success" /> {friendsCount} vänner
            </Link>
            <Link
              to="/vanner"
              aria-label="Lägg till vän"
              className="h-8 w-8 rounded-full bg-secondary border border-border flex items-center justify-center"
            >
              <UserPlus className="h-4 w-4" />
            </Link>
            <button
              onClick={() => setComposerOpen(true)}
              aria-label="Nytt inlägg"
              className="h-8 w-8 rounded-full bg-success text-success-foreground flex items-center justify-center shadow-lg shadow-success/30"
            >
              <Plus className="h-4 w-4" strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Mood selector */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-semibold mb-3">Hur mår du idag?</p>
          <div className="grid grid-cols-5 gap-2">
            {MOODS.map((m) => (
              <button
                key={m.key}
                onClick={() => saveMood(m.key)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border p-2 transition-all",
                  mood === m.key
                    ? m.color + " scale-105 shadow-md"
                    : "border-border bg-secondary/40 hover:bg-secondary",
                )}
              >
                <span className="text-2xl leading-none">{m.emoji}</span>
                <span className="text-[10px] font-semibold">{m.key}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Category tabs */}
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const active = c.key === activeCat;
            return (
              <button
                key={c.key}
                onClick={() => setActiveCat(c.key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold border transition-colors",
                  active
                    ? "bg-success text-success-foreground border-success"
                    : "bg-secondary/60 text-muted-foreground border-border hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" /> {c.key}
              </button>
            );
          })}
        </div>

        {/* Feed */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center">
              <p className="text-sm text-muted-foreground">Inga inlägg ännu i {activeCat.toLowerCase()}.</p>
              <Button onClick={() => { setComposerCat(activeCat === "Flöde" ? "Allmänt" : activeCat); setComposerOpen(true); }} className="mt-3 rounded-full bg-success hover:bg-success/90 text-success-foreground" size="sm">
                <Plus className="h-4 w-4" /> Skriv första inlägget
              </Button>
            </div>
          ) : filtered.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              author={profiles[p.user_id]}
              rx={reactions[p.id] ?? { count: 0, mine: false }}
              comments={commentCounts[p.id] ?? 0}
              isMine={p.user_id === me}
              onToggleHeart={() => toggleHeart(p.id)}
              onDelete={() => deletePost(p.id)}
            />
          ))}
        </div>
      </div>

      <Dialog open={composerOpen} onOpenChange={setComposerOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nytt inlägg</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.filter((c) => c.key !== "Flöde").map((c) => (
                <button
                  key={c.key}
                  onClick={() => setComposerCat(c.key)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold border",
                    composerCat === c.key
                      ? "bg-success text-success-foreground border-success"
                      : "bg-secondary text-muted-foreground border-border",
                  )}
                >
                  {c.key}
                </button>
              ))}
            </div>
            <Textarea
              value={composerText}
              onChange={(e) => setComposerText(e.target.value)}
              placeholder="Vad vill du dela med communityn?"
              className="min-h-[120px]"
              maxLength={1000}
            />
            <p className="text-[10px] text-muted-foreground text-right">{composerText.length}/1000</p>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setComposerOpen(false)}>Avbryt</Button>
            <Button onClick={submitPost} disabled={posting || !composerText.trim()} className="bg-success hover:bg-success/90 text-success-foreground">
              {posting ? "Publicerar…" : "Publicera"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PostCard({ post, author, rx, comments, isMine, onToggleHeart, onDelete }: {
  post: Post;
  author: Profile | undefined;
  rx: { count: number; mine: boolean };
  comments: number;
  isMine: boolean;
  onToggleHeart: () => void;
  onDelete: () => void;
}) {
  const [menu, setMenu] = useState(false);
  const initial = (author?.display_name ?? "?").slice(0, 1).toUpperCase();
  const when = new Date(post.created_at).toLocaleString("sv-SE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).replace(",", "");
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        {author?.avatar_url ? (
          <img src={author.avatar_url} alt="" className="h-10 w-10 rounded-xl object-cover" />
        ) : (
          <div className="h-10 w-10 rounded-xl bg-success/25 text-success flex items-center justify-center font-bold">{initial}</div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{author?.display_name ?? "Användare"}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-success/20 text-success font-semibold">{post.category}</span>
            <span className="text-[11px] text-muted-foreground">{when}</span>
          </div>
        </div>
        {isMine && (
          <div className="relative">
            <button onClick={() => setMenu(!menu)} aria-label="Meny" className="text-muted-foreground p-1">
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menu && (
              <button
                onClick={() => { setMenu(false); onDelete(); }}
                className="absolute right-0 top-7 z-10 flex items-center gap-1.5 rounded-lg bg-card border border-border px-3 py-1.5 text-xs text-destructive shadow-lg"
              >
                <Trash2 className="h-3.5 w-3.5" /> Ta bort
              </button>
            )}
          </div>
        )}
      </div>
      <p className="text-sm text-foreground mt-3 whitespace-pre-wrap break-words">{post.content}</p>
      <div className="flex items-center gap-4 mt-3">
        <button onClick={onToggleHeart} className={cn("flex items-center gap-1.5 text-xs", rx.mine ? "text-destructive" : "text-muted-foreground hover:text-destructive")}>
          <Heart className={cn("h-4 w-4", rx.mine && "fill-current")} /> {rx.count}
        </button>
        <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <MessageCircle className="h-4 w-4" /> {comments}
        </span>
      </div>
    </div>
  );
}