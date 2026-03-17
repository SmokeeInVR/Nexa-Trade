import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, date, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// ── ENUMS ─────────────────────────────────────────────────────────────────────
export const optionTypeEnum = pgEnum("option_type", ["CALL", "PUT"]);
export const tradeStatusEnum = pgEnum("trade_status", ["OPEN", "CLOSED"]);
export const signalGradeEnum = pgEnum("signal_grade", ["A_PLUS", "A", "B", "C"]);
export const nexaStrategyEnum = pgEnum("nexa_strategy", [
  "ORB_MOMENTUM",
  "ORB_VWAP",
  "BREAK_RETEST",
  "VWAP_FIRST_TOUCH"
]);
export const exitReasonEnum = pgEnum("exit_reason", [
  "TP1", "TP2", "TP3", "STOPPED", "MANUAL", "EXPIRED"
]);
export const emotionEnum = pgEnum("emotion_tag", [
  "CONFIDENT", "PATIENT", "FOMO", "REVENGE", "HESITANT", "NEUTRAL"
]);

// ── USERS ─────────────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── ACCOUNT SETTINGS ──────────────────────────────────────────────────────────
export const accountSettings = pgTable("account_settings", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  accountSize: decimal("account_size", { precision: 12, scale: 2 }).default("10000"),
  maxDailyLossPct: decimal("max_daily_loss_pct", { precision: 5, scale: 2 }).default("2"),
  walkAwayPct: decimal("walk_away_pct", { precision: 5, scale: 2 }).default("3"),
  fullSizePct: decimal("full_size_pct", { precision: 5, scale: 2 }).default("2"),
  maxTradesPerSession: integer("max_trades_per_session").default(3),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── SESSION LOG ───────────────────────────────────────────────────────────────
export const sessions = pgTable("trading_sessions", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  date: date("date").notNull(),
  // Pre-market levels
  pdh: decimal("pdh", { precision: 10, scale: 2 }),
  pdl: decimal("pdl", { precision: 10, scale: 2 }),
  pdc: decimal("pdc", { precision: 10, scale: 2 }),
  pwh: decimal("pwh", { precision: 10, scale: 2 }),
  pwl: decimal("pwl", { precision: 10, scale: 2 }),
  pmh: decimal("pmh", { precision: 10, scale: 2 }),
  pml: decimal("pml", { precision: 10, scale: 2 }),
  manualLevels: text("manual_levels"), // JSON array of price levels
  watchlist: text("watchlist"),         // JSON array of tickers for session
  marketBias: text("market_bias"),      // BULL / BEAR / NEUTRAL
  preMarketNotes: text("pre_market_notes"),
  sessionNotes: text("session_notes"),
  stopped: boolean("stopped").default(false), // hit max loss limit
  walkedAway: boolean("walked_away").default(false), // hit walk away target
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── TICKERS ───────────────────────────────────────────────────────────────────
export const tickers = pgTable("tickers", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  symbol: text("symbol").notNull(),
  category: text("category"),
  active: boolean("active").default(true).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ── TRADES ────────────────────────────────────────────────────────────────────
export const trades = pgTable("trades", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  sessionId: varchar("session_id", { length: 36 }).references(() => sessions.id),

  // Instrument
  symbol: text("symbol").notNull(),
  optionType: optionTypeEnum("option_type").notNull(),
  strike: decimal("strike", { precision: 10, scale: 2 }).notNull(),
  expiration: date("expiration").notNull(),
  dte: integer("dte").notNull(),

  // Nexa strategy fields
  nexaStrategy: nexaStrategyEnum("nexa_strategy").notNull(),
  signalGrade: signalGradeEnum("signal_grade").notNull(),
  vwapBoost: boolean("vwap_boost").default(false).notNull(),
  effectiveGrade: signalGradeEnum("effective_grade").notNull(), // after vwap boost

  // Filters passed
  filterAtr: boolean("filter_atr").default(true).notNull(),
  filterTimeOfDay: boolean("filter_time_of_day").default(true).notNull(),
  filterOrbSize: boolean("filter_orb_size").default(true).notNull(),
  filterKeyLevel: boolean("filter_key_level").default(true).notNull(),

  // Entry
  entryTime: timestamp("entry_time").notNull(),
  entryPrice: decimal("entry_price", { precision: 10, scale: 4 }).notNull(),
  contracts: integer("contracts").notNull().default(1),
  fees: decimal("fees", { precision: 10, scale: 2 }).default("0").notNull(),

  // Risk levels
  stopPrice: decimal("stop_price", { precision: 10, scale: 4 }),
  tp1Price: decimal("tp1_price", { precision: 10, scale: 4 }),
  tp2Price: decimal("tp2_price", { precision: 10, scale: 4 }),
  tp3Price: decimal("tp3_price", { precision: 10, scale: 4 }),
  riskAmount: decimal("risk_amount", { precision: 10, scale: 2 }), // $ at risk

  // Exit
  exitTime: timestamp("exit_time"),
  exitPrice: decimal("exit_price", { precision: 10, scale: 4 }),
  exitReason: exitReasonEnum("exit_reason"),
  status: tradeStatusEnum("status").default("OPEN").notNull(),

  // Psychology
  emotionTag: emotionEnum("emotion_tag"),
  chartScreenshot: text("chart_screenshot"), // URL or base64

  // Notes
  notes: text("notes"),
  setupDescription: text("setup_description"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ── TAGS ──────────────────────────────────────────────────────────────────────
export const tags = pgTable("tags", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id", { length: 36 }).notNull().references(() => users.id),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tradeTags = pgTable("trade_tags", {
  id: varchar("id", { length: 36 }).primaryKey().default(sql`gen_random_uuid()`),
  tradeId: varchar("trade_id", { length: 36 }).notNull().references(() => trades.id),
  tagId: varchar("tag_id", { length: 36 }).notNull().references(() => tags.id),
});

// ── NEXA CONSTANTS ────────────────────────────────────────────────────────────
export const NEXA_STRATEGIES = [
  { id: "ORB_MOMENTUM",      label: "ORB Momentum",         emoji: "🟢", color: "#22c55e", description: "Opening range breakout — body close above/below OR high/low" },
  { id: "ORB_VWAP",          label: "ORB + VWAP",           emoji: "🔵", color: "#60a5fa", description: "ORB breakout with VWAP confluence — highest conviction ORB" },
  { id: "BREAK_RETEST",      label: "Break & Retest",       emoji: "🟠", color: "#f97316", description: "Key level broken after 3+ rejections" },
  { id: "VWAP_FIRST_TOUCH",  label: "VWAP First Touch",     emoji: "🟡", color: "#eab308", description: "First VWAP touch of session with volume spike" },
] as const;

export const SIGNAL_GRADES = [
  { id: "A_PLUS", label: "A+", description: "3x avg volume — Full size", color: "#D4A53E", sizeMultiplier: 1.0 },
  { id: "A",      label: "A",  description: "2x avg volume — Full size", color: "#22c55e", sizeMultiplier: 1.0 },
  { id: "B",      label: "B",  description: "1.5x avg volume — 50% size", color: "#60a5fa", sizeMultiplier: 0.5 },
  { id: "C",      label: "C",  description: "1.2x avg volume — Skip options", color: "#ef4444", sizeMultiplier: 0 },
] as const;

export const EMOTIONS = [
  { id: "CONFIDENT", label: "Confident", emoji: "💪" },
  { id: "PATIENT",   label: "Patient",   emoji: "🧘" },
  { id: "FOMO",      label: "FOMO",      emoji: "😰" },
  { id: "REVENGE",   label: "Revenge",   emoji: "😤" },
  { id: "HESITANT",  label: "Hesitant",  emoji: "😟" },
  { id: "NEUTRAL",   label: "Neutral",   emoji: "😐" },
] as const;

export const EXIT_REASONS = [
  { id: "TP1",     label: "TP1 (1R)",    emoji: "🎯" },
  { id: "TP2",     label: "TP2 (2R)",    emoji: "🎯🎯" },
  { id: "TP3",     label: "TP3 (3R)",    emoji: "🎯🎯🎯" },
  { id: "STOPPED", label: "Stopped Out", emoji: "🛑" },
  { id: "MANUAL",  label: "Manual Exit", emoji: "✋" },
  { id: "EXPIRED", label: "Expired",     emoji: "⏰" },
] as const;

export const DEFAULT_WATCHLIST = [
  "SPY", "SPX", "QQQ", "NDX", "IWM",
  "NVDA", "PLTR", "AAPL", "AMZN", "GOOGL",
  "QCOM", "AAL", "SMCI", "OXY", "SNAP",
  "BAC", "PFE", "NIO", "SOFI", "CLF"
];

export const DTE_BUCKETS = [
  { label: "0DTE", min: 0, max: 0 },
  { label: "1-3d", min: 1, max: 3 },
  { label: "Weekly", min: 4, max: 7 },
  { label: "8-21d", min: 8, max: 21 },
  { label: "Longer", min: 22, max: Infinity },
];

// ── INSERT SCHEMAS ────────────────────────────────────────────────────────────
export const insertUserSchema = createInsertSchema(users).omit({ createdAt: true }).partial({ id: true });
export const insertTickerSchema = createInsertSchema(tickers).omit({ id: true, createdAt: true });
export const insertTagSchema = createInsertSchema(tags).omit({ id: true, createdAt: true });
export const insertTradeTagSchema = createInsertSchema(tradeTags).omit({ id: true });

export const insertTradeSchema = createInsertSchema(trades, {
  expiration: z.string(),
  entryTime: z.string().or(z.date()).transform(v => typeof v === "string" ? new Date(v) : v),
  exitTime: z.string().or(z.date()).transform(v => typeof v === "string" ? new Date(v) : v).optional().nullable(),
}).omit({ id: true, createdAt: true, updatedAt: true });

export const insertSessionSchema = createInsertSchema(sessions, {
  date: z.string(),
  manualLevels: z.string().optional(),
  watchlist: z.string().optional(),
}).omit({ id: true, createdAt: true });

export const insertAccountSettingsSchema = createInsertSchema(accountSettings).omit({ id: true, updatedAt: true });

// ── TYPES ─────────────────────────────────────────────────────────────────────
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertTicker = z.infer<typeof insertTickerSchema>;
export type Ticker = typeof tickers.$inferSelect;
export type InsertTag = z.infer<typeof insertTagSchema>;
export type Tag = typeof tags.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type Trade = typeof trades.$inferSelect;
export type InsertTradeTag = z.infer<typeof insertTradeTagSchema>;
export type TradeTag = typeof tradeTags.$inferSelect;
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type TradingSession = typeof sessions.$inferSelect;
export type AccountSettings = typeof accountSettings.$inferSelect;

export const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ── COMPUTED METRICS ──────────────────────────────────────────────────────────
export interface TradeWithMetrics extends Trade {
  pnlGross: number | null;
  pnlNet: number | null;
  rMultiple: number | null;
  holdingTimeMinutes: number | null;
  tags?: Tag[];
}

export interface DashboardKPIs {
  totalPnlNet: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  expectancy: number;
  maxDrawdown: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageR: number;
}

export interface AnalyticsRow {
  label: string;
  trades: number;
  winRate: number;
  totalPnlNet: number;
  avgR: number | null;
  expectancy: number | null;
  profitFactor: number | null;
  lowSample: boolean;
}

export interface SessionStatus {
  date: string;
  tradesCount: number;
  pnlToday: number;
  maxLossLimit: number;
  walkAwayTarget: number;
  maxLossHit: boolean;
  walkAwayHit: boolean;
  sessionActive: boolean;
  minutesRemaining: number;
}
