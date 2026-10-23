import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getAnalyticsAdmin } from "@/lib/ecommerce-fns";
import { formatINR } from "@/lib/format";
import { AreaChart, Area, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function AnalyticsTab() {
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ["adminAnalytics"],
    queryFn: () => getAnalyticsAdmin(),
    refetchInterval: 15000,
  });

  if (isLoading) return <div className="p-8 text-center text-muted">Loading analytics...</div>;
  if (error || !analytics) return <div className="p-8 text-danger">Failed to load analytics</div>;

  const CustomTooltip = ({ active, payload, label, formatter }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-xl border border-white/20 dark:border-white/10 bg-surface/50 backdrop-blur-2xl backdrop-saturate-150 p-4 shadow-2xl shadow-black/10">
          <p className="text-sm text-muted mb-1">{label}</p>
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
      <div>
        <h2 className="text-2xl font-semibold bg-gradient-to-r from-ink to-ink/60 bg-clip-text text-transparent">Analytics Dashboard</h2>
        <p className="text-muted mt-1 text-sm font-mono tracking-tight">Real-time metrics & telemetry.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-surface/30 backdrop-blur-2xl backdrop-saturate-150 p-6 shadow-xl shadow-black/5 transition-all hover:bg-surface/40">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">Total Revenue</div>
          <div className="mt-2 text-2xl font-bold">{formatINR(analytics.revenue)}</div>
        </div>
        <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-surface/30 backdrop-blur-2xl backdrop-saturate-150 p-6 shadow-xl shadow-black/5 transition-all hover:bg-surface/40">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">Total Orders</div>
          <div className="mt-2 text-2xl font-bold">{analytics.ordersCount}</div>
        </div>
        <div className="rounded-2xl border border-white/20 dark:border-white/10 bg-surface/30 backdrop-blur-2xl backdrop-saturate-150 p-6 shadow-xl shadow-black/5 transition-all hover:bg-surface/40">
          <div className="text-xs font-medium text-muted uppercase tracking-wider">Total Users</div>
          <div className="mt-2 text-2xl font-bold">{analytics.usersCount}</div>
        </div>
        <div className="rounded-2xl border border-accent/30 bg-accent/10 backdrop-blur-2xl backdrop-saturate-150 p-6 shadow-xl shadow-accent/5 transition-all hover:bg-accent/15">
          <div className="text-xs font-medium text-accent uppercase tracking-wider flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
            </span>
            Active Now (10 min)
          </div>
          <div className="mt-2 text-2xl font-bold text-accent">{analytics.activeUsers10m}</div>
          <div className="mt-1 text-xs text-muted">Last 24h: {analytics.activeUsers24h}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="rounded-3xl border border-white/20 dark:border-white/10 bg-surface/30 backdrop-blur-2xl backdrop-saturate-150 p-6 shadow-xl shadow-black/5 flex flex-col h-[350px]">
          <h3 className="text-sm font-medium text-muted mb-6 uppercase tracking-wider">Revenue Trend</h3>
          <div className="flex-1 w-full min-h-0">
            {analytics.revenueOverTime?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={analytics.revenueOverTime} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/30" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.5 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.5 }} tickFormatter={(val) => `₹${val/1000}k`} />
                  <Tooltip content={<CustomTooltip formatter={(val: number) => formatINR(val)} />} cursor={{ stroke: 'currentColor', strokeOpacity: 0.1, strokeWidth: 2 }} />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">No data yet</div>
            )}
          </div>
        </div>

        {/* Order Volume */}
        <div className="rounded-3xl border border-white/20 dark:border-white/10 bg-surface/30 backdrop-blur-2xl backdrop-saturate-150 p-6 shadow-xl shadow-black/5 flex flex-col h-[350px]">
          <h3 className="text-sm font-medium text-muted mb-6 uppercase tracking-wider">Order Volume</h3>
          <div className="flex-1 w-full min-h-0">
            {analytics.ordersOverTime?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.ordersOverTime} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/30" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.5 }} dy={10} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.5 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'currentColor', opacity: 0.05 }} />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">No data yet</div>
            )}
          </div>
        </div>

        {/* User Growth */}
        <div className="rounded-3xl border border-white/20 dark:border-white/10 bg-surface/30 backdrop-blur-2xl backdrop-saturate-150 p-6 shadow-xl shadow-black/5 flex flex-col h-[350px] lg:col-span-2">
          <h3 className="text-sm font-medium text-muted mb-6 uppercase tracking-wider">User Growth (Signups)</h3>
          <div className="flex-1 w-full min-h-0">
            {analytics.usersJoinedOverTime?.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.usersJoinedOverTime} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-border/30" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.5 }} dy={10} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: 'currentColor', opacity: 0.5 }} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'currentColor', strokeOpacity: 0.1, strokeWidth: 2 }} />
                  <Line type="stepAfter" dataKey="value" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, strokeWidth: 2, fill: "var(--color-surface)" }} activeDot={{ r: 6, fill: "#3b82f6" }} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">No data yet</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

