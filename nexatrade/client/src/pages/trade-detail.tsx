import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { AppLayout, GOLD, CARD, BORDER } from "@/components/app-layout";
import { useState } from "react";
import { NEXA_STRATEGIES, SIGNAL_GRADES, EXIT_REASONS } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const fmt = (n: number | null) => n === null ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);

export default function TradeDetailPage() {
  const [, params] = useRoute("/trades/:id");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [exitPrice, setExitPrice] = useState("");
  const [exitReason, setExitReason] = useState("TP1");
  const [aiDebrief, setAiDebrief] = useState("");
  const [debriefing, setDebriefing] = useState(false);

  const { data: trade, isLoading } = useQuery({
    queryKey: [`/api/trades/${params?.id}`],
    enabled: !!params?.id,
  });

  const closeMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/trades/${params?.id}`, {
      exitPrice: parseFloat(exitPrice),
      exitTime: new Date().toISOString(),
      exitReason,
      status: "CLOSED",
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [`/api/trades/${params?.id}`] });
      qc.invalidateQueries({ queryKey: ["/api/trades"] });
      qc.invalidateQueries({ queryKey: ["/api/sessions/today"] });
      toast({ title: "Trade closed ✅" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => apiRequest("DELETE", `/api/trades/${params?.id}`),
    onSuccess: () => { navigate("/trades"); toast({ title: "Trade deleted" }); },
  });

  if (isLoading) return <AppLayout title="Trade"><div style={{ color: "#666", padding: "40px", textAlign: "center" }}>Loading...</div></AppLayout>;
  
  const t = trade as any;
  if (!t) return <AppLayout title="Trade"><div style={{ color: "#666", padding: "40px", textAlign: "center" }}>Trade not found</div></AppLayout>;

  const strat = NEXA_STRATEGIES.find(s => s.id === t.nexaStrategy);
  const gradeColors: Record<string, string> = { A_PLUS: "#D4A53E", A: "#22c55e", B: "#60a5fa", C: "#ef4444" };
  const pnlColor = t.pnlNet === null ? "#888" : t.pnlNet >= 0 ? "#22c55e" : "#ef4444";

  const previewPnl = exitPrice && t.entryPrice ? ((parseFloat(exitPrice) - parseFloat(t.entryPrice)) * (t.contracts || 1) * 100) : null;

  const runDebrief = async () => {
    setDebriefing(true);
    try {
      const key = localStorage.getItem("nexafit_key") || localStorage.getItem("nexa_api_key") || localStorage.getItem("nexa_key") || "";
      const resp = await fetch("/api/ai/analyze-chart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: key,
          tradeContext: t,
          image: t.chartScreenshot || "",
          mediaType: "image/jpeg",
        }),
      });
      // Actually use weekly debrief endpoint for single trade review
      const r = await apiRequest("POST", "/api/ai/weekly-debrief", {});
      const data = await r.json();
      setAiDebrief(data.content?.[0]?.text || "Analysis complete");
    } catch { toast({ title: "Analysis failed", variant: "destructive" }); }
    setDebriefing(false);
  };

  return (
    <AppLayout title={`${t.symbol} ${t.optionType}`}>
      {/* Header card */}
      <div style={{ background: CARD, border: `1px solid ${strat?.color || GOLD}44`, borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "6px" }}>
              <span style={{ fontSize: "24px" }}>{strat?.emoji}</span>
              <div>
                <div style={{ fontWeight: 900, fontSize: "20px" }}>{t.symbol} <span style={{ color: t.optionType === "CALL" ? "#22c55e" : "#ef4444" }}>{t.optionType}</span></div>
                <div style={{ fontSize: "13px", color: "#888" }}>${t.strike} · {new Date(t.expiration).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {t.dte} DTE · {t.contracts} contracts</div>
              </div>
            </div>
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 700, background: `${strat?.color}20`, color: strat?.color }}>{strat?.label}</span>
              <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 700, background: `${gradeColors[t.signalGrade]}20`, color: gradeColors[t.signalGrade] }}>Grade {t.signalGrade.replace("_PLUS", "+").replace("_","")}</span>
              {t.vwapBoost && <span style={{ padding: "3px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: 700, background: "rgba(96,165,250,0.15)", color: "#60a5fa" }}>VWAP Boost</span>}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontWeight: 900, fontSize: "28px", color: pnlColor }}>{t.pnlNet !== null ? fmt(t.pnlNet) : t.status}</div>
            {t.rMultiple !== null && <div style={{ fontSize: "14px", color: pnlColor, fontWeight: 700 }}>{t.rMultiple.toFixed(2)}R</div>}
          </div>
        </div>
      </div>

      {/* Entry / Exit */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "14px" }}>
          <div style={{ fontSize: "10px", color: "#666", letterSpacing: "2px", marginBottom: "10px" }}>ENTRY</div>
          <div style={{ fontSize: "24px", fontWeight: 900, marginBottom: "4px" }}>${t.entryPrice}</div>
          <div style={{ fontSize: "12px", color: "#888" }}>{new Date(t.entryTime).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
          {t.stopPrice && <div style={{ fontSize: "12px", color: "#ef4444", marginTop: "6px" }}>SL: ${t.stopPrice}</div>}
          {t.tp1Price && <div style={{ fontSize: "12px", color: "#22c55e", marginTop: "2px" }}>TP1: ${t.tp1Price} · TP2: ${t.tp2Price || "—"} · TP3: ${t.tp3Price || "—"}</div>}
        </div>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "14px" }}>
          <div style={{ fontSize: "10px", color: "#666", letterSpacing: "2px", marginBottom: "10px" }}>EXIT</div>
          {t.exitPrice ? (
            <div>
              <div style={{ fontSize: "24px", fontWeight: 900, color: pnlColor, marginBottom: "4px" }}>${t.exitPrice}</div>
              <div style={{ fontSize: "12px", color: "#888" }}>{t.exitTime ? new Date(t.exitTime).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : ""}</div>
              <div style={{ fontSize: "12px", color: GOLD, marginTop: "6px" }}>{EXIT_REASONS.find(e => e.id === t.exitReason)?.emoji} {EXIT_REASONS.find(e => e.id === t.exitReason)?.label || t.exitReason}</div>
            </div>
          ) : (
            <div style={{ color: GOLD, fontWeight: 700 }}>OPEN</div>
          )}
        </div>
      </div>

      {/* Filters passed */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "14px 16px", marginBottom: "16px" }}>
        <div style={{ fontSize: "10px", color: "#666", letterSpacing: "2px", marginBottom: "10px" }}>FILTERS</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px" }}>
          {[
            { label: "ATR Volatility", val: t.filterAtr },
            { label: "Time < 11:30 AM", val: t.filterTimeOfDay },
            { label: "ORB Range Size", val: t.filterOrbSize },
            { label: "No Key Level Conflict", val: t.filterKeyLevel },
          ].map(({ label, val }) => (
            <div key={label} style={{ fontSize: "12px", color: val ? "#22c55e" : "#ef4444" }}>{val ? "✓" : "✗"} {label}</div>
          ))}
        </div>
      </div>

      {/* Notes */}
      {t.notes && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "14px 16px", marginBottom: "16px" }}>
          <div style={{ fontSize: "10px", color: "#666", letterSpacing: "2px", marginBottom: "8px" }}>NOTES</div>
          <div style={{ fontSize: "13px", lineHeight: 1.6, color: "#ddd" }}>{t.notes}</div>
        </div>
      )}

      {/* Chart */}
      {t.chartScreenshot && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "14px 16px", marginBottom: "16px" }}>
          <div style={{ fontSize: "10px", color: "#666", letterSpacing: "2px", marginBottom: "10px" }}>CHART</div>
          <img src={`data:image/jpeg;base64,${t.chartScreenshot}`} style={{ width: "100%", borderRadius: "8px" }} />
        </div>
      )}

      {/* Close trade */}
      {t.status === "OPEN" && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
          <div style={{ fontSize: "10px", color: "#666", letterSpacing: "2px", marginBottom: "12px" }}>CLOSE TRADE</div>
          <input type="number" step="0.01" placeholder="Exit price" value={exitPrice} onChange={e => setExitPrice(e.target.value)}
            style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: "8px", padding: "10px 12px", color: "#fff", fontSize: "14px", marginBottom: "10px", boxSizing: "border-box" }} />
          {previewPnl !== null && (
            <div style={{ fontSize: "13px", color: previewPnl >= 0 ? "#22c55e" : "#ef4444", fontWeight: 700, marginBottom: "10px" }}>P&L: {fmt(previewPnl)}</div>
          )}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginBottom: "12px" }}>
            {EXIT_REASONS.map(r => (
              <button key={r.id} onClick={() => setExitReason(r.id)}
                style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid", borderColor: exitReason === r.id ? GOLD : BORDER, background: exitReason === r.id ? "rgba(212,165,62,0.15)" : "transparent", color: exitReason === r.id ? GOLD : "#888", fontSize: "11px", fontWeight: exitReason === r.id ? 700 : 400, cursor: "pointer" }}>
                {r.emoji} {r.label}
              </button>
            ))}
          </div>
          <button onClick={() => closeMutation.mutate()} disabled={!exitPrice || closeMutation.isPending}
            style={{ width: "100%", padding: "12px", background: GOLD, color: "#000", border: "none", borderRadius: "8px", fontWeight: 700, fontSize: "14px", cursor: "pointer", opacity: (!exitPrice || closeMutation.isPending) ? 0.6 : 1 }}>
            {closeMutation.isPending ? "Closing..." : "Close Trade"}
          </button>
        </div>
      )}

      {/* AI Debrief */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
        <div style={{ fontSize: "10px", color: "#666", letterSpacing: "2px", marginBottom: "12px" }}>AI ANALYSIS</div>
        {aiDebrief ? (
          <div style={{ fontSize: "13px", lineHeight: 1.7, color: "#ddd", whiteSpace: "pre-wrap" }}>{aiDebrief}</div>
        ) : (
          <button onClick={runDebrief} disabled={debriefing}
            style={{ width: "100%", padding: "12px", background: "none", border: `1px solid ${GOLD}44`, borderRadius: "8px", color: GOLD, fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>
            {debriefing ? "Analyzing..." : "🤖 Get AI Trade Review"}
          </button>
        )}
      </div>

      {/* TradingView embed */}
      {t.symbol && (
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "10px", overflow: "hidden", marginBottom: "16px" }}>
          <div style={{ fontSize: "10px", color: "#666", letterSpacing: "2px", padding: "14px 16px 10px" }}>TRADINGVIEW CHART</div>
          <div className="tradingview-widget-container" style={{ height: "400px" }}>
            <iframe
              src={`https://www.tradingview.com/widgetembed/?frameElementId=tradingview&symbol=${t.symbol}&interval=5&hidesidetoolbar=0&hidetoptoolbar=0&symboledit=1&saveimage=1&toolbarbg=0a0a0a&studies=VWAP@tv-basicstudies&theme=dark&style=1&timezone=America/New_York&withdateranges=1&showpopupbutton=1&studies_overrides=%7B%7D&overrides=%7B%7D&enabled_features=%5B%5D&disabled_features=%5B%5D&locale=en&utm_source=nexatrade`}
              style={{ width: "100%", height: "400px", border: "none" }}
              allowFullScreen
            />
          </div>
        </div>
      )}

      {/* Delete */}
      <button onClick={() => { if (confirm("Delete this trade?")) deleteMutation.mutate(); }}
        style={{ width: "100%", padding: "12px", background: "none", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", color: "#ef4444", fontWeight: 700, fontSize: "13px", cursor: "pointer", marginBottom: "40px" }}>
        Delete Trade
      </button>
    </AppLayout>
  );
}
