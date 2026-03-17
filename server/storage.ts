import { db } from "./db.js";
import { eq, and, desc, gte, lte } from "drizzle-orm";
import {
  users, tickers, tags, trades, tradeTags, sessions, accountSettings,
  DEFAULT_WATCHLIST,
  type User, type InsertUser,
  type Ticker, type InsertTicker,
  type Tag, type InsertTag,
  type Trade, type InsertTrade,
  type TradingSession, type InsertSession,
  type AccountSettings,
  type TradeWithMetrics, type DashboardKPIs, type AnalyticsRow,
} from "../shared/schema.js";
import bcrypt from "bcryptjs";

const USER_ID = "nexa-trade-user";

function calcPnl(t: Trade): number | null {
  if (!t.exitPrice || !t.entryPrice) return null;
  const gross = (parseFloat(t.exitPrice) - parseFloat(t.entryPrice)) * (t.contracts || 1) * 100;
  return gross - parseFloat(t.fees || "0");
}

function calcR(t: Trade): number | null {
  if (!t.exitPrice || !t.entryPrice || !t.stopPrice) return null;
  const risk = Math.abs(parseFloat(t.entryPrice) - parseFloat(t.stopPrice));
  if (risk === 0) return null;
  return (parseFloat(t.exitPrice) - parseFloat(t.entryPrice)) / risk;
}

function enrichTrade(t: Trade): TradeWithMetrics {
  const pnlNet = calcPnl(t);
  return { ...t, pnlGross: pnlNet, pnlNet, rMultiple: calcR(t), holdingTimeMinutes: t.exitTime && t.entryTime ? Math.round((new Date(t.exitTime).getTime() - new Date(t.entryTime).getTime()) / 60000) : null };
}

class Storage {
  async ensureDefaultUser(): Promise<User> {
    let [user] = await db.select().from(users).where(eq(users.email, "nexa@trade.local"));
    if (!user) {
      const hash = await bcrypt.hash("nexatrade2026", 10);
      [user] = await db.insert(users).values({ id: USER_ID, email: "nexa@trade.local", passwordHash: hash }).returning();
      await this.seedWatchlist();
      await this.upsertAccountSettings({});
    }
    return user;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const [u] = await db.select().from(users).where(eq(users.email, email));
    return u || null;
  }

  async getAccountSettings(): Promise<AccountSettings | null> {
    const [s] = await db.select().from(accountSettings).where(eq(accountSettings.userId, USER_ID));
    return s || null;
  }

  async upsertAccountSettings(data: Partial<AccountSettings>): Promise<AccountSettings> {
    const existing = await this.getAccountSettings();
    if (existing) {
      const [u] = await db.update(accountSettings).set({ ...data, updatedAt: new Date() }).where(eq(accountSettings.userId, USER_ID)).returning();
      return u;
    }
    const [c] = await db.insert(accountSettings).values({ userId: USER_ID, accountSize: "10000", maxDailyLossPct: "2", walkAwayPct: "3", fullSizePct: "2", maxTradesPerSession: 3, ...data }).returning();
    return c;
  }

  async getTodaySession(): Promise<TradingSession | null> {
    const today = new Date().toISOString().split("T")[0];
    return this.getSession(today);
  }

  async getSession(date: string): Promise<TradingSession | null> {
    const [s] = await db.select().from(sessions).where(and(eq(sessions.userId, USER_ID), eq(sessions.date, date)));
    return s || null;
  }

  async upsertSession(data: any): Promise<TradingSession> {
    const existing = await this.getSession(data.date);
    if (existing) {
      const [u] = await db.update(sessions).set(data).where(eq(sessions.id, existing.id)).returning();
      return u;
    }
    const [c] = await db.insert(sessions).values({ userId: USER_ID, ...data }).returning();
    return c;
  }

  async getSessions(limit = 30): Promise<TradingSession[]> {
    return db.select().from(sessions).where(eq(sessions.userId, USER_ID)).orderBy(desc(sessions.date)).limit(limit);
  }

  async getTickers(): Promise<Ticker[]> {
    return db.select().from(tickers).where(eq(tickers.userId, USER_ID)).orderBy(tickers.symbol);
  }

  async addTicker(t: InsertTicker): Promise<Ticker> {
    const [tk] = await db.insert(tickers).values({ ...t, userId: USER_ID }).returning();
    return tk;
  }

  async updateTicker(id: string, data: Partial<Ticker>): Promise<Ticker> {
    const [u] = await db.update(tickers).set(data).where(eq(tickers.id, id)).returning();
    return u;
  }

