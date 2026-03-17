import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout, GOLD, CARD, BORDER } from "@/components/app-layout";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ["/api/settings"] });
  const s = settings as any;

  const [accountSize, setAccountSize] = useState("");
  const [maxLoss, setMaxLoss] = useState("");
  const [walkAway, setWalkAway] = useState("");
  const [fullSize, setFullSize] = useState("");
  const [maxTrades, setMaxTrades] = useState("");

  useEffect(() => {
    if (s) {
      setAccountSize(s.accountSize || "10000");
      setMaxLoss(s.maxDailyLossPct || "2");
      setWalkAway(s.walkAwayPct || "3");
      setFullSize(s.fullSizePct || "2");
      setMaxTrades(s.maxTradesPerSession || "3");
    }
  }, [s]);

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/settings", {
      accountSize, maxDailyLossPct: maxLoss, walkAwayPct: walkAway, fullSizePct: fullSize, maxTradesPerSession: parseInt(maxTrades),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/settings"] }); toast({ title: "Settings saved ✅" }); },
  });

  const acct = parseFloat(accountSize) || 10000;
  const maxLossAmt = acct * parseFloat(maxLoss || "2") / 100;
  const walkAwayAmt = acct * parseFloat(walkAway || "3") / 100;
  const fullSizeAmt = acct * parseFloat(fullSize || "2") / 100;
  const bSizeAmt = fullSizeAmt * 0.5;
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  function Field({ label, value, onChange, type = "number", suffix }: { label: string; value: string; onChange: (v:string)=>void; type?: string; suffix?: string }) {
    return (
      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "10px", color: "#666", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "8px" }}>{label}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input type={type} value={value} onChange={e => onChange(e.target.value)}
            style={{ flex: 1, background: "rgba(255,255,255,0.05)", border: `1px solid ${BORDER}`, borderRadius: "8px", padding: "10px 12px", color: "#fff", fontSize: "14px", outline: "none" }} />
          {suffix && <span style={{ fontSize: "13px", color: "#666", flexShrink: 0 }}>{suffix}</span>}
        </div>
      </div>
    );
  }

  return (
    <AppLayout title="Settings">
      <div style={{ maxWidth: "500px" }}>
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "20px", marginBottom: "16px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "16px", color: GOLD }}>Account & Risk Management</div>
          <Field label="Account Size" value={accountSize} onChange={setAccountSize} suffix="USD" />
          <Field label="Max Daily Loss" value={maxLoss} onChange={setMaxLoss} suffix="% of account" />
          <Field label="Walk Away Target" value={walkAway} onChange={setWalkAway} suffix="% of account" />
          <Field label="Full Size Position" value={fullSize} onChange={setFullSize} suffix="% per trade (A/A+)" />
          <Field label="Max Trades Per Session" value={maxTrades} onChange={setMaxTrades} suffix="trades" />
        </div>

        {/* Live preview */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "14px" }}>Live Calculations</div>
          {[
            { label: "Account Size", value: fmt(acct) },
            { label: `Max Daily Loss (${maxLoss}%)`, value: fmt(maxLossAmt), color: "#ef4444" },
            { label: `Walk Away Target (${walkAway}%)`, value: fmt(walkAwayAmt), color: "#22c55e" },
            { label: `A/A+ Full Size (${fullSize}%)`, value: fmt(fullSizeAmt), color: GOLD },
            { label: "B Grade Size (50% of full)", value: fmt(bSizeAmt), color: "#60a5fa" },
            { label: "C Grade", value: "Skip — no options", color: "#ef4444" },
          ].map(({ label, value, color }) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${BORDER}`, fontSize: "13px" }}>
              <span style={{ color: "#888" }}>{label}</span>
              <span style={{ fontWeight: 700, color: color || "#fff" }}>{value}</span>
            </div>
          ))}
        </div>

        <button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}
          style={{ width: "100%", padding: "14px", background: GOLD, color: "#000", border: "none", borderRadius: "10px", fontWeight: 900, fontSize: "15px", cursor: "pointer" }}>
          {saveMutation.isPending ? "Saving..." : "Save Settings"}
        </button>

        {/* Playbook reference */}
        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: "12px", padding: "20px", marginTop: "16px" }}>
          <div style={{ fontSize: "13px", fontWeight: 700, marginBottom: "14px", color: GOLD }}>Nexa Trading Rules Reference</div>
          {[
            { emoji: "🟢", name: "ORB Momentum", rule: "Full candle body close above/below OR high/low · Volume ≥ threshold · All filters pass · One signal per direction per session" },
            { emoji: "🔵", name: "ORB + VWAP", rule: "ORB breakout + price on correct side of VWAP · Auto grade boost +1 tier · Highest conviction ORB" },
            { emoji: "🟠", name: "Break & Retest", rule: "Key level rejected 3+ times · Clean body break with volume · Stop at last rejection wick + 1 ATR" },
            { emoji: "🟡", name: "VWAP First Touch", rule: "First VWAP touch of session + volume spike 1.5x avg · Fires once per session only · Stop on opposite side of VWAP + 1 ATR" },
          ].map(s => (
            <div key={s.name} style={{ marginBottom: "14px", paddingBottom: "14px", borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ fontWeight: 700, marginBottom: "4px" }}>{s.emoji} {s.name}</div>
              <div style={{ fontSize: "12px", color: "#888", lineHeight: 1.6 }}>{s.rule}</div>
            </div>
          ))}
          <div style={{ fontSize: "12px", color: "#666", marginTop: "8px" }}>
            ⏰ Hard cutoff: 11:30 AM ET — No new trades after this time<br />
            📊 TP1=1R (take 50% off), TP2=2R (move stop to BE), TP3=3R (trail)
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
