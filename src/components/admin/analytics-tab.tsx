import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAnalyticsAdmin } from "@/lib/ecommerce-fns";
import { formatINR } from "@/lib/format";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  TrendingUp,
  ArrowUpRight,
  Package,
  Users,
  Activity,
  Layers,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function AnalyticsTab() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "all">("30d");

  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ["adminAnalytics"],
    queryFn: () => getAnalyticsAdmin(),
    refetchInterval: 15000,
  });

  if (isLoading) return <div className="p-8 text-center text-muted text-sm animate-pulse">Loading studio telemetry…</div>;
  if (error || !analytics) return <div className="p-8 text-danger text-sm">Failed to load analytics telemetry</div>;

  const polymerList = analytics.polymerDistribution || [];

  const CustomTooltip = ({ active, payload, label, formatter }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-border/80 bg-surface/90 backdrop-blur-xl p-3 shadow-xl">
          <p className="text-xs text-muted mb-1">{label}</p>
          <p className="text-sm font-semibold text-accent">
            {formatter ? formatter(payload[0].value) : payload[0].value}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Header with Segmented Time Range Controller */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-fg">Studio Telemetry &amp; Performance</h2>
          <p className="text-muted mt-1 text-xs sm:text-sm">
            Live fabrication metrics, material usage breakdown, and revenue volume.
          </p>
        </div>
        <div className="flex items-center gap-1 p-1 rounded-xl glass-ios-card self-start sm:self-center">
          {(["7d", "30d", "90d", "all"] as const).map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              className={cn(
                "h-7 px-2.5 text-xs font-semibold rounded-lg transition-all uppercase cursor-pointer",
                timeRange === range
                  ? "bg-accent text-ink shadow-xs"
                  : "text-muted hover:text-fg"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Tactile Executive KPI Cards (Strictly Real Data — Zero Dummy Data) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <div className="rounded-2xl glass-ios-card p-5 shadow-xs hover-lift transition-all hover:border-accent/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Studio Revenue</span>
            {analytics.revenueGrowthPercent !== null && analytics.revenueGrowthPercent !== undefined && (
              <span className={cn(
                "inline-flex items-center gap-0.5 text-[11px] font-semibold px-1.5 py-0.5 rounded-md",
                analytics.revenueGrowthPercent >= 0
                  ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                  : "text-rose-600 dark:text-rose-400 bg-rose-500/10"
              )}>
                <ArrowUpRight className={cn("size-3", analytics.revenueGrowthPercent < 0 && "rotate-90")} />
                {analytics.revenueGrowthPercent >= 0 ? `+${analytics.revenueGrowthPercent}%` : `${analytics.revenueGrowthPercent}%`}
              </span>
            )}
          </div>
          <div className="mt-2.5 text-2xl font-bold text-fg tracking-tight">{formatINR(analytics.revenue)}</div>
          <p className="mt-1 text-[11px] text-muted">Confirmed paid orders</p>
        </div>

        {/* Total Orders */}
        <div className="rounded-2xl glass-ios-card p-5 shadow-xs hover-lift transition-all hover:border-accent/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Total Orders</span>
          </div>
          <div className="mt-2.5 text-2xl font-bold text-fg tracking-tight">{analytics.ordersCount}</div>
          <p className="mt-1 text-[11px] text-muted">All fabrication jobs in system</p>
        </div>

        {/* Registered Users */}
        <div className="rounded-2xl glass-ios-card p-5 shadow-xs hover-lift transition-all hover:border-accent/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">Registered Clients</span>
          </div>
          <div className="mt-2.5 text-2xl font-bold text-fg tracking-tight">{analytics.usersCount}</div>
          <p className="mt-1 text-[11px] text-muted">Verified customer accounts</p>
        </div>

        {/* Live Active */}
        <div className="rounded-2xl border border-accent/40 bg-accent/15 backdrop-blur-2xl p-5 shadow-xs hover-lift transition-all hover:border-accent/70">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-accent uppercase tracking-wider flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
              </span>
              Active Now
            </span>
            <span className="text-[11px] font-mono text-accent/80 font-medium">10m window</span>
          </div>
          <div className="mt-2.5 text-2xl font-bold text-accent tracking-tight">{analytics.activeUsers10m}</div>
          <p className="mt-1 text-[11px] text-muted">Last 24h: {analytics.activeUsers24h} visitor sessions</p>
        </div>
      </div>

      {/* Dual Analytics Section (Area Chart + Real Polymer Distribution) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Trend (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl glass-ios-card p-5 sm:p-6 shadow-xs flex flex-col h-[360px]">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-semibold text-fg">Revenue Trajectory</h3>
              <p className="text-[11px] text-muted">Daily invoice settlements over time</p>
            </div>
            <span className="text-xs font-mono text-accent font-semibold">{formatINR(analytics.revenue)}</span>
          </div>

          <div className="flex-1 w-full min-h-0">
            {analytics.revenueOverTime?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.revenueOverTime} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#00b8a9" stopOpacity={0.35}/>
                      <stop offset="95%" stopColor="#00b8a9" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/30" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }} tickFormatter={(val) => `₹${val/1000}k`} />
                  <Tooltip content={<CustomTooltip formatter={(val: number) => formatINR(val)} />} cursor={{ stroke: '#00b8a9', strokeOpacity: 0.3, strokeWidth: 1.5 }} />
                  <Area type="monotone" dataKey="value" stroke="#00b8a9" strokeWidth={2.5} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col h-full items-center justify-center text-xs text-muted text-center p-6">
                <span className="font-medium text-fg">No invoice data yet</span>
                <span className="text-[11px] text-muted mt-1">Revenue chart updates automatically when customer payments settle.</span>
              </div>
            )}
          </div>
        </div>

        {/* Polymer Distribution Donut Chart (1 Col - Real data or clean blank state) */}
        <div className="lg:col-span-1 rounded-2xl glass-ios-card p-5 sm:p-6 shadow-xs flex flex-col h-[360px]">
          <div className="mb-2">
            <h3 className="text-sm font-semibold text-fg flex items-center gap-1.5">
              <Layers className="size-4 text-accent" />
              <span>Polymer Distribution</span>
            </h3>
            <p className="text-[11px] text-muted">Material share by order items</p>
          </div>

          {polymerList.length > 0 ? (
            <>
              <div className="flex-1 w-full min-h-0 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height={190}>
                  <PieChart>
                    <Pie
                      data={polymerList}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {polymerList.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val: number) => [`${val}%`, "Share"]}
                      contentStyle={{
                        backgroundColor: "var(--surface)",
                        borderColor: "var(--border)",
                        borderRadius: "12px",
                        fontSize: "12px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-xs font-mono font-bold text-fg">100%</span>
                  <span className="text-[10px] text-muted">Fleet Share</span>
                </div>
              </div>

              {/* Legend with Real Material Data */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/40 text-xs">
                {polymerList.map((item: any) => (
                  <div key={item.name} className="flex items-center gap-1.5">
                    <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-muted text-[11px] truncate">{item.name}</span>
                    <span className="text-fg font-semibold text-[11px] ml-auto">{item.value}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted">
              <div className="size-12 rounded-2xl bg-surface-2/60 border border-border/60 flex items-center justify-center mb-3 text-muted">
                <Layers className="size-6 opacity-40" />
              </div>
              <p className="text-xs font-semibold text-fg">No Material Telemetry Yet</p>
              <p className="text-[11px] text-muted max-w-xs mt-1 leading-relaxed">
                Polymer distribution will render automatically as customer orders specify filaments.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Order Volume & Signups Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Order Volume */}
        <div className="rounded-2xl glass-ios-card p-5 sm:p-6 shadow-xs flex flex-col h-[300px]">
          <h3 className="text-sm font-semibold text-fg mb-4">Fabrication Volume</h3>
          <div className="flex-1 w-full min-h-0">
            {analytics.ordersOverTime?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.ordersOverTime} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/30" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }} dy={8} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'currentColor', opacity: 0.05 }} />
                  <Bar dataKey="value" fill="#00b8a9" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col h-full items-center justify-center text-xs text-muted text-center p-6">
                <span className="font-medium text-fg">No order volume data yet</span>
                <span className="text-[11px] text-muted mt-1">Volume bars appear automatically as incoming orders are registered.</span>
              </div>
            )}
          </div>
        </div>

        {/* User Growth */}
        <div className="rounded-2xl glass-ios-card p-5 sm:p-6 shadow-xs flex flex-col h-[300px]">
          <h3 className="text-sm font-semibold text-fg mb-4">Client Onboarding Growth</h3>
          <div className="flex-1 w-full min-h-0">
            {analytics.usersJoinedOverTime?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.usersJoinedOverTime} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/30" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }} dy={8} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: 'currentColor', opacity: 0.5 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'currentColor', strokeOpacity: 0.1, strokeWidth: 1.5 }} />
                  <Line type="stepAfter" dataKey="value" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, strokeWidth: 2, fill: "var(--surface)" }} activeDot={{ r: 5, fill: "#3b82f6" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col h-full items-center justify-center text-xs text-muted text-center p-6">
                <span className="font-medium text-fg">No client signup telemetry yet</span>
                <span className="text-[11px] text-muted mt-1">Client curve tracks new user accounts over time.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