  async deleteTicker(id: string): Promise<void> {
    await db.delete(tickers).where(eq(tickers.id, id));
  }

  async seedWatchlist(): Promise<void> {
    const existing = await this.getTickers();
    if (existing.length > 0) return;
    const cats: Record<string, string> = { SPY:"Index",SPX:"Index",QQQ:"Index",NDX:"Index",IWM:"Index",NVDA:"MegaCap",PLTR:"MegaCap",AAPL:"MegaCap",AMZN:"MegaCap",GOOGL:"MegaCap",QCOM:"Momentum",AAL:"Momentum",SMCI:"Momentum",OXY:"Momentum",SNAP:"Momentum",BAC:"Momentum",PFE:"Momentum",NIO:"Momentum",SOFI:"Momentum",CLF:"Momentum" };
    await db.insert(tickers).values(DEFAULT_WATCHLIST.map(s => ({ userId: USER_ID, symbol: s, category: cats[s] || "Other", active: true })));
  }

  async getTrades(filters?: { status?: string; strategy?: string; grade?: string; limit?: number }): Promise<TradeWithMetrics[]> {
    const all = await db.select().from(trades).where(eq(trades.userId, USER_ID)).orderBy(desc(trades.entryTime)).limit(filters?.limit || 500);
    let filtered = all;
    if (filters?.status) filtered = filtered.filter(t => t.status === filters.status);
    if (filters?.strategy) filtered = filtered.filter(t => t.nexaStrategy === filters.strategy);
    if (filters?.grade) filtered = filtered.filter(t => t.signalGrade === filters.grade);
    return filtered.map(enrichTrade);
  }

  async getTrade(id: string): Promise<TradeWithMetrics | null> {
    const [t] = await db.select().from(trades).where(and(eq(trades.id, id), eq(trades.userId, USER_ID)));
    return t ? enrichTrade(t) : null;
  }

  async createTrade(data: InsertTrade): Promise<TradeWithMetrics> {
    const [t] = await db.insert(trades).values({ ...data, userId: USER_ID }).returning();
    return enrichTrade(t);
  }

  async updateTrade(id: string, data: any): Promise<TradeWithMetrics> {
    const [t] = await db.update(trades).set({ ...data, updatedAt: new Date() }).where(and(eq(trades.id, id), eq(trades.userId, USER_ID))).returning();
    return enrichTrade(t);
  }

  async deleteTrade(id: string): Promise<void> {
    await db.delete(trades).where(and(eq(trades.id, id), eq(trades.userId, USER_ID)));
  }

  async getTradesByDate(date: string): Promise<TradeWithMetrics[]> {
    const start = new Date(date + "T00:00:00Z");
    const end = new Date(date + "T23:59:59Z");
    const list = await db.select().from(trades).where(and(eq(trades.userId, USER_ID), gte(trades.entryTime, start), lte(trades.entryTime, end))).orderBy(trades.entryTime);
    return list.map(enrichTrade);
  }

  async getDashboardKPIs(filters?: { dateFrom?: string; dateTo?: string }): Promise<DashboardKPIs> {
    let all = await this.getTrades({ status: "CLOSED" });
    if (filters?.dateFrom) all = all.filter(t => new Date(t.entryTime) >= new Date(filters.dateFrom!));
    if (filters?.dateTo) all = all.filter(t => new Date(t.entryTime) <= new Date(filters.dateTo!));
    if (!all.length) return { totalPnlNet:0,winRate:0,avgWin:0,avgLoss:0,profitFactor:0,expectancy:0,maxDrawdown:0,totalTrades:0,winningTrades:0,losingTrades:0,averageR:0 };
    const winners = all.filter(t => (t.pnlNet||0) > 0);
    const losers = all.filter(t => (t.pnlNet||0) <= 0);
    const totalPnl = all.reduce((s,t) => s+(t.pnlNet||0), 0);
    const grossP = winners.reduce((s,t) => s+(t.pnlNet||0), 0);
    const grossL = Math.abs(losers.reduce((s,t) => s+(t.pnlNet||0), 0));
    const rTrades = all.filter(t => t.rMultiple !== null);
    const avgR = rTrades.length ? rTrades.reduce((s,t) => s+(t.rMultiple||0),0)/rTrades.length : 0;
    let peak=0,maxDD=0,running=0;
    for (const t of all.sort((a,b) => new Date(a.entryTime).getTime()-new Date(b.entryTime).getTime())) {
      running += t.pnlNet||0; if(running>peak)peak=running; const dd=peak-running; if(dd>maxDD)maxDD=dd;
    }
    return { totalPnlNet:totalPnl, winRate:all.length?winners.length/all.length:0, avgWin:winners.length?grossP/winners.length:0, avgLoss:losers.length?grossL/losers.length:0, profitFactor:grossL>0?grossP/grossL:0, expectancy:totalPnl/all.length, maxDrawdown:maxDD, totalTrades:all.length, winningTrades:winners.length, losingTrades:losers.length, averageR:avgR };
  }

