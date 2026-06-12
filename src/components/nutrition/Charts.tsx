import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid, ScatterChart, Scatter, ComposedChart } from "recharts";

export function ExpenditureChart({ data }: { data: { date: string; tdee: number; target?: number }[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickFormatter={(v) => v.slice(5)} />
          <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" domain={["dataMin - 100", "dataMax + 100"]} />
          <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
          {data[0]?.target != null && <Line type="monotone" dataKey="target" stroke="var(--muted-foreground)" strokeDasharray="4 4" dot={false} strokeWidth={1.5} />}
          <Line type="monotone" dataKey="tdee" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function WeightTrendChart({ data }: { data: { date: string; weight: number; trend: number }[] }) {
  return (
    <div className="h-56 w-full">
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.3} />
          <XAxis dataKey="date" tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" tickFormatter={(v) => v.slice(5)} />
          <YAxis tick={{ fontSize: 10 }} stroke="var(--muted-foreground)" domain={["dataMin - 0.5", "dataMax + 0.5"]} />
          <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8 }} />
          <Scatter dataKey="weight" fill="var(--muted-foreground)" />
          <Line type="monotone" dataKey="trend" stroke="var(--primary)" strokeWidth={2.5} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}