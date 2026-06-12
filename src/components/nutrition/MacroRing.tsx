import { cn } from "@/lib/utils";

interface Props {
  consumed: number;
  target: number;
  label: string;
  unit?: string;
  color?: string;
  size?: number;
  thick?: number;
}

export function MacroRing({ consumed, target, label, unit = "g", color = "var(--primary)", size = 96, thick = 8 }: Props) {
  const r = (size - thick) / 2;
  const c = 2 * Math.PI * r;
  const pct = target > 0 ? Math.min(1, consumed / target) : 0;
  const remaining = Math.max(0, target - consumed);
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size/2} cy={size/2} r={r} stroke="var(--muted)" strokeWidth={thick} fill="none" opacity={0.3} />
          <circle
            cx={size/2} cy={size/2} r={r}
            stroke={color} strokeWidth={thick} fill="none"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - pct)}
            strokeLinecap="round"
            style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.22,1,0.36,1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-semibold tabular-nums">{Math.round(consumed)}</span>
          <span className="text-[10px] text-muted-foreground">av {Math.round(target)}{unit}</span>
        </div>
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("text-[10px] tabular-nums", remaining > 0 ? "text-muted-foreground" : "text-destructive")}>{remaining > 0 ? `${Math.round(remaining)}${unit} kvar` : `+${Math.round(-remaining)}${unit} över`}</div>
    </div>
  );
}