  private buildRows(all: TradeWithMetrics[], fn: (t: TradeWithMetrics) => string): AnalyticsRow[] {
    const groups = new Map<string, TradeWithMetrics[]>();
    for (const t of all) { const k=fn(t); if(!groups.has(k))groups.set(k,[]); groups.get(k)!.push(t); }
    const rows: AnalyticsRow[] = [];
    for (const [label, group] of groups) {
      const closed = group.filter(t => t.status==="CLOSED"); if(!closed.length)continue;
      const winners = closed.filter(t => (t.pnlNet||0)>0);
      const totalPnl = closed.reduce((s,t) => s+(t.pnlNet||0),0);
      const rTs = closed.filter(t => t.rMultiple!==null);
      const avgR = rTs.length ? rTs.reduce((s,t) => s+(t.rMultiple||0),0)/rTs.length : null;
      const grossP = winners.reduce((s,t) => s+(t.pnlNet||0),0);
      const grossL = Math.abs(closed.filter(t => (t.pnlNet||0)<=0).reduce((s,t) => s+(t.pnlNet||0),0));
      rows.push({ label, trades:closed.length, winRate:winners.length/closed.length, totalPnlNet:totalPnl, avgR, expectancy:totalPnl/closed.length, profitFactor:grossL>0?grossP/grossL:null, lowSample:closed.length<10 });
    }
    return rows.sort((a,b) => b.totalPnlNet-a.totalPnlNet);
  }

  async getStrategyAnalytics(): Promise<AnalyticsRow[]> {
    const m: Record<string,string> = { ORB_MOMENTUM:"🟢 ORB Momentum", ORB_VWAP:"🔵 ORB + VWAP", BREAK_RETEST:"🟠 Break & Retest", VWAP_FIRST_TOUCH:"🟡 VWAP First Touch" };
    return this.buildRows(await this.getTrades(), t => m[t.nexaStrategy]||t.nexaStrategy);
  }

  async getGradeAnalytics(): Promise<AnalyticsRow[]> {
    const m: Record<string,string> = { A_PLUS:"A+", A:"A", B:"B", C:"C" };
    return this.buildRows(await this.getTrades(), t => m[t.signalGrade]||t.signalGrade);
  }

  async getDteAnalytics(): Promise<AnalyticsRow[]> {
    return this.buildRows(await this.getTrades(), t => {
      if(t.dte===0)return "0DTE"; if(t.dte<=3)return "1-3 Days"; if(t.dte<=7)return "Weekly"; if(t.dte<=21)return "8-21 Days"; return "Longer Term";
    });
  }

  async getEquityCurve(): Promise<{ date: string; equity: number }[]> {
    const all = (await this.getTrades({ status:"CLOSED" })).sort((a,b) => new Date(a.entryTime).getTime()-new Date(b.entryTime).getTime());
    let running = 0;
    return all.map(t => { running+=t.pnlNet||0; return { date:new Date(t.entryTime).toISOString().split("T")[0], equity:running }; });
  }

  async getCalendarPnl(): Promise<{ date: string; pnl: number; trades: number }[]> {
    const all = await this.getTrades({ status:"CLOSED" });
    const byDate = new Map<string,{pnl:number;trades:number}>();
    for (const t of all) { const d=new Date(t.entryTime).toISOString().split("T")[0]; const ex=byDate.get(d)||{pnl:0,trades:0}; byDate.set(d,{pnl:ex.pnl+(t.pnlNet||0),trades:ex.trades+1}); }
    return Array.from(byDate.entries()).map(([date,data]) => ({date,...data}));
  }

  async getTags(): Promise<Tag[]> {
    return db.select().from(tags).where(eq(tags.userId, USER_ID)).orderBy(tags.name);
  }

  async createTag(t: InsertTag): Promise<Tag> {
    const [tag] = await db.insert(tags).values({ ...t, userId: USER_ID }).returning();
    return tag;
  }

  async deleteTag(id: string): Promise<void> {
    await db.delete(tags).where(and(eq(tags.id, id), eq(tags.userId, USER_ID)));
  }
}

export const storage = new Storage();
