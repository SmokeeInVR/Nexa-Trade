import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AppLayout, GOLD, CARD, BORDER } from "@/components/app-layout";
import { NEXA_STRATEGIES, SIGNAL_GRADES, EMOTIONS, EXIT_REASONS } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const RAILWAY = import.meta.env.VITE_API_URL || "";

function SelectorGrid({ options, value, onChange, cols = 2 }: { options: {id:string;label:string;emoji?:string;color?:string}[]; value: string; onChange: (v:string)=>void; cols?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: "8px", marginBottom: "16px" }}>
      {options.map(opt => (
        <button key={opt.id} onClick={() => onChange(opt.id)}
          style={{ padding: "10px 8px", borderRadius: "8px", border: "1px solid", borderColor: value === opt.id ? (opt.color || GOLD) : BORDER, background: value === opt.id ? `${opt.color || GOLD}18` : "transparent", color: value === opt.id ? (opt.color || GOLD) : "#888", fontWeight: value === opt.id ? 700 : 400, fontSize: "12px", cursor: "pointer", textAlign: "center", transition: "all 0.15s" }}>
          {opt.emoji && <span style={{ marginRight: "4px" }}>{opt.emoji}</span>}
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: "10px", color: "#666", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px", marginTop: "16px" }}>{children}</div>;
}

function Input({ ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: "8px", padding: "10px 12px", color: "#fff", fontSize: "14px", outline: "none", boxSizing: "border-box", ...props.style }} />;
}

function Textarea({ ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ width: "100%", background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: "8px", padding: "10px 12px", color: "#fff", fontSize: "14px", resize: "vertical", minHeight: "80px", fontFamily: "inherit", outline: "none", boxSizing: "border-box", ...props.style }} />;
}

