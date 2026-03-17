import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const httpServer = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS for dev
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", process.env.CLIENT_URL || "*");
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE,PATCH,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

// Auto-migrate on startup
try {
  const { sql } = await import("drizzle-orm");
  const { db } = await import("./db.js");
  await db.execute(sql`CREATE TABLE IF NOT EXISTS users (id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS account_settings (id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text, user_id VARCHAR(36) NOT NULL, account_size DECIMAL(12,2) DEFAULT 10000, max_daily_loss_pct DECIMAL(5,2) DEFAULT 2, walk_away_pct DECIMAL(5,2) DEFAULT 3, full_size_pct DECIMAL(5,2) DEFAULT 2, max_trades_per_session INTEGER DEFAULT 3, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS trading_sessions (id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text, user_id VARCHAR(36) NOT NULL, date DATE NOT NULL, pdh DECIMAL(10,2), pdl DECIMAL(10,2), pdc DECIMAL(10,2), pwh DECIMAL(10,2), pwl DECIMAL(10,2), pmh DECIMAL(10,2), pml DECIMAL(10,2), manual_levels TEXT, watchlist TEXT, market_bias TEXT, pre_market_notes TEXT, session_notes TEXT, stopped BOOLEAN DEFAULT false, walked_away BOOLEAN DEFAULT false, created_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS tickers (id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text, user_id VARCHAR(36) NOT NULL, symbol TEXT NOT NULL, category TEXT, active BOOLEAN DEFAULT true NOT NULL, notes TEXT, created_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS tags (id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text, user_id VARCHAR(36) NOT NULL, name TEXT NOT NULL, created_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  await db.execute(sql`DO $$ BEGIN CREATE TYPE option_type AS ENUM ('CALL','PUT'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
  await db.execute(sql`DO $$ BEGIN CREATE TYPE trade_status AS ENUM ('OPEN','CLOSED'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
  await db.execute(sql`DO $$ BEGIN CREATE TYPE signal_grade AS ENUM ('A_PLUS','A','B','C'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
  await db.execute(sql`DO $$ BEGIN CREATE TYPE nexa_strategy AS ENUM ('ORB_MOMENTUM','ORB_VWAP','BREAK_RETEST','VWAP_FIRST_TOUCH'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
  await db.execute(sql`DO $$ BEGIN CREATE TYPE exit_reason AS ENUM ('TP1','TP2','TP3','STOPPED','MANUAL','EXPIRED'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
  await db.execute(sql`DO $$ BEGIN CREATE TYPE emotion_tag AS ENUM ('CONFIDENT','PATIENT','FOMO','REVENGE','HESITANT','NEUTRAL'); EXCEPTION WHEN duplicate_object THEN null; END $$`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS trades (id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text, user_id VARCHAR(36) NOT NULL, session_id VARCHAR(36), symbol TEXT NOT NULL, option_type option_type NOT NULL, strike DECIMAL(10,2) NOT NULL, expiration DATE NOT NULL, dte INTEGER NOT NULL, nexa_strategy nexa_strategy NOT NULL, signal_grade signal_grade NOT NULL, vwap_boost BOOLEAN DEFAULT false NOT NULL, effective_grade signal_grade NOT NULL, filter_atr BOOLEAN DEFAULT true NOT NULL, filter_time_of_day BOOLEAN DEFAULT true NOT NULL, filter_orb_size BOOLEAN DEFAULT true NOT NULL, filter_key_level BOOLEAN DEFAULT true NOT NULL, entry_time TIMESTAMP NOT NULL, entry_price DECIMAL(10,4) NOT NULL, contracts INTEGER DEFAULT 1 NOT NULL, fees DECIMAL(10,2) DEFAULT 0 NOT NULL, stop_price DECIMAL(10,4), tp1_price DECIMAL(10,4), tp2_price DECIMAL(10,4), tp3_price DECIMAL(10,4), risk_amount DECIMAL(10,2), exit_time TIMESTAMP, exit_price DECIMAL(10,4), exit_reason exit_reason, status trade_status DEFAULT 'OPEN' NOT NULL, emotion_tag emotion_tag, chart_screenshot TEXT, notes TEXT, setup_description TEXT, created_at TIMESTAMP DEFAULT NOW() NOT NULL, updated_at TIMESTAMP DEFAULT NOW() NOT NULL)`);
  await db.execute(sql`CREATE TABLE IF NOT EXISTS trade_tags (id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid()::text, trade_id VARCHAR(36) NOT NULL, tag_id VARCHAR(36) NOT NULL)`);
  console.log("✅ DB migrations complete");
} catch(e) { console.error("Migration error:", e); }
await registerRoutes(httpServer, app);

if (process.env.NODE_ENV === "production") {
  // When running with tsx, __dirname is /app/server
  // dist is built to /app/dist by vite
  const distPath = path.resolve(process.cwd(), "dist");
  console.log("Serving static from:", distPath);
  app.use(express.static(distPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

const PORT = parseInt(process.env.PORT || "5000");
httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`NexaTrade running on port ${PORT}`);
});
