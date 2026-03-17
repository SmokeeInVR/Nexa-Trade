import { Switch, Route, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import SessionPage from "@/pages/session";
import AddTradePage from "@/pages/add-trade";
import TradesPage from "@/pages/trades";
import TradeDetailPage from "@/pages/trade-detail";
import AnalyticsPage from "@/pages/analytics";
import WatchlistPage from "@/pages/watchlist";
import SettingsPage from "@/pages/settings";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchInterval: false, refetchOnWindowFocus: false, staleTime: 30000, retry: false } },
});

function Router() {
  return (
    <Switch>
      <Route path="/"><Redirect to="/session" /></Route>
      <Route path="/session" component={SessionPage} />
      <Route path="/trades" component={TradesPage} />
      <Route path="/trades/new" component={AddTradePage} />
      <Route path="/trades/:id" component={TradeDetailPage} />
      <Route path="/analytics" component={AnalyticsPage} />
      <Route path="/watchlist" component={WatchlistPage} />
      <Route path="/settings" component={SettingsPage} />
    </Switch>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
