import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout, GOLD, CARD, BORDER } from "@/components/app-layout";
import { Link } from "wouter";
import { useState, useEffect } from "react";
import { NEXA_STRATEGIES, type TradingSession } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);

function StatBox({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "14px 16px", flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: "10px", color: "#666", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "6px" }}>{label}</div>
      <div style={{ fontSize: "22px", fontWeight: 800, color: color || "#fff" }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: "#666", marginTop: "3px" }}>{sub}</div>}
    </div>
  );
}

function SessionTimer({ minutesRemaining, sessionActive }: { minutesRemaining: number; sessionActive: boolean }) {
  const [tick, setTick] = useState(0);
  useEffect(() => { const i = setInterval(() => setTick(t => t + 1), 60000); return () => clearInterval(i); }, []);
  
  if (!sessionActive) {
    const now = new Date();
    const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const h = et.getHours(), m = et.getMinutes();
    if (h < 9 || (h === 9 && m < 30)) return <div style={{ fontSize: "12px", color: "#666" }}>⏰ Session opens at 9:30 AM ET</div>;
    return <div style={{ fontSize: "12px", color: "#666" }}>🔴 Session closed — cutoff was 11:30 AM ET</div>;
  }
  const h = Math.floor(minutesRemaining / 60);
  const m = minutesRemaining % 60;
  const pct = (minutesRemaining / 120) * 100;
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", fontSize: "12px" }}>
        <span style={{ color: "#22c55e", fontWeight: 700 }}>🟢 Session Active</span>
        <span style={{ color: GOLD, fontWeight: 700 }}>{h > 0 ? `${h}h ${m}m` : `${m}m`} remaining</span>
      </div>
      <div style={{ height: "6px", background: "rgba(255,255,255,0.08)", borderRadius: "3px", overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: GOLD, borderRadius: "3px", transition: "width 0.5s" }} />
      </div>
    </div>
  );
}

