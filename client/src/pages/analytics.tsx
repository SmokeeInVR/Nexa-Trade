import { useQuery } from "@tanstack/react-query";
import { AppLayout, GOLD, CARD, BORDER } from "@/components/app-layout";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from "recharts";
import { NEXA_STRATEGIES } from "@shared/schema";

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function KPI({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "16px", flex: 1, minWidth: "140px" }}>
      <div style={{ fontSize: "10px", color: "#666", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>{label}</div>
      <div style={{ fontSize: "24px", fontWeight: 800, color: color || "#fff" }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: "#888", marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}

function StrategyRow({ row }: { row: any }) {
  const strat = NEXA_STRATEGIES.find(s => row.label.includes(s.label));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: `1px solid ${BORDER}` }}>
      <div style={{ fontSize: "20px", width: "28px", flexShrink: 0 }}>{strat?.emoji || "📊"}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: "13px" }}>{row.label}</div>
        <div style={{ fontSize: "11px", color: "#666" }}>{row.trades} trades{row.lowSample ? " ⚠ Low sample" : ""}</div>
      </div>
      <div style={{ textAlign: "center", minWidth: "60px" }}>
        <div style={{ fontWeight: 700, color: row.winRate >= 0.5 ? "#22c55e" : "#ef4444" }}>{pct(row.winRate)}</div>
        <div style={{ fontSize: "10px", color: "#666" }}>Win Rate</div>
      </div>
      <div style={{ textAlign: "center", minWidth: "60px" }}>
        <div style={{ fontWeight: 700, color: row.avgR >= 0 ? "#22c55e" : "#ef4444" }}>{row.avgR ? row.avgR.toFixed(2) + "R" : "—"}</div>
        <div style={{ fontSize: "10px", color: "#666" }}>Avg R</div>
      </div>
      <div style={{ textAlign: "right", minWidth: "80px" }}>
        <div style={{ fontWeight: 700, color: row.totalPnlNet >= 0 ? "#22c55e" : "#ef4444" }}>{fmt(row.totalPnlNet)}</div>
        <div style={{ fontSize: "10px", color: "#666" }}>P&L</div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: kpis } = useQuery({ queryKey: ["/api/analytics/kpis"] });
  const { data: equity } = useQuery({ queryKey: ["/api/analytics/equity-curve"] });
  const { data: strategies } = useQuery({ queryKey: ["/api/analytics/strategies"] });
  const { data: grades } = useQuery({ queryKey: ["/api/analytics/grades"] });
  const { data: dte } = useQuery({ queryKey: ["/api/analytics/dte"] });
  const { data: calendar } = useQuery({ queryKey: ["/api/analytics/calendar"] });

  const k = kpis as any;
  const equityData = (equity as any[]) || [];
  const stratRows = (strategies as any[]) || [];
  const gradeRows = (grades as any[]) || [];
  const dteRows = (dte as any[]) || [];

  const gradeColors: Record<string, string> = { "A+": "#D4A53E", "A": "#22c55e", "B": "#60a5fa", "C": "#ef4444" };

  return (
    <AppLayout title="Analytics">
      {/* KPIs */}
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "20px" }}>
        <KPI label="Total P&L" value={k ? fmt(k.totalPnlNet) : "—"} color={k?.totalPnlNet >= 0 ? "#22c55e" : "#ef4444"} />
        <KPI label="Win Rate" value={k ? pct(k.winRate) : "—"} sub={k ? `${k.winningTrades}W / ${k.losingTrades}L` : ""} color={k?.winRate >= 0.5 ? "#22c55e" : "#ef4444"} />
        <KPI label="Avg R" value={k ? k.averageR.toFixed(2) + "R" : "—"} />
        <KPI label="Profit Factor" value={k ? (k.profitFactor === Infinity ? "∞" : k.profitFactor.toFixed(2)) : "—"} color={k?.profitFactor >= 1.5 ? "#22c55e" : "#ef4444"} />
        <KPI label="Expectancy" value={k ? fmt(k.expectancy) : "—"} sub="per trade" />
        <KPI label="Max Drawdown" value={k ? fmt(k.maxDrawdown) : "—"} color="#ef4444" />
        <KPI label="Total Trades" value={k ? k.totalTrades.toString() : "—"} />
      </div>

      {/* Equity Curve */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "16px 20px", marginBottom: "20px" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "16px" }}>Equity Curve</div>
        {equityData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={equityData}>
              <defs><linearGradient id="eq" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={GOLD} stopOpacity={0.3}/><stop offset="95%" stopColor={GOLD} stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke={BORDER} />
              <XAxis dataKey="date" tick={{ fill: "#666", fontSize: 10 }} tickLine={false} />
              <YAxis tick={{ fill: "#666", fontSize: 10 }} tickLine={false} tickFormatter={v => fmt(v)} />
              <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "8px" }} formatter={(v: any) => [fmt(v), "Equity"]} />
              <Area type="monotone" dataKey="equity" stroke={GOLD} strokeWidth={2} fill="url(#eq)" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: "200px", display: "flex", alignItems: "center", justifyContent: "center", color: "#666", fontSize: "13px" }}>Log closed trades to see equity curve</div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        {/* Strategy Breakdown */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "16px 20px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "14px" }}>By Strategy</div>
          {stratRows.length > 0 ? stratRows.map((r: any) => <StrategyRow key={r.label} row={r} />) : <div style={{ color: "#666", fontSize: "13px" }}>No data yet</div>}
        </div>

        {/* Grade Breakdown */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "16px 20px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "14px" }}>By Grade</div>
          {gradeRows.length > 0 ? (
            <div>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={gradeRows} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <XAxis dataKey="label" tick={{ fill: "#666", fontSize: 11 }} tickLine={false} />
                  <YAxis hide />
                  <Tooltip contentStyle={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "8px" }} formatter={(v: any) => [pct(v), "Win Rate"]} />
                  <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                    {gradeRows.map((r: any) => <Cell key={r.label} fill={gradeColors[r.label] || GOLD} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {gradeRows.map((r: any) => (
                <div key={r.label} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${BORDER}`, fontSize: "13px" }}>
                  <span style={{ fontWeight: 700, color: gradeColors[r.label] }}>{r.label}</span>
                  <span>{r.trades} trades</span>
                  <span style={{ color: r.winRate >= 0.5 ? "#22c55e" : "#ef4444" }}>{pct(r.winRate)}</span>
                  <span style={{ color: r.totalPnlNet >= 0 ? "#22c55e" : "#ef4444" }}>{fmt(r.totalPnlNet)}</span>
                </div>
              ))}
            </div>
          ) : <div style={{ color: "#666", fontSize: "13px" }}>No data yet</div>}
        </div>
      </div>

      {/* DTE Breakdown */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "16px 20px" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "14px" }}>By DTE (Days to Expiration)</div>
        {dteRows.length > 0 ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "10px" }}>
            {dteRows.map((r: any) => (
              <div key={r.label} style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: "8px", padding: "12px" }}>
                <div style={{ fontSize: "16px", fontWeight: 800, color: GOLD, marginBottom: "4px" }}>{r.label}</div>
                <div style={{ fontSize: "11px", color: "#666", marginBottom: "6px" }}>{r.trades} trades</div>
                <div style={{ fontWeight: 700, color: r.winRate >= 0.5 ? "#22c55e" : "#ef4444" }}>{pct(r.winRate)} WR</div>
                <div style={{ fontWeight: 700, color: r.totalPnlNet >= 0 ? "#22c55e" : "#ef4444", fontSize: "13px" }}>{fmt(r.totalPnlNet)}</div>
              </div>
            ))}
          </div>
        ) : <div style={{ color: "#666", fontSize: "13px" }}>No data yet</div>}
      </div>
    </AppLayout>
  );
}