export default function AddTradePage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  // Form state
  const [strategy, setStrategy] = useState("ORB_MOMENTUM");
  const [grade, setGrade] = useState("A");
  const [vwapBoost, setVwapBoost] = useState(false);
  const [optionType, setOptionType] = useState("CALL");
  const [symbol, setSymbol] = useState("");
  const [strike, setStrike] = useState("");
  const [expiration, setExpiration] = useState("");
  const [contracts, setContracts] = useState("1");
  const [entryPrice, setEntryPrice] = useState("");
  const [stopPrice, setStopPrice] = useState("");
  const [tp1, setTp1] = useState("");
  const [tp2, setTp2] = useState("");
  const [tp3, setTp3] = useState("");
  const [emotion, setEmotion] = useState("CONFIDENT");
  const [notes, setNotes] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [exitReason, setExitReason] = useState("");
  const [closeNow, setCloseNow] = useState(false);
  const [chartImage, setChartImage] = useState<string>("");
  const [aiAnalysis, setAiAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [filterAtr, setFilterAtr] = useState(true);
  const [filterTime, setFilterTime] = useState(true);
  const [filterOrb, setFilterOrb] = useState(true);
  const [filterLevel, setFilterLevel] = useState(true);

  const { data: tickers } = useQuery({ queryKey: ["/api/watchlist"] });
  const activeTickers = (tickers as any[] || []).filter(t => t.active);

  // Effective grade calculation (VWAP boost)
  const gradeOrder = ["C", "B", "A", "A_PLUS"];
  const effectiveGrade = vwapBoost && grade !== "A_PLUS" ? gradeOrder[gradeOrder.indexOf(grade) + 1] : grade;

  // R calculator
  const entry = parseFloat(entryPrice);
  const stop = parseFloat(stopPrice);
  const rValue = entry && stop ? Math.abs(entry - stop) : null;
  const calcTP = (r: number) => rValue && entry ? (optionType === "CALL" ? entry + rValue * r : entry - rValue * r).toFixed(2) : "";

  // Auto-fill TPs
  const autoFillTPs = () => {
    if (rValue && entry) {
      setTp1(calcTP(1));
      setTp2(calcTP(2));
      setTp3(calcTP(3));
    }
  };

  // P&L preview
  const ep = parseFloat(exitPrice);
  const ep2 = parseFloat(entryPrice);
  const pnlPreview = ep && ep2 && contracts ? ((ep - ep2) * parseInt(contracts) * 100).toFixed(2) : null;

  // Chart analysis
  const analyzeChart = async (file: File) => {
    setAnalyzing(true);
    try {
      const base64 = await new Promise<string>((res, rej) => {
        const reader = new FileReader();
        reader.onload = () => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX = 800;
            let w = img.width, h = img.height;
            if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; } }
            else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX; } }
            canvas.width = w; canvas.height = h;
            canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
            res(canvas.toDataURL("image/jpeg", 0.7).split(",")[1]);
          };
          img.src = reader.result as string;
        };
        reader.readAsDataURL(file);
      });
      setChartImage(base64);
      const resp = await apiRequest("POST", "/api/ai/analyze-chart", {
        image: base64,
        mediaType: "image/jpeg",
        tradeContext: { symbol, strategy, grade: effectiveGrade, optionType, entryPrice, stopPrice }
      });
      const data = await resp.json();
      setAiAnalysis(data.content?.[0]?.text || "Analysis complete");
    } catch (e) {
      toast({ title: "Analysis failed", variant: "destructive" });
    }
    setAnalyzing(false);
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const dte = expiration ? Math.max(0, Math.ceil((new Date(expiration).getTime() - Date.now()) / 86400000)) : 0;
      const body: any = {
        symbol: symbol.toUpperCase(),
        optionType,
        strike: parseFloat(strike),
        expiration,
        dte,
        nexaStrategy: strategy,
        signalGrade: grade,
        vwapBoost,
        effectiveGrade,
        filterAtr, filterTimeOfDay: filterTime, filterOrbSize: filterOrb, filterKeyLevel: filterLevel,
        entryTime: new Date().toISOString(),
        entryPrice: parseFloat(entryPrice),
        contracts: parseInt(contracts),
        fees: "0",
        stopPrice: stopPrice ? parseFloat(stopPrice) : undefined,
        tp1Price: tp1 ? parseFloat(tp1) : undefined,
        tp2Price: tp2 ? parseFloat(tp2) : undefined,
        tp3Price: tp3 ? parseFloat(tp3) : undefined,
        emotionTag: emotion,
        notes,
        chartScreenshot: chartImage || undefined,
        status: closeNow && exitPrice ? "CLOSED" : "OPEN",
        exitPrice: closeNow && exitPrice ? parseFloat(exitPrice) : undefined,
        exitTime: closeNow && exitPrice ? new Date().toISOString() : undefined,
        exitReason: closeNow && exitReason ? exitReason : undefined,
        userId: "nexa-trade-user",
      };
      return apiRequest("POST", "/api/trades", body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/trades"] });
      qc.invalidateQueries({ queryKey: ["/api/sessions/today"] });
      toast({ title: "Trade logged ✅" });
      navigate("/session");
    },
    onError: () => toast({ title: "Failed to log trade", variant: "destructive" }),
  });

  const gradeColor: Record<string, string> = { A_PLUS: "#D4A53E", A: "#22c55e", B: "#60a5fa", C: "#ef4444" };

  return (
    <AppLayout title="Log Trade">
      <div style={{ maxWidth: "600px", margin: "0 auto" }}>

        {/* Strategy */}
        <Label>Strategy</Label>
        <SelectorGrid cols={2} options={NEXA_STRATEGIES.map(s => ({ id: s.id, label: s.label, emoji: s.emoji, color: s.color }))} value={strategy} onChange={setStrategy} />

        {/* Direction */}
        <Label>Direction</Label>
        <SelectorGrid cols={2} options={[{ id: "CALL", label: "📈 CALL", color: "#22c55e" }, { id: "PUT", label: "📉 PUT", color: "#ef4444" }]} value={optionType} onChange={setOptionType} />

        {/* Signal Grade */}
        <Label>Signal Grade</Label>
        <SelectorGrid cols={4} options={SIGNAL_GRADES.map(g => ({ id: g.id, label: g.label, color: g.color }))} value={grade} onChange={setGrade} />
        
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
          <button onClick={() => setVwapBoost(!vwapBoost)}
            style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid", borderColor: vwapBoost ? "#60a5fa" : BORDER, background: vwapBoost ? "rgba(96,165,250,0.15)" : "transparent", color: vwapBoost ? "#60a5fa" : "#666", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>
            {vwapBoost ? "✓ " : ""}VWAP Boost Applied
          </button>
          {vwapBoost && <span style={{ fontSize: "12px", color: "#60a5fa" }}>Grade boosted → <strong>{effectiveGrade.replace("_", "+")}</strong></span>}
        </div>

        {/* Filters */}
        <Label>Filters Passed</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px" }}>
          {[
            { label: "ATR Volatility", val: filterAtr, set: setFilterAtr },
            { label: "Time < 11:30 AM", val: filterTime, set: setFilterTime },
            { label: "ORB Range Size", val: filterOrb, set: setFilterOrb },
            { label: "No Key Level Conflict", val: filterLevel, set: setFilterLevel },
          ].map(({ label, val, set }) => (
            <button key={label} onClick={() => set(!val)}
              style={{ padding: "8px 10px", borderRadius: "8px", border: "1px solid", borderColor: val ? "#22c55e" : "#ef4444", background: val ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)", color: val ? "#22c55e" : "#ef4444", fontSize: "11px", fontWeight: 600, cursor: "pointer", textAlign: "left" }}>
              {val ? "✓ " : "✗ "}{label}
            </button>
          ))}
        </div>

        {/* Instrument */}
        <Label>Instrument</Label>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
          {activeTickers.slice(0, 10).map((t: any) => (
            <button key={t.id} onClick={() => setSymbol(t.symbol)}
              style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid", borderColor: symbol === t.symbol ? GOLD : BORDER, background: symbol === t.symbol ? "rgba(212,165,62,0.15)" : "transparent", color: symbol === t.symbol ? GOLD : "#888", fontSize: "12px", fontWeight: symbol === t.symbol ? 700 : 400, cursor: "pointer" }}>
              {t.symbol}
            </button>
          ))}
        </div>
        <Input placeholder="Or type ticker..." value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div><Label>Strike</Label><Input type="number" step="0.5" placeholder="450.00" value={strike} onChange={e => setStrike(e.target.value)} /></div>
          <div><Label>Expiration</Label><Input type="date" value={expiration} onChange={e => setExpiration(e.target.value)} /></div>
          <div><Label>Contracts</Label><Input type="number" min="1" value={contracts} onChange={e => setContracts(e.target.value)} /></div>
          <div><Label>Entry Price</Label><Input type="number" step="0.01" placeholder="2.50" value={entryPrice} onChange={e => setEntryPrice(e.target.value)} /></div>
        </div>

        {/* Risk */}
        <Label>Risk Management</Label>
        <Input type="number" step="0.01" placeholder="Stop Loss price" value={stopPrice} onChange={e => { setStopPrice(e.target.value); }} style={{ marginBottom: "8px" }} />
        {rValue && <div style={{ fontSize: "11px", color: GOLD, marginBottom: "8px" }}>1R = ${rValue.toFixed(2)} per contract · Total risk = ${(rValue * parseInt(contracts||"1") * 100).toFixed(2)}</div>}
        <button onClick={autoFillTPs} style={{ background: "none", border: `1px solid ${BORDER}`, borderRadius: "6px", padding: "6px 12px", color: "#666", fontSize: "12px", cursor: "pointer", marginBottom: "10px" }}>Auto-fill TPs from stop</button>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
          <div><Label>TP1 (1R)</Label><Input type="number" step="0.01" value={tp1} onChange={e => setTp1(e.target.value)} placeholder={calcTP(1)} /></div>
          <div><Label>TP2 (2R)</Label><Input type="number" step="0.01" value={tp2} onChange={e => setTp2(e.target.value)} placeholder={calcTP(2)} /></div>
          <div><Label>TP3 (3R)</Label><Input type="number" step="0.01" value={tp3} onChange={e => setTp3(e.target.value)} placeholder={calcTP(3)} /></div>
        </div>

        {/* Emotion */}
        <Label>Mindset</Label>
        <SelectorGrid cols={3} options={EMOTIONS.map(e => ({ id: e.id, label: e.label, emoji: e.emoji }))} value={emotion} onChange={setEmotion} />

        {/* Chart Screenshot */}
        <Label>Chart Screenshot</Label>
        <div style={{ border: `1px dashed ${BORDER}`, borderRadius: "10px", padding: "16px", textAlign: "center", marginBottom: "16px" }}>
          {chartImage ? (
            <div>
              <img src={`data:image/jpeg;base64,${chartImage}`} style={{ maxWidth: "100%", borderRadius: "8px", marginBottom: "10px" }} />
              {analyzing ? (
                <div style={{ color: GOLD, fontSize: "13px" }}>🤖 Analyzing setup...</div>
              ) : aiAnalysis ? (
                <div style={{ background: "rgba(212,165,62,0.08)", border: `1px solid rgba(212,165,62,0.2)`, borderRadius: "8px", padding: "12px", fontSize: "13px", textAlign: "left", color: "#ddd", lineHeight: 1.6 }}>
                  <div style={{ fontSize: "10px", color: GOLD, letterSpacing: "2px", marginBottom: "6px" }}>AI ANALYSIS</div>
                  {aiAnalysis}
                </div>
              ) : null}
              <button onClick={() => { setChartImage(""); setAiAnalysis(""); }} style={{ background: "none", border: "none", color: "#666", cursor: "pointer", fontSize: "12px", marginTop: "8px" }}>Remove</button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: "24px", marginBottom: "8px" }}>📸</div>
              <div style={{ fontSize: "13px", color: "#666", marginBottom: "12px" }}>Upload chart screenshot for AI analysis</div>
              <button onClick={() => fileRef.current?.click()} style={{ background: GOLD, color: "#000", border: "none", borderRadius: "8px", padding: "8px 20px", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>Choose File</button>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => e.target.files?.[0] && analyzeChart(e.target.files[0])} />
            </div>
          )}
        </div>

        {/* Notes */}
        <Label>Notes</Label>
        <Textarea placeholder="Setup description, what you saw, execution notes..." value={notes} onChange={e => setNotes(e.target.value)} style={{ marginBottom: "16px" }} />

        {/* Close immediately? */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "10px", padding: "14px 16px", marginBottom: "20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: closeNow ? "14px" : "0" }}>
            <button onClick={() => setCloseNow(!closeNow)}
              style={{ width: "22px", height: "22px", borderRadius: "6px", border: `2px solid ${closeNow ? GOLD : BORDER}`, background: closeNow ? GOLD : "transparent", color: "#000", fontWeight: 800, fontSize: "12px", cursor: "pointer", flexShrink: 0 }}>
              {closeNow ? "✓" : ""}
            </button>
            <span style={{ fontSize: "13px", color: "#ddd" }}>Log as already closed (post-trade entry)</span>
          </div>
          {closeNow && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              <div>
                <Label>Exit Price</Label>
                <Input type="number" step="0.01" placeholder="Exit price" value={exitPrice} onChange={e => setExitPrice(e.target.value)} />
                {pnlPreview && <div style={{ fontSize: "11px", color: parseFloat(pnlPreview) >= 0 ? "#22c55e" : "#ef4444", marginTop: "4px" }}>P&L: ${pnlPreview}</div>}
              </div>
              <div>
                <Label>Exit Reason</Label>
                <SelectorGrid cols={2} options={EXIT_REASONS.map(e => ({ id: e.id, label: `${e.emoji} ${e.label}` }))} value={exitReason} onChange={setExitReason} />
              </div>
            </div>
          )}
        </div>

        {/* Grade warning */}
        {(effectiveGrade === "C" || effectiveGrade === "B") && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "8px", padding: "10px 14px", marginBottom: "14px", fontSize: "12px", color: "#ef4444" }}>
            {effectiveGrade === "C" ? "⚠️ C Grade — Avoid options. Theta decay not worth the risk." : "⚠️ B Grade — Reduce size by 50%. Only acceptable with VWAP boost."}
          </div>
        )}

        <button
          onClick={() => submitMutation.mutate()}
          disabled={submitMutation.isPending || !symbol || !strike || !expiration || !entryPrice}
          style={{ width: "100%", padding: "14px", background: GOLD, color: "#000", border: "none", borderRadius: "10px", fontWeight: 900, fontSize: "15px", cursor: "pointer", opacity: submitMutation.isPending ? 0.7 : 1, letterSpacing: "0.5px" }}>
          {submitMutation.isPending ? "Logging..." : "Log Trade"}
        </button>
      </div>
    </AppLayout>
  );
}
