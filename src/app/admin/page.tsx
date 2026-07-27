"use client";

import { motion } from "framer-motion";
import {
  Users,
  Calendar,
  FolderKanban,
  Heart,
  TrendingUp,
  MapPin,
  HandHelping,
  Newspaper,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { nationalStats, districts } from "@/lib/data/stats";
import { formatNumber } from "@/lib/utils";

const membershipGrowth = [
  { month: "Jan", members: 85000 },
  { month: "Feb", members: 92000 },
  { month: "Mar", members: 98000 },
  { month: "Apr", members: 105000 },
  { month: "May", members: 112000 },
  { month: "Jun", members: 118000 },
  { month: "Jul", members: 125480 },
];

const districtTop = districts
  .slice()
  .sort((a, b) => b.members - a.members)
  .slice(0, 6)
  .map((d) => ({ name: d.name, members: d.members }));

const programPie = [
  { name: "Leadership", value: 25 },
  { name: "ICT", value: 20 },
  { name: "Entrepreneurship", value: 18 },
  { name: "Climate", value: 15 },
  { name: "Education", value: 12 },
  { name: "Other", value: 10 },
];

const COLORS = ["#059669", "#fcdc04", "#d90000", "#3b82f6", "#8b5cf6", "#6b7280"];

export default function AdminDashboard() {
  const kpis = [
    { label: "Total Members", value: nationalStats.members, icon: Users, change: "+8.2%", color: "text-emerald-500" },
    { label: "Active Events", value: 12, icon: Calendar, change: "+3", color: "text-blue-500" },
    { label: "Projects", value: nationalStats.projects, icon: FolderKanban, change: "+15", color: "text-purple-500" },
    { label: "Donations (UGX)", value: 45000000, icon: Heart, change: "+22%", color: "text-red-500", format: true },
    { label: "Volunteers", value: nationalStats.volunteers, icon: HandHelping, change: "+5.1%", color: "text-yellow-500" },
    { label: "News Articles", value: 48, icon: Newspaper, change: "+6", color: "text-cyan-500" },
    { label: "Districts Active", value: nationalStats.districts, icon: MapPin, change: "100%", color: "text-orange-500" },
    { label: "Growth Rate", value: 8.2, icon: TrendingUp, change: "MoM", color: "text-emerald-500", suffix: "%" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Analytics Dashboard</h1>
        <p className="text-muted-foreground mt-1">Real-time overview of the Patriotic Youths of Uganda platform.</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => (
          <motion.div
            key={kpi.label}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-2xl border border-border/50 bg-card p-5"
          >
            <div className="flex items-center justify-between mb-2">
              <kpi.icon className={`h-5 w-5 ${kpi.color}`} />
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                {kpi.change}
              </span>
            </div>
            <p className="text-2xl font-bold">
              {kpi.format
                ? formatNumber(kpi.value)
                : kpi.suffix
                ? `${kpi.value}${kpi.suffix}`
                : formatNumber(kpi.value)}
            </p>
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-border/50 bg-card p-6">
          <h2 className="font-bold mb-4">Membership Growth</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={membershipGrowth}>
                <defs>
                  <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatNumber(v)} />
                <Tooltip
                  formatter={(v) => [formatNumber(Number(v)), "Members"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }}
                />
                <Area type="monotone" dataKey="members" stroke="#059669" fill="url(#memGrad)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-6">
          <h2 className="font-bold mb-4">Top Districts by Membership</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={districtTop} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis type="number" tick={{ fontSize: 12 }} tickFormatter={(v) => formatNumber(v)} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={70} />
                <Tooltip
                  formatter={(v) => [formatNumber(Number(v)), "Members"]}
                  contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }}
                />
                <Bar dataKey="members" fill="#059669" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-6">
          <h2 className="font-bold mb-4">Program Engagement</h2>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={programPie}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  innerRadius={50}
                  paddingAngle={3}
                >
                  {programPie.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid var(--border)" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card p-6">
          <h2 className="font-bold mb-4">Recent Activity</h2>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {[
              { action: "New member registered", detail: "Amina N. from Kampala", time: "5 min ago" },
              { action: "Event registration", detail: "National Youth Summit — 12 new", time: "20 min ago" },
              { action: "Donation received", detail: "UGX 500,000 — General Fund", time: "1 hour ago" },
              { action: "News published", detail: "Scholarship applications open", time: "3 hours ago" },
              { action: "Project update", detail: "Youth Skills Hub — 72% complete", time: "5 hours ago" },
              { action: "Volunteer hours logged", detail: "48 hours across 6 districts", time: "Yesterday" },
            ].map((a) => (
              <div key={a.action + a.time} className="flex justify-between items-start text-sm border-b border-border/30 pb-2">
                <div>
                  <p className="font-medium">{a.action}</p>
                  <p className="text-xs text-muted-foreground">{a.detail}</p>
                </div>
                <span className="text-[10px] text-muted-foreground shrink-0">{a.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
