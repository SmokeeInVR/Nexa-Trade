import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/app-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  Target,
  BarChart3,
  Scale,
  Activity,
  ArrowDownRight,
  DollarSign,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { useState } from "react";
import type { DashboardKPIs } from "@shared/schema";

interface EquityPoint {
  date: string;
  equity: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function KPICard({
  title,
  value,
  icon: Icon,
  isProfit,
  isPercent,
  subtitle,
}: {
  title: string;
  value: number | null;
  icon: React.ElementType;
  isProfit?: boolean;
  isPercent?: boolean;
  subtitle?: string;
}) {
  const displayValue = value === null ? "—" : isPercent ? formatPercent(value) : formatCurrency(value);
  const colorClass =
    value === null
      ? "text-muted-foreground"
      : isProfit === undefined
      ? "text-foreground"
      : value >= 0
      ? "text-profit"
      : "text-loss";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 gap-1 p-3 md:p-4">
        <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-3 pt-0 md:p-4 md:pt-0">
        <div className={`text-lg md:text-2xl font-bold ${colorClass}`} data-testid={`kpi-${title.toLowerCase().replace(/\s+/g, "-")}`}>
          {displayValue}
        </div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const [dateRange, setDateRange] = useState("all");

  const { data: kpis, isLoading: kpisLoading } = useQuery<DashboardKPIs>({
    queryKey: ["/api/dashboard/kpis", dateRange], queryFn: () => fetch(`/api/dashboard/kpis?dateRange=${dateRange}`).then(r => r.json()),
  });

  const { data: equityData, isLoading: equityLoading } = useQuery<EquityPoint[]>({
    queryKey: ["/api/dashboard/equity", dateRange], queryFn: () => fetch(`/api/dashboard/equity?dateRange=${dateRange}`).then(r => r.json()),
  });

  const { data: topTickers } = useQuery<{ symbol: string; expectancy: number; trades: number }[]>({
    queryKey: ["/api/dashboard/top-tickers", dateRange], queryFn: () => fetch(`/api/dashboard/top-tickers?dateRange=${dateRange}`).then(r => r.json()),
  });

  const { data: topStrategies } = useQuery<{ strategy: string; expectancy: number; trades: number }[]>({
    queryKey: ["/api/dashboard/top-strategies", dateRange], queryFn: () => fetch(`/api/dashboard/top-strategies?dateRange=${dateRange}`).then(r => r.json()),
  });

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-4 md:space-y-6" data-testid="page-dashboard">
        <div className="flex items-center justify-between flex-wrap gap-2 md:gap-4">
          <div>
            <p className="text-sm md:text-base text-muted-foreground">Your trading performance at a glance</p>
          </div>
          <Select value={dateRange} onValueChange={setDateRange} data-testid="select-date-range">
            <SelectTrigger className="w-[140px] md:w-[160px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-3 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
          {kpisLoading ? (
            <>
              {[...Array(8)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-20" />
                  </CardContent>
                </Card>
              ))}
            </>
          ) : (
            <>
              <KPICard
                title="Total P&L"
                value={kpis?.totalPnlNet ?? 0}
                icon={DollarSign}
                isProfit
                subtitle={`${kpis?.totalTrades ?? 0} trades`}
              />
              <KPICard
                title="Win Rate"
                value={kpis?.winRate ?? 0}
                icon={Target}
                isPercent
                subtitle={`${kpis?.winningTrades ?? 0}W / ${kpis?.losingTrades ?? 0}L`}
              />
              <KPICard
                title="Avg Win"
                value={kpis?.avgWin ?? 0}
                icon={TrendingUp}
              />
              <KPICard
                title="Avg Loss"
                value={kpis?.avgLoss ?? 0}
                icon={TrendingDown}
              />
              <KPICard
                title="Profit Factor"
                value={kpis?.profitFactor ?? null}
                icon={Scale}
              />
              <KPICard
                title="Expectancy"
                value={kpis?.expectancy ?? null}
                icon={Activity}
              />
              <KPICard
                title="Max Drawdown"
                value={kpis?.maxDrawdown ?? 0}
                icon={ArrowDownRight}
                isProfit
              />
              <KPICard
                title="Average R"
                value={kpis?.expectancy ?? null}
                icon={BarChart3}
              />
            </>
          )}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Equity Curve
              </CardTitle>
            </CardHeader>
            <CardContent>
              {equityLoading ? (
                <Skeleton className="h-[300px] w-full" />
              ) : equityData && equityData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={equityData}>
                    <defs>
                      <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--profit))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--profit))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="date"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    />
                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `$${value.toLocaleString()}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--popover))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      formatter={(value: number) => [formatCurrency(value), "Equity"]}
                    />
                    <Area
                      type="monotone"
                      dataKey="equity"
                      stroke="hsl(var(--profit))"
                      fill="url(#equityGradient)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No trade data available. Start logging trades to see your equity curve.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Tickers by Expectancy</CardTitle>
            </CardHeader>
            <CardContent>
              {topTickers && topTickers.length > 0 ? (
                <div className="space-y-3">
                  {topTickers.map((ticker, i) => (
                    <div key={ticker.symbol} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                        <span className="font-mono font-medium">{ticker.symbol}</span>
                        <span className="text-xs text-muted-foreground">({ticker.trades} trades)</span>
                      </div>
                      <span className={ticker.expectancy >= 0 ? "text-profit" : "text-loss"}>
                        {formatCurrency(ticker.expectancy)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No data yet</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Strategies by Expectancy</CardTitle>
            </CardHeader>
            <CardContent>
              {topStrategies && topStrategies.length > 0 ? (
                <div className="space-y-3">
                  {topStrategies.map((strategy, i) => (
                    <div key={strategy.strategy} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground w-4">{i + 1}</span>
                        <span className="font-medium">{strategy.strategy}</span>
                        <span className="text-xs text-muted-foreground">({strategy.trades} trades)</span>
                      </div>
                      <span className={strategy.expectancy >= 0 ? "text-profit" : "text-loss"}>
                        {formatCurrency(strategy.expectancy)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No data yet</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
