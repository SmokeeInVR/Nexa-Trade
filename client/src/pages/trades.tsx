import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout, GOLD, CARD, BORDER } from "@/components/app-layout";
import { Link } from "wouter";
import { useState } from "react";
import { NEXA_STRATEGIES, SIGNAL_GRADES } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const fmt = (n: number | null) => n === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);

export default function TradesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filterStrategy, setFilterStrategy] = useState("");
  const [filterGrade, setFilterGrade] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const { data: trades = [] } = useQuery({ queryKey: ["/api/trades"] });

  const deleteTrade = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/trades/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/trades"] }); toast({ title: "Trade deleted" }); },
  });

  const stratMap: Record<string, any> = Object.fromEntries(NEXA_STRATEGIES.map(s => [s.id, s]));
  const gradeColors: Record<string, string> = { A_PLUS: "#D4A53E", A: "#22c55e", B: "#60a5fa", C: "#ef4444" };

  let filtered = (trades as any[]);
  if (filterStrategy) filtered = filtered.filter((t: any) => t.nexaStrategy === filterStrategy);
  if (filterGrade) filtered = filtered.filter((t: any) => t.signalGrade === filterGrade);
  if (filterStatus) filtered = filtered.filter((t: any) => t.status === filterStatus);

  const totalPnl = filtered.reduce((s: number, t: any) => s + (t.pnlNet || 0), 0);
  const winners = filtered.filter((t: any) => (t.pnlNet || 0) > 0).length;
  const closed = filtered.filter((t: any) => t.status === "CLOSED").length;

  return (
    <AppLayout title="Trade Journal" actions={
      <Link href="/trades/new">
        <div style={{ background: GOLD, color: "#000", borderRadius: "8px", padding: "7px 16px", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>+ Log Trade</div>
      </Link>
    }>
      {/* Filters */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
        <select value={filterStrategy} onChange={e => setFilterStrategy(e.target.value)}
          style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "8px", padding: "8px 12px", color: "#fff", fontSize: "13px", cursor: "pointer" }}>
          <option value="">All Strategies</option>
          {NEXA_STRATEGIES.map(s => <option key={s.id} value={s.id}>{s.emoji} {s.label}</option>)}
        </select>
        <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)}
          style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "8px", padding: "8px 12px", color: "#fff", fontSize: "13px", cursor: "pointer" }}>
          <option value="">All Grades</option>
          {SIGNAL_GRADES.map(g => <option key={g.id} value={g.id}>{g.label}</option>)}
        </select>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "8px", padding: "8px 12px", color: "#fff", fontSize: "13px", cursor: "pointer" }}>
          <option value="">All Status</option>
          <option value="OPEN">Open</option>
          <option value="CLOSED">Closed</option>
        </select>
      </div>

      {/* Summary */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "16px", fontSize: "13px", color: "#888" }}>
        <span>{filtered.length} trades</span>
        <span style={{ color: closed > 0 ? (totalPnl >= 0 ? "#22c55e" : "#ef4444") : "#888" }}>P&L: {fmt(totalPnl)}</span>
        {closed > 0 && <span>Win Rate: {((winners / closed) * 100).toFixed(1)}%</span>}
      </div>

      {/* Trade list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#666" }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>📋</div>
          <div style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>No trades logged yet</div>
          <div style={{ fontSize: "13px", marginBottom: "24px" }}>Log your first Nexa Trading setup</div>
          <Link href="/trades/new">
            <div style={{ display: "inline-block", background: GOLD, color: "#000", borderRadius: "10px", padding: "12px 24px", fontWeight: 700, cursor: "pointer" }}>Log First Trade</div>
          </Link>
        </div>
      ) : filtered.map((trade: any) => {
        const strat = stratMap[trade.nexaStrategy];
        const pnl = trade.pnlNet;
        const pnlColor = pnl === null ? "#888" : pnl >= 0 ? "#22c55e" : "#ef4444";
        const gradeLabel = trade.signalGrade.replace("_PLUS", "+").replace("_", "");

        return (
          <Link key={trade.id} href={`/trades/${trade.id}`}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "14px 16px", marginBottom: "8px", cursor: "pointer", transition: "border-color 0.15s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{ fontSize: "20px" }}>{strat?.emoji || "📊"}</div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "15px" }}>{trade.symbol} <span style={{ color: trade.optionType === "CALL" ? "#22c55e" : "#ef4444", fontSize: "13px" }}>{trade.optionType}</span></div>
                    <div style={{ fontSize: "11px", color: "#666" }}>${trade.strike} · {new Date(trade.expiration).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {trade.contracts}c · {trade.dte}DTE</div>
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 800, fontSize: "16px", color: pnlColor }}>{pnl !== null ? fmt(pnl) : trade.status === "OPEN" ? "OPEN" : "—"}</div>
                  {trade.rMultiple !== null && <div style={{ fontSize: "11px", color: pnlColor }}>{trade.rMultiple.toFixed(2)}R</div>}
                </div>
              </div>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: 700, background: `${strat?.color || GOLD}20`, color: strat?.color || GOLD }}>{strat?.label}</span>
                <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: 700, background: `${gradeColors[trade.signalGrade]}20`, color: gradeColors[trade.signalGrade] }}>Grade {gradeLabel}</span>
                {trade.vwapBoost && <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: 700, background: "rgba(96,165,250,0.15)", color: "#60a5fa" }}>VWAP Boost</span>}
                <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "10px", fontWeight: 600, background: trade.status === "OPEN" ? "rgba(212,165,62,0.15)" : "rgba(255,255,255,0.05)", color: trade.status === "OPEN" ? GOLD : "#666" }}>{trade.status === "OPEN" ? "OPEN" : trade.exitReason || "CLOSED"}</span>
                {trade.emotionTag && <span style={{ padding: "2px 8px", borderRadius: "12px", fontSize: "10px", background: "rgba(255,255,255,0.05)", color: "#888" }}>{trade.emotionTag}</span>}
              </div>
              {trade.notes && <div style={{ marginTop: "8px", fontSize: "12px", color: "#666", fontStyle: "italic" }}>{trade.notes.slice(0, 100)}{trade.notes.length > 100 ? "..." : ""}</div>}
            </div>
          </Link>
        );
      })}
    </AppLayout>
  );
}
