import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getCoachData, sendCoachMessage, clearCoachHistory } from "@/lib/coach.functions";
import { Button } from "@/components/ui/button";
import { Sparkles, Send, Trash2, Brain, HeartPulse } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSubscription, hasProAccess } from "@/lib/subscription";
import { LockedFeature } from "@/components/fitflow/LockedFeature";

export const Route = createFileRoute("/_authenticated/coach")({ component: CoachPage });

type Msg = { id: string; role: "user" | "assistant" | "system"; content: string };
type Profile = {
  experience_level: string | null;
  training_goals: string[] | null;
  injuries: Array<{ body_part?: string; description?: string }> | null;
  age: number | null;
  gender: string | null;
  notes: string | null;
} | null;

function CoachPage() {
  const { tier, isAdmin, loading: subLoading } = useSubscription();
  const fetchData = useServerFn(getCoachData);
  const sendFn = useServerFn(sendCoachMessage);
  const clearFn = useServerFn(clearCoachHistory);

  const [messages, setMessages] = useState<Msg[]>([]);
  const [profile, setProfile] = useState<Profile>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = async () => {
    const data = await fetchData();
    setProfile(data.profile as Profile);
    setMessages(data.messages as Msg[]);
    setLoading(false);
  };

  useEffect(() => { if (hasProAccess(tier, isAdmin)) void load(); }, [tier, isAdmin]);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, sending]);

  const send = async () => {
    const content = input.trim();
    if (!content || sending) return;
    setInput("");
    setSending(true);
    const optimistic: Msg = { id: "tmp-" + Date.now(), role: "user", content };
    setMessages((m) => [...m, optimistic]);
    try {
      const res = await sendFn({ data: { content } });
      setMessages((m) => [...m, { id: "a-" + Date.now(), role: "assistant", content: res.reply }]);
      // refresh profile in background
      void fetchData().then((d) => setProfile(d.profile as Profile));
    } catch (e: any) {
      setMessages((m) => [...m, { id: "err-" + Date.now(), role: "assistant", content: "⚠️ " + (e.message ?? "Något gick fel.") }]);
    } finally {
      setSending(false);
    }
  };

  const clear = async () => {
    if (!confirm("Rensa hela chatten med coachen?")) return;
    await clearFn();
    setMessages([]);
  };

  const isEmpty = messages.length === 0;

  if (subLoading) return <div className="max-w-md mx-auto py-10 text-center text-sm text-muted-foreground">Laddar…</div>;
  if (!hasProAccess(tier, isAdmin)) {
    return (
      <LockedFeature
        title="AI-coachen är en Pro-funktion"
        description="Få personlig coachning, anpassade råd och djupgående analys genom att uppgradera till FitFlow Pro."
        requiredPlans={["FitFlow Pro"]}
      />
    );
  }

  return (
    <div className="max-w-md mx-auto flex flex-col h-[calc(100vh-5rem)]">
      <header className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold leading-tight">FitFlow Coach</h1>
            <p className="text-[11px] text-muted-foreground">Lär känna dig och anpassar träningen</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button size="sm" variant="ghost" onClick={clear}><Trash2 className="h-4 w-4" /></Button>
        )}
      </header>

      {profile && (profile.experience_level || profile.injuries?.length || profile.training_goals?.length) ? (
        <div className="px-4 pt-3 flex gap-2 flex-wrap">
          {profile.experience_level && <Chip icon={<Brain className="h-3 w-3" />}>{profile.experience_level}</Chip>}
          {profile.training_goals?.slice(0, 3).map((g, i) => <Chip key={i}>{g}</Chip>)}
          {profile.injuries?.slice(0, 2).map((inj, i) => (
            <Chip key={"i" + i} tone="danger" icon={<HeartPulse className="h-3 w-3" />}>{inj.body_part ?? "skada"}</Chip>
          ))}
        </div>
      ) : null}

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <p className="text-sm text-muted-foreground text-center pt-10">Laddar…</p>
        ) : isEmpty ? (
          <EmptyState onPick={(t) => setInput(t)} />
        ) : (
          messages.map((m) => <Bubble key={m.id} msg={m} />)
        )}
        {sending && (
          <div className="flex gap-1.5 text-muted-foreground text-sm px-1">
            <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
            <span className="h-2 w-2 rounded-full bg-current animate-pulse [animation-delay:120ms]" />
            <span className="h-2 w-2 rounded-full bg-current animate-pulse [animation-delay:240ms]" />
          </div>
        )}
      </div>

      <div className="border-t border-border p-3 bg-card/50">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            placeholder="Berätta om dina mål, skador, eller fråga om en övning…"
            rows={1}
            className="flex-1 resize-none rounded-xl bg-muted px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40 max-h-32"
          />
          <Button onClick={send} disabled={sending || !input.trim()} size="icon" className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ msg }: { msg: Msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed",
          isUser ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted text-foreground rounded-bl-md",
        )}
      >
        {msg.content}
      </div>
    </div>
  );
}

function Chip({ children, icon, tone }: { children: React.ReactNode; icon?: React.ReactNode; tone?: "danger" }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full border",
      tone === "danger" ? "bg-destructive/10 border-destructive/30 text-destructive" : "bg-muted border-border text-muted-foreground",
    )}>
      {icon}{children}
    </span>
  );
}

const SUGGESTIONS = [
  "Jag är nybörjare och vill bygga muskler",
  "Jag har ont i knäet – vad ska jag undvika?",
  "Rekommendera vikter på bänkpress",
  "Hur ofta ska jag träna i veckan?",
];

function EmptyState({ onPick }: { onPick: (t: string) => void }) {
  return (
    <div className="pt-6 text-center space-y-4">
      <div className="mx-auto h-14 w-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
        <Sparkles className="h-7 w-7 text-primary-foreground" />
      </div>
      <div>
        <h2 className="font-semibold">Hej! Jag är din FitFlow-coach</h2>
        <p className="text-sm text-muted-foreground mt-1 px-4">
          Berätta om dig själv – mål, erfarenhet, ev. skador – så anpassar jag träningen och föreslår vikter.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-2 px-2 pt-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="text-left text-sm rounded-xl border border-border bg-card hover:bg-muted px-3 py-2 transition"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}