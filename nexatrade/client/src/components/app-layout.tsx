import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LayoutDashboard, TrendingUp, BarChart3, Eye, Settings, Plus, Activity } from "lucide-react";
import { useState } from "react";

const NAV = [
  { href: "/session",   label: "Session",   icon: Activity,      desc: "Today's trading command center" },
  { href: "/trades",    label: "Trades",    icon: TrendingUp,    desc: "Trade journal & log" },
  { href: "/analytics", label: "Analytics", icon: BarChart3,     desc: "Performance breakdown" },
  { href: "/watchlist", label: "Watchlist", icon: Eye,           desc: "Ticker management" },
  { href: "/settings",  label: "Settings",  icon: Settings,      desc: "Account & risk settings" },
];

const GOLD = "#D4A53E";
const BG = "#0a0a0a";
const CARD = "#141414";
const BORDER = "#2a2a2a";

function NexaLogo({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
      <div style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
        <span style={{ fontSize: size === "sm" ? "7px" : "8px", letterSpacing: "4px", fontWeight: 700, color: GOLD, textTransform: "uppercase" }}>NEXA</span>
        <span style={{ fontSize: size === "sm" ? "16px" : "20px", fontWeight: 900, color: "#ffffff", letterSpacing: "-1px" }}>TRADE</span>
      </div>
      <div style={{ width: "2px", height: size === "sm" ? "22px" : "28px", background: GOLD, borderRadius: "2px" }} />
      <span style={{ fontSize: "10px", color: "#666", fontWeight: 500 }}>Pro</span>
    </div>
  );
}

export function AppLayout({ title, children, actions }: { title: string; children: React.ReactNode; actions?: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div style={{ display: "flex", height: "100vh", background: BG, color: "#fff", fontFamily: "'Inter', system-ui, sans-serif" }}>
      
      {/* ── DESKTOP SIDEBAR ──────────────────────────────────────────────── */}
      <aside style={{ width: "220px", background: CARD, borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", flexShrink: 0, position: "sticky", top: 0, height: "100vh" }} className="hidden lg:flex">
        <div style={{ padding: "20px 16px", borderBottom: `1px solid ${BORDER}` }}>
          <Link href="/session"><div style={{ cursor: "pointer" }}><NexaLogo /></div></Link>
        </div>
        <nav style={{ flex: 1, padding: "12px 8px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = location === href || (href !== "/" && location.startsWith(href));
            return (
              <Link key={href} href={href}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", cursor: "pointer", background: active ? "rgba(212,165,62,0.12)" : "transparent", color: active ? GOLD : "#888", border: active ? "1px solid rgba(212,165,62,0.25)" : "1px solid transparent", transition: "all 0.15s", fontSize: "13px", fontWeight: active ? 600 : 400 }}>
                  <Icon size={16} />
                  {label}
                </div>
              </Link>
            );
          })}
        </nav>
        <div style={{ padding: "12px 8px", borderTop: `1px solid ${BORDER}` }}>
          <Link href="/trades/new">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "11px", background: GOLD, color: "#000", borderRadius: "8px", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>
              <Plus size={16} />
              Log Trade
            </div>
          </Link>
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        
        {/* Desktop top bar */}
        <header style={{ background: CARD, borderBottom: `1px solid ${BORDER}`, padding: "0 24px", height: "52px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }} className="hidden lg:flex">
          <div style={{ fontWeight: 700, fontSize: "16px" }}>{title}</div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            {actions}
            <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", color: "#666" }}>
              <div style={{ width: "6px", height: "6px", background: "#22c55e", borderRadius: "50%" }} />
              NY Session {new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", hour12: true })} ET
            </div>
          </div>
        </header>

        {/* Mobile header */}
        <header style={{ background: CARD, borderBottom: `2px solid ${GOLD}`, padding: "0 16px", height: "52px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, position: "sticky", top: 0, zIndex: 40 }} className="lg:hidden">
          <Link href="/session"><NexaLogo size="sm" /></Link>
          <div style={{ display: "flex", gap: "8px" }}>
            {actions}
            <Link href="/trades/new">
              <div style={{ background: GOLD, color: "#000", borderRadius: "6px", padding: "6px 12px", fontWeight: 700, fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}>
                <Plus size={14} /> Log
              </div>
            </Link>
          </div>
        </header>

        {/* Mobile bottom nav */}
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: CARD, borderTop: `2px solid ${GOLD}`, display: "flex", zIndex: 50, padding: "6px 0 8px" }} className="lg:hidden">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = location === href || (href !== "/" && location.startsWith(href));
            return (
              <Link key={href} href={href}>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", padding: "4px 8px", cursor: "pointer", color: active ? GOLD : "#555", fontSize: "9px", fontWeight: active ? 700 : 400, minWidth: "60px" }}>
                  <Icon size={18} />
                  {label}
                </div>
              </Link>
            );
          })}
        </div>

        {/* Page content */}
        <main style={{ flex: 1, overflowY: "auto", padding: "20px 24px 20px" }} className="pb-20 lg:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
}

export { GOLD, BG, CARD, BORDER };
