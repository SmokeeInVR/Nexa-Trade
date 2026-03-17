import express from "express";
import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage.js";
import { insertTradeSchema, insertSessionSchema, insertTickerSchema, insertTagSchema, insertAccountSettingsSchema } from "../shared/schema.js";
import { z } from "zod";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  await storage.ensureDefaultUser();

  // ── ACCOUNT SETTINGS ──────────────────────────────────────────────────────
  app.get("/api/settings", async (_req, res) => {
    try { res.json(await storage.getAccountSettings()); } catch(e) { res.status(500).json({ message: "Failed" }); }
  });

  app.post("/api/settings", async (req, res) => {
    try { res.json(await storage.upsertAccountSettings(req.body)); } catch(e) { res.status(500).json({ message: "Failed" }); }
  });

  // ── SESSIONS ──────────────────────────────────────────────────────────────
  app.get("/api/sessions", async (_req, res) => {
    try { res.json(await storage.getSessions()); } catch(e) { res.status(500).json({ message: "Failed" }); }
  });

  app.get("/api/sessions/today", async (_req, res) => {
    try {
      let session = await storage.getTodaySession();
      if (!session) {
        const today = new Date().toISOString().split("T")[0];
        session = await storage.upsertSession({ date: today });
      }
      // Attach today's trades and session status
      const todayTrades = await storage.getTradesByDate(session.date);
      const settings = await storage.getAccountSettings();
      const accountSize = parseFloat(settings?.accountSize || "10000");
      const maxLossPct = parseFloat(settings?.maxDailyLossPct || "2");
      const walkAwayPct = parseFloat(settings?.walkAwayPct || "3");
      const maxLossLimit = accountSize * maxLossPct / 100;
      const walkAwayTarget = accountSize * walkAwayPct / 100;
      const todayPnl = todayTrades.reduce((s, t) => s + (t.pnlNet || 0), 0);
      
      // Session time check (9:30 - 11:30 ET)
      const now = new Date();
      const etNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
      const hours = etNow.getHours();
      const minutes = etNow.getMinutes();
      const totalMins = hours * 60 + minutes;
      const sessionStart = 9 * 60 + 30;
      const sessionEnd = 11 * 60 + 30;
      const sessionActive = totalMins >= sessionStart && totalMins < sessionEnd;
      const minsRemaining = sessionActive ? sessionEnd - totalMins : 0;

      res.json({
        session,
        trades: todayTrades,
        status: {
          date: session.date,
          tradesCount: todayTrades.length,
          pnlToday: todayPnl,
          maxLossLimit,
          walkAwayTarget,
          maxLossHit: todayPnl <= -maxLossLimit,
          walkAwayHit: todayPnl >= walkAwayTarget,
          sessionActive,
          minutesRemaining: minsRemaining,
          maxTradesReached: todayTrades.length >= (settings?.maxTradesPerSession || 3),
        }
      });
    } catch(e) { console.error(e); res.status(500).json({ message: "Failed to get session" }); }
  });

  app.post("/api/sessions", async (req, res) => {
    try { res.json(await storage.upsertSession(req.body)); } catch(e) { res.status(500).json({ message: "Failed" }); }
  });

  app.get("/api/sessions/:date", async (req, res) => {
    try {
      const session = await storage.getSession(req.params.date);
      const trades = session ? await storage.getTradesByDate(req.params.date) : [];
      res.json({ session, trades });
    } catch(e) { res.status(500).json({ message: "Failed" }); }
  });

  // ── TRADES ────────────────────────────────────────────────────────────────
  app.get("/api/trades", async (req, res) => {
    try {
      const { status, strategy, grade, limit } = req.query;
      res.json(await storage.getTrades({
        status: status as string,
        strategy: strategy as string,
        grade: grade as string,
        limit: limit ? parseInt(limit as string) : undefined,
      }));
    } catch(e) { res.status(500).json({ message: "Failed" }); }
  });

  app.get("/api/trades/:id", async (req, res) => {
    try {
      const trade = await storage.getTrade(req.params.id);
      if (!trade) return res.status(404).json({ message: "Not found" });
      res.json(trade);
    } catch(e) { res.status(500).json({ message: "Failed" }); }
  });

  app.post("/api/trades", async (req, res) => {
    try {
      const data = insertTradeSchema.parse(req.body);
      res.status(201).json(await storage.createTrade(data));
    } catch(e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input", errors: e.errors });
      console.error(e);
      res.status(500).json({ message: "Failed to create trade" });
    }
  });

  app.patch("/api/trades/:id", async (req, res) => {
    try {
      res.json(await storage.updateTrade(req.params.id, req.body));
    } catch(e) { res.status(500).json({ message: "Failed" }); }
  });

  app.delete("/api/trades/:id", async (req, res) => {
    try { await storage.deleteTrade(req.params.id); res.sendStatus(204); }
    catch(e) { res.status(500).json({ message: "Failed" }); }
  });

  // ── ANALYTICS ─────────────────────────────────────────────────────────────
  app.get("/api/analytics/kpis", async (req, res) => {
    try {
      const { dateFrom, dateTo } = req.query;
      res.json(await storage.getDashboardKPIs({
        dateFrom: dateFrom as string,
        dateTo: dateTo as string,
      }));
    } catch(e) { res.status(500).json({ message: "Failed" }); }
  });

  app.get("/api/analytics/strategies", async (_req, res) => {
    try { res.json(await storage.getStrategyAnalytics()); } catch(e) { res.status(500).json({ message: "Failed" }); }
  });

  app.get("/api/analytics/grades", async (_req, res) => {
    try { res.json(await storage.getGradeAnalytics()); } catch(e) { res.status(500).json({ message: "Failed" }); }
  });

  app.get("/api/analytics/dte", async (_req, res) => {
    try { res.json(await storage.getDteAnalytics()); } catch(e) { res.status(500).json({ message: "Failed" }); }
  });

  app.get("/api/analytics/equity-curve", async (_req, res) => {
    try { res.json(await storage.getEquityCurve()); } catch(e) { res.status(500).json({ message: "Failed" }); }
  });

  app.get("/api/analytics/calendar", async (_req, res) => {
    try { res.json(await storage.getCalendarPnl()); } catch(e) { res.status(500).json({ message: "Failed" }); }
  });

  // ── WATCHLIST ─────────────────────────────────────────────────────────────
  app.get("/api/watchlist", async (_req, res) => {
    try { res.json(await storage.getTickers()); } catch(e) { res.status(500).json({ message: "Failed" }); }
  });

  app.post("/api/watchlist", async (req, res) => {
    try {
      const data = insertTickerSchema.parse({ ...req.body, userId: "nexa-trade-user" });
      res.status(201).json(await storage.addTicker(data));
    } catch(e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: "Invalid input", errors: e.errors });
      res.status(500).json({ message: "Failed" });
    }
  });

  app.patch("/api/watchlist/:id", async (req, res) => {
    try { res.json(await storage.updateTicker(req.params.id, req.body)); }
    catch(e) { res.status(500).json({ message: "Failed" }); }
  });

  app.delete("/api/watchlist/:id", async (req, res) => {
    try { await storage.deleteTicker(req.params.id); res.sendStatus(204); }
    catch(e) { res.status(500).json({ message: "Failed" }); }
  });

  // ── TAGS ──────────────────────────────────────────────────────────────────
  app.get("/api/tags", async (_req, res) => {
    try { res.json(await storage.getTags()); } catch(e) { res.status(500).json({ message: "Failed" }); }
  });

  app.post("/api/tags", async (req, res) => {
    try {
      const data = insertTagSchema.parse({ ...req.body, userId: "nexa-trade-user" });
      res.status(201).json(await storage.createTag(data));
    } catch(e) { res.status(500).json({ message: "Failed" }); }
  });

  app.delete("/api/tags/:id", async (req, res) => {
    try { await storage.deleteTag(req.params.id); res.sendStatus(204); }
    catch(e) { res.status(500).json({ message: "Failed" }); }
  });

  // ── AI ANALYSIS ───────────────────────────────────────────────────────────
  app.post("/api/ai/analyze-chart", express.json({ limit: "10mb" }), async (req, res) => {
    try {
      const { image, mediaType, tradeContext } = req.body;
      if (!image) return res.status(400).json({ message: "image required" });
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) return res.status(500).json({ message: "No API key" });

      const contextStr = tradeContext ? `Trade context: ${JSON.stringify(tradeContext)}. ` : "";
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 600,
          system: "You are a professional options trader analyzing charts for the Nexa Trading system. The system uses 4 strategies: ORB Momentum (🟢), ORB+VWAP (🔵), Break & Retest (🟠), VWAP First Touch (🟡). Signals are graded A+/A/B/C based on volume. Trading window is 9:30-11:30 AM ET only. Be direct, specific, and actionable.",
          messages: [{
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: mediaType || "image/jpeg", data: image } },
              { type: "text", text: `${contextStr}Analyze this chart for the Nexa Trading system. Identify: 1) Which strategy applies (ORB Momentum/ORB+VWAP/Break&Retest/VWAP First Touch), 2) Signal grade estimate (A+/A/B/C) based on visible volume, 3) Key levels visible (support/resistance/VWAP/ORB high-low), 4) Setup quality and any red flags, 5) One sentence recommendation. Be concise.` }
            ]
          }]
        })
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json(data);
      res.json(data);
    } catch(e) { console.error(e); res.status(500).json({ message: "Analysis failed" }); }
  });

  app.post("/api/ai/weekly-debrief", async (req, res) => {
    try {
      const key = process.env.ANTHROPIC_API_KEY;
      if (!key) return res.status(500).json({ message: "No API key" });
      const trades = await storage.getTrades({ status: "CLOSED", limit: 50 });
      const kpis = await storage.getDashboardKPIs();
      const strategyRows = await storage.getStrategyAnalytics();
      const gradeRows = await storage.getGradeAnalytics();

      const prompt = `Nexa Trading Weekly Debrief. 
KPIs: ${JSON.stringify(kpis)}
Strategy breakdown: ${JSON.stringify(strategyRows)}
Grade breakdown: ${JSON.stringify(gradeRows)}
Recent trades (last 10): ${JSON.stringify(trades.slice(0,10).map(t => ({ symbol:t.symbol, strategy:t.nexaStrategy, grade:t.signalGrade, pnl:t.pnlNet, r:t.rMultiple, emotion:t.emotionTag, exitReason:t.exitReason })))}

Provide a concise weekly debrief covering: 1) Overall performance summary, 2) Best and worst performing strategies this period, 3) Grade discipline — are A+ and A setups being prioritized? 4) Pattern in losses — what's the biggest mistake? 5) One specific improvement for next week. Be direct and data-driven.`;

      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-4-5", max_tokens: 800, system: "You are a trading performance coach for the Nexa Trading system. Be direct, data-driven, and actionable. No fluff.", messages: [{ role: "user", content: prompt }] })
      });
      const data = await r.json();
      if (!r.ok) return res.status(r.status).json(data);
      res.json(data);
    } catch(e) { res.status(500).json({ message: "Debrief failed" }); }
  });

  // ── TRADING SUMMARY FOR NEXA OS ──────────────────────────────────────────
  app.get("/api/trading/summary", async (_req, res) => {
    try {
      const kpis = await storage.getDashboardKPIs();
      const today = new Date().toISOString().split("T")[0];
      const todayTrades = await storage.getTradesByDate(today);
      const todayPnl = todayTrades.reduce((s, t) => s + (t.pnlNet || 0), 0);
      const openTrades = await storage.getTrades({ status: "OPEN" });
      res.json({
        allTimePnl: kpis.totalPnlNet,
        winRate: kpis.winRate,
        totalTrades: kpis.totalTrades,
        avgR: kpis.averageR,
        todayPnl,
        todayTrades: todayTrades.length,
        openTrades: openTrades.length,
        profitFactor: kpis.profitFactor,
      });
    } catch(e) { res.status(500).json({ message: "Failed" }); }
  });

  return httpServer;
}