export default function SessionPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [levelInput, setLevelInput] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["/api/sessions/today"],
    refetchInterval: 30000,
  });

  const updateSession = useMutation({
    mutationFn: (updates: any) => apiRequest("POST", "/api/sessions", updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/sessions/today"] }),
  });

  if (isLoading) return (
    <AppLayout title="Session">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "200px", color: "#666" }}>Loading session...</div>
    </AppLayout>
  );

  const { session, trades = [], status } = (data as any) || {};
  const manualLevels: number[] = session?.manualLevels ? JSON.parse(session.manualLevels) : [];
  const sessionWatchlist: string[] = session?.watchlist ? JSON.parse(session.watchlist) : [];

  const addLevel = () => {
    const val = parseFloat(levelInput);
    if (!val) return;
    const updated = [...manualLevels, val].sort((a, b) => b - a);
    updateSession.mutate({ date: session?.date || new Date().toISOString().split("T")[0], manualLevels: JSON.stringify(updated) });
    setLevelInput("");
  };

  const removeLevel = (lvl: number) => {
    const updated = manualLevels.filter(l => l !== lvl);
    updateSession.mutate({ date: session?.date, manualLevels: JSON.stringify(updated) });
  };

  const pnlColor = (status?.pnlToday || 0) >= 0 ? "#22c55e" : "#ef4444";
  const lossUsedPct = status ? Math.min(Math.abs(Math.min(0, status.pnlToday)) / status.maxLossLimit * 100, 100) : 0;
  const walkAwayPct = status ? Math.min(Math.max(0, status.pnlToday) / status.walkAwayTarget * 100, 100) : 0;

  return (
    <AppLayout title="Session" actions={
      <Link href="/trades/new">
        <div style={{ background: GOLD, color: "#000", borderRadius: "8px", padding: "7px 16px", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>+ Log Trade</div>
      </Link>
    }>
      {/* Date */}
      <div style={{ marginBottom: "20px" }}>
        <div style={{ fontSize: "13px", color: "#666", marginBottom: "2px" }}>{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</div>
        <div style={{ fontSize: "24px", fontWeight: 900 }}>Trading Session</div>
      </div>

      {/* Session timer */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "14px 16px", marginBottom: "14px" }}>
        <SessionTimer minutesRemaining={status?.minutesRemaining || 0} sessionActive={status?.sessionActive || false} />
      </div>

      {/* Risk limits */}
      {(status?.maxLossHit || status?.walkAwayHit) && (
        <div style={{ background: status.maxLossHit ? "rgba(239,68,68,0.1)" : "rgba(34,197,94,0.1)", border: `1px solid ${status.maxLossHit ? "#ef4444" : "#22c55e"}`, borderRadius: "10px", padding: "12px 16px", marginBottom: "14px", fontWeight: 700, color: status.maxLossHit ? "#ef4444" : "#22c55e" }}>
          {status.maxLossHit ? "🛑 MAX DAILY LOSS HIT — Stop trading for today" : "🎯 WALK AWAY TARGET REACHED — Protect your gains"}
        </div>
      )}

      {/* KPI row */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
        <StatBox label="Today P&L" value={fmt(status?.pnlToday || 0)} color={pnlColor} />
        <StatBox label="Trades" value={`${status?.tradesCount || 0}/${status ? 3 : "—"}`} sub="today / max" />
        <StatBox label="Max Loss" value={fmt(status?.maxLossLimit || 0)} sub={`${lossUsedPct.toFixed(0)}% used`} />
        <StatBox label="Walk Away" value={fmt(status?.walkAwayTarget || 0)} sub={`${walkAwayPct.toFixed(0)}% reached`} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
        
        {/* Key Levels */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "14px 16px" }}>
          <div style={{ fontSize: "10px", color: "#666", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px" }}>Key Levels</div>
          {[
            { label: "PDH", value: session?.pdh, key: "pdh" },
            { label: "PDL", value: session?.pdl, key: "pdl" },
            { label: "PDC", value: session?.pdc, key: "pdc" },
            { label: "PWH", value: session?.pwh, key: "pwh" },
            { label: "PWL", value: session?.pwl, key: "pwl" },
            { label: "PMH", value: session?.pmh, key: "pmh" },
            { label: "PML", value: session?.pml, key: "pml" },
          ].map(({ label, value, key }) => (
            <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
              <span style={{ fontSize: "11px", color: "#666", width: "40px" }}>{label}</span>
              <input
                type="number"
                step="0.01"
                defaultValue={value || ""}
                placeholder="—"
                onBlur={e => {
                  const v = parseFloat(e.target.value);
                  if (v) updateSession.mutate({ date: session?.date || new Date().toISOString().split("T")[0], [key]: v.toString() });
                }}
                style={{ background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: "6px", padding: "4px 8px", color: "#fff", fontSize: "12px", fontFamily: "monospace", width: "90px", textAlign: "right" }}
              />
            </div>
          ))}
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "10px", marginTop: "4px" }}>
            <div style={{ fontSize: "10px", color: "#666", marginBottom: "6px" }}>Manual Levels</div>
            {manualLevels.map(lvl => (
              <div key={lvl} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                <span style={{ fontFamily: "monospace", fontSize: "12px", color: GOLD }}>{lvl.toFixed(2)}</span>
                <button onClick={() => removeLevel(lvl)} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "14px" }}>✕</button>
              </div>
            ))}
            <div style={{ display: "flex", gap: "6px", marginTop: "6px" }}>
              <input type="number" step="0.01" value={levelInput} onChange={e => setLevelInput(e.target.value)} onKeyDown={e => e.key === "Enter" && addLevel()} placeholder="Add level" style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: "6px", padding: "6px 8px", color: "#fff", fontSize: "12px" }} />
              <button onClick={addLevel} style={{ background: GOLD, color: "#000", border: "none", borderRadius: "6px", padding: "6px 12px", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>+</button>
            </div>
          </div>
        </div>

        {/* Today's Trades */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "14px 16px" }}>
          <div style={{ fontSize: "10px", color: "#666", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "12px" }}>Today's Trades</div>
          {trades.length === 0 ? (
            <div style={{ textAlign: "center", padding: "20px 0", color: "#666", fontSize: "13px" }}>
              No trades logged yet today
              <div style={{ marginTop: "12px" }}>
                <Link href="/trades/new">
                  <div style={{ background: GOLD, color: "#000", borderRadius: "8px", padding: "10px", fontWeight: 700, fontSize: "13px", cursor: "pointer", textAlign: "center" }}>Log First Trade</div>
                </Link>
              </div>
            </div>
          ) : trades.map((trade: any) => {
            const strat = NEXA_STRATEGIES.find(s => s.id === trade.nexaStrategy);
            const pnl = trade.pnlNet;
            const pnlColor = pnl === null ? "#666" : pnl >= 0 ? "#22c55e" : "#ef4444";
            return (
              <Link key={trade.id} href={`/trades/${trade.id}`}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${BORDER}`, cursor: "pointer" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "13px" }}>{trade.symbol} {trade.optionType}</div>
                    <div style={{ fontSize: "10px", color: "#666" }}>{strat?.emoji} {strat?.label} · {trade.signalGrade.replace("_", "+")} · {trade.contracts}c</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: pnlColor, fontSize: "13px" }}>{pnl !== null ? fmt(pnl) : trade.status === "OPEN" ? "OPEN" : "—"}</div>
                    <div style={{ fontSize: "10px", color: "#666" }}>{trade.exitReason || trade.status}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Pre-market notes */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "14px 16px", marginTop: "14px" }}>
        <div style={{ fontSize: "10px", color: "#666", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px" }}>Pre-Market Notes & Bias</div>
        <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
          {["BULL", "BEAR", "NEUTRAL"].map(bias => (
            <button key={bias} onClick={() => updateSession.mutate({ date: session?.date || new Date().toISOString().split("T")[0], marketBias: bias })}
              style={{ padding: "6px 14px", borderRadius: "6px", border: "1px solid", borderColor: session?.marketBias === bias ? GOLD : BORDER, background: session?.marketBias === bias ? "rgba(212,165,62,0.15)" : "transparent", color: session?.marketBias === bias ? GOLD : "#666", fontWeight: 700, fontSize: "11px", cursor: "pointer" }}>
              {bias === "BULL" ? "🟢 " : bias === "BEAR" ? "🔴 " : "⚪ "}{bias}
            </button>
          ))}
        </div>
        <textarea
          defaultValue={session?.preMarketNotes || ""}
          placeholder="Market structure, key levels to watch, economic events, session plan..."
          onBlur={e => updateSession.mutate({ date: session?.date || new Date().toISOString().split("T")[0], preMarketNotes: e.target.value })}
          style={{ width: "100%", background: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}`, borderRadius: "8px", padding: "10px 12px", color: "#fff", fontSize: "13px", resize: "vertical", minHeight: "80px", fontFamily: "inherit" }}
        />
      </div>
    </AppLayout>
  );
}
