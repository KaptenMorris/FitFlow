import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/fitflow-logo.png";

export function AppHeader() {
  const [name, setName] = useState("");
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setName((u?.user_metadata?.display_name as string) || u?.email?.split("@")[0] || "");
    });
  }, []);
  const initial = (name || "?").charAt(0).toUpperCase();
  return (
    <header className="flex items-center justify-between px-4 py-3">
      <div className="flex items-center gap-2">
        <img src={logo} alt="FitFlow" width={32} height={32} />
        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-accent/20 text-accent border border-accent/40">
          PRO
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          God morgon, <span className="font-semibold text-foreground">{name}</span>
        </span>
        <div className="h-8 w-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold">
          {initial}
        </div>
      </div>
    </header>
  );
}
