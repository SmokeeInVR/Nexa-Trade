import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AppLayout, GOLD, CARD, BORDER } from "@/components/app-layout";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function WatchlistPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [newSymbol, setNewSymbol] = useState("");
  const { data: tickers = [] } = useQuery({ queryKey: ["/api/watchlist"] });

  const addMutation = useMutation({
    mutationFn: (symbol: string) => apiRequest("POST", "/api/watchlist", { symbol, userId: "nexa-trade-user", active: true }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/watchlist"] }); setNewSymbol(""); toast({ title: "Ticker added" }); },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => apiRequest("PATCH", `/api/watchlist/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/watchlist"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/watchlist/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/watchlist"] }),
  });

  const cats = ["Index", "MegaCap", "Momentum", "Other"];
  const byCategory = (cat: string) => (tickers as any[]).filter(t => t.category === cat);

  return (
    <AppLayout title="Watchlist">
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <input value={newSymbol} onChange={e => setNewSymbol(e.target.value.toUpperCase())} placeholder="Add ticker (e.g. TSLA)" onKeyDown={e => e.key === "Enter" && newSymbol && addMutation.mutate(newSymbol)}
          style={{ flex: 1, background: CARD, border: `1px solid ${BORDER}`, borderRadius: "8px", padding: "10px 12px", color: "#fff", fontSize: "14px", outline: "none" }} />
        <button onClick={() => newSymbol && addMutation.mutate(newSymbol)} style={{ background: GOLD, color: "#000", border: "none", borderRadius: "8px", padding: "10px 20px", fontWeight: 700, cursor: "pointer" }}>Add</button>
      </div>
      {cats.map(cat => {
        const items = byCategory(cat);
        if (!items.length) return null;
        return (
          <div key={cat} style={{ marginBottom: "20px" }}>
            <div style={{ fontSize: "10px", color: "#666", letterSpacing: "2px", textTransform: "uppercase", marginBottom: "10px" }}>{cat}</div>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {items.map((t: any) => (
                <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 12px", background: CARD, border: `1px solid ${t.active ? GOLD : BORDER}`, borderRadius: "8px" }}>
                  <button onClick={() => toggleMutation.mutate({ id: t.id, active: !t.active })}
                    style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 700, fontSize: "14px", color: t.active ? GOLD : "#666", padding: 0 }}>
                    {t.symbol}
                  </button>
                  <button onClick={() => deleteMutation.mutate(t.id)} style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: "14px", padding: 0 }}>✕</button>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </AppLayout>
  );
}
