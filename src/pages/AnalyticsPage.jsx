import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { 
  BarChart3, 
  AlertTriangle, 
  ShieldCheck, 
  Clock, 
  FilterX, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  Layers,
  Baby
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export function AnalyticsPage() {
  const { isDark } = useTheme();
  const [timeRange, setTimeRange] = useState('14d');

  // KPI Data
  const stats = [
    {
      title: 'Total Hazard Alerts',
      value: '148',
      change: '+12%',
      trend: 'up',
      subtitle: 'vs previous period',
      icon: AlertTriangle,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20'
    },
    {
      title: 'Children Protected',
      value: '34',
      change: '+8%',
      trend: 'up',
      subtitle: 'Unique tracks monitored',
      icon: Baby,
      color: 'text-cyan-500 bg-cyan-500/10 border-cyan-500/20'
    },
    {
      title: 'Avg. Response Time',
      value: '1.2s',
      change: '-0.3s',
      trend: 'down',
      subtitle: 'From trigger to alarm',
      icon: Clock,
      color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'
    },
    {
      title: 'False Alarms Filtered',
      value: '89',
      change: '62.4%',
      trend: 'up',
      subtitle: 'Via adult-nearby verification',
      icon: FilterX,
      color: 'text-indigo-500 bg-indigo-500/10 border-indigo-500/20'
    }
  ];

  // 1. Line Chart Data: Alerts Per Day
  const dailyAlertsData = [
    { day: 'Oct 22', danger: 2, warning: 6, supervised: 5 },
    { day: 'Oct 23', danger: 1, warning: 8, supervised: 7 },
    { day: 'Oct 24', danger: 4, warning: 11, supervised: 9 },
    { day: 'Oct 25', danger: 0, warning: 5, supervised: 8 },
    { day: 'Oct 26', danger: 3, warning: 9, supervised: 12 },
    { day: 'Oct 27', danger: 5, warning: 14, supervised: 10 },
    { day: 'Oct 28', danger: 2, warning: 7, supervised: 6 },
    { day: 'Oct 29', danger: 1, warning: 8, supervised: 9 },
    { day: 'Oct 30', danger: 3, warning: 12, supervised: 14 },
    { day: 'Oct 31', danger: 6, warning: 15, supervised: 11 },
    { day: 'Nov 01', danger: 2, warning: 9, supervised: 8 },
    { day: 'Nov 02', danger: 1, warning: 6, supervised: 7 },
    { day: 'Nov 03', danger: 4, warning: 13, supervised: 15 },
    { day: 'Nov 04', danger: 3, warning: 10, supervised: 12 },
  ];

  // 2. Pie Chart Data: Breakdown By Hazard Type
  const hazardTypeData = [
    { name: 'Water Cistern / Pool', value: 68, color: '#0284c7' },
    { name: 'Main Road Frontage', value: 49, color: '#ea580c' },
    { name: 'Open Storm Drain', value: 31, color: '#9333ea' },
  ];

  // 3. Bar Chart Data: Incidents By Hour Of Day
  const hourlyDistributionData = [
    { hour: '06:00', count: 1 },
    { hour: '07:00', count: 3 },
    { hour: '08:00', count: 5 },
    { hour: '09:00', count: 7 },
    { hour: '10:00', count: 11 },
    { hour: '11:00', count: 9 },
    { hour: '12:00', count: 14 },
    { hour: '13:00', count: 8 },
    { hour: '14:00', count: 12 },
    { hour: '15:00', count: 21 }, // Peak after-school play
    { hour: '16:00', count: 29 },
    { hour: '17:00', count: 26 },
    { hour: '18:00', count: 18 },
    { hour: '19:00', count: 8 },
    { hour: '20:00', count: 4 },
  ];

  const gridColor = isDark ? '#334155' : '#e2e8f0';
  const textColor = isDark ? '#94a3b8' : '#64748b';

  return (
    <div className="space-y-6">
      
      {/* Header & Date Range Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <BarChart3 className="w-6 h-6 text-cyan-500" />
            Safety Analytics & Telemetry
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Statistical breakdown of risk incidents, peak hazard hours, and adult supervision efficacy
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <button
            onClick={() => setTimeRange('7d')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              timeRange === '7d' ? 'bg-cyan-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Last 7 Days
          </button>
          <button
            onClick={() => setTimeRange('14d')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              timeRange === '14d' ? 'bg-cyan-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Last 14 Days
          </button>
          <button
            onClick={() => setTimeRange('30d')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              timeRange === '30d' ? 'bg-cyan-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Last 30 Days
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, idx) => {
          const Icon = stat.icon;
          const isUp = stat.trend === 'up';
          return (
            <div
              key={idx}
              className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {stat.title}
                </span>
                <div className={`p-2 rounded-xl border ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 dark:text-slate-100">
                    {stat.value}
                  </span>
                  <span className={`text-xs font-bold flex items-center gap-0.5 ${
                    isUp ? 'text-emerald-500' : 'text-cyan-500'
                  }`}>
                    {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    {stat.change}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  {stat.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* 1. Line Chart: Alerts Per Day (8 cols) */}
        <div className="lg:col-span-8 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Daily Hazard Incidents (Past 14 Days)
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Comparison of Critical Danger breaches vs Outer Perimeter Warnings
              </p>
            </div>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              Mean: 10.5 alerts/day
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailyAlertsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="day" stroke={textColor} fontSize={11} tickLine={false} />
                <YAxis stroke={textColor} fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#cbd5e1',
                    borderRadius: '0.75rem',
                    fontSize: '12px'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line
                  type="monotone"
                  dataKey="danger"
                  name="Danger Alerts"
                  stroke="#ef4444"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: '#ef4444' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="warning"
                  name="Perimeter Warnings"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#f59e0b' }}
                />
                <Line
                  type="monotone"
                  dataKey="supervised"
                  name="Supervised Interventions"
                  stroke="#06b6d4"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Donut/Pie Chart: Incidents by Hazard Type (4 cols) */}
        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Alerts by Hazard Type
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Proportion of breaches across hazard perimeters
            </p>
          </div>

          <div className="h-56 w-full flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={hazardTypeData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={78}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {hazardTypeData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#cbd5e1',
                    borderRadius: '0.75rem',
                    fontSize: '12px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
            {hazardTypeData.map(h => (
              <div key={h.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: h.color }} />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">{h.name}</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-slate-100">{h.value} incidents</span>
              </div>
            ))}
          </div>
        </div>

        {/* 3. Bar Chart: Incidents by Hour of Day (12 cols) */}
        <div className="lg:col-span-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Temporal Risk Curve: Incidents by Hour of Day
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Identifies peak danger timeframes (highest concentration: 15:00 - 17:00 after school hours)
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              Peak Alert Window: 3:00 PM – 5:30 PM
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyDistributionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="hour" stroke={textColor} fontSize={11} tickLine={false} />
                <YAxis stroke={textColor} fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#cbd5e1',
                    borderRadius: '0.75rem',
                    fontSize: '12px'
                  }}
                />
                <Bar
                  dataKey="count"
                  name="Hazard Events"
                  fill="#06b6d4"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

    </div>
  );
}

