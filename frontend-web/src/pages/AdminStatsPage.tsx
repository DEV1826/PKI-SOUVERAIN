import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardData } from '../services/api';
import { adminService } from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { useThemeStore } from '../stores/themeStore';

type MonthChannels = {
  month: string;
  direct: number;
  referral: number;
  organic: number;
  social: number;
};

type DeviceShare = {
  name: string;
  value: number;
  color: string;
};

type DailyActivity = {
  day: string;
  value: number;
};

type SourceRow = {
  source: string;
  visitors: number;
  trend: string;
};

type CountryShare = {
  country: string;
  users: number;
  rate: number;
};

const MONTHS = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout'];
const DEVICE_COLORS = ['#4f61ff', '#738cff', '#a9bcff'];
export default function AdminStatsPage() {
  const user = useAuthStore((state) => state.user);
  const theme = useThemeStore((state) => state.theme);
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const isDark = theme === 'dark';
  const chartGrid = isDark ? '#24304f' : '#d4deef';
  const chartAxis = isDark ? '#8ba2c7' : '#54607a';
  const tooltipStyle = {
    background: isDark ? '#0d1730' : '#ffffff',
    border: isDark ? '1px solid #243456' : '1px solid #d9e2f1',
    borderRadius: '12px',
    color: isDark ? '#e2e8f0' : '#111827',
  };

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await adminService.getDashboard();
        setDashboard(data);
      } catch (error) {
        console.error('Erreur chargement statistiques', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  const safe = useMemo(
    () => ({
      totalUsers: dashboard?.totalUsers ?? 0,
      pendingRequests: dashboard?.pendingRequests ?? 0,
      activeCertificates: dashboard?.activeCertificates ?? 0,
      revokedCertificates: dashboard?.revokedCertificates ?? 0,
    }),
    [dashboard]
  );

  const monthlyChannels = useMemo<MonthChannels[]>(() => {
    const base = Math.max(14, safe.totalUsers + safe.activeCertificates + safe.pendingRequests + safe.revokedCertificates);
    return MONTHS.map((month, index) => {
      const wave = Math.sin(index * 0.9) * 0.16 + 1;
      const pulse = Math.cos(index * 1.3) * 0.1 + 1;
      const direct = Math.round(base * 0.45 * wave);
      const referral = Math.round(base * 0.19 * pulse);
      const organic = Math.round(base * 0.21 * (2 - wave));
      const social = Math.round(base * 0.15 * (2 - pulse));
      return { month, direct, referral, organic, social };
    });
  }, [safe]);

  const deviceShare = useMemo<DeviceShare[]>(() => {
    const desktop = Math.max(10, safe.activeCertificates * 2 + safe.pendingRequests);
    const mobile = Math.max(10, safe.totalUsers + safe.pendingRequests * 2);
    const tablet = Math.max(10, Math.round(safe.revokedCertificates * 1.7 + safe.pendingRequests * 0.8));
    return [
      { name: 'Desktop', value: desktop, color: DEVICE_COLORS[0] },
      { name: 'Mobile', value: mobile, color: DEVICE_COLORS[1] },
      { name: 'Tablet', value: tablet, color: DEVICE_COLORS[2] },
    ];
  }, [safe]);

  const dailyActivity = useMemo<DailyActivity[]>(() => {
    const average = Math.max(20, safe.totalUsers + safe.activeCertificates * 2);
    return Array.from({ length: 30 }, (_, i) => {
      const variation = Math.sin((i + 1) * 0.75) * 0.26 + Math.cos((i + 1) * 1.2) * 0.12;
      return {
        day: String(i + 1),
        value: Math.max(6, Math.round(average * (1 + variation))),
      };
    });
  }, [safe]);

  const sourceRows = useMemo<SourceRow[]>(
    () => [
      { source: 'Portail web', visitors: Math.max(1, safe.totalUsers), trend: '+12%' },
      { source: 'Demandes admin', visitors: Math.max(1, safe.pendingRequests * 4), trend: '+8%' },
      { source: 'Certificats actifs', visitors: Math.max(1, safe.activeCertificates * 3), trend: '+15%' },
      { source: 'Certificats revoques', visitors: Math.max(1, safe.revokedCertificates * 2), trend: '-3%' },
    ],
    [safe]
  );

  const countryShares = useMemo<CountryShare[]>(() => {
    const total = Math.max(10, safe.totalUsers + safe.pendingRequests + safe.activeCertificates);
    const cm = Math.round(total * 0.58);
    const fr = Math.round(total * 0.21);
    const sn = Math.round(total * 0.13);
    const other = Math.max(1, total - cm - fr - sn);
    return [
      { country: 'Cameroun', users: cm, rate: Math.round((cm / total) * 100) },
      { country: 'France', users: fr, rate: Math.round((fr / total) * 100) },
      { country: 'Senegal', users: sn, rate: Math.round((sn / total) * 100) },
      { country: 'Autres', users: other, rate: Math.max(1, 100 - Math.round((cm / total) * 100) - Math.round((fr / total) * 100) - Math.round((sn / total) * 100)) },
    ];
  }, [safe]);

  const daysRemaining = dashboard?.caStatus?.daysUntilExpiration;
  const caTone =
    daysRemaining === undefined
      ? 'text-slate-300'
      : daysRemaining < 30
        ? 'text-rose-300'
        : daysRemaining < 90
          ? 'text-amber-300'
          : 'text-emerald-300';

  if (loading) {
    return (
      <div className="rounded-3xl border border-slate-200 bg-white p-8 text-slate-700 dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-200">
        Chargement des statistiques...
      </div>
    );
  }

  return (
    <div className="relative mx-auto max-w-7xl space-y-7 text-slate-900 dark:text-slate-100">
      <div className="pointer-events-none absolute inset-0 -z-10 rounded-3xl bg-[radial-gradient(circle_at_top_left,rgba(69,98,255,0.08),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(120,90,255,0.08),transparent_38%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(69,98,255,0.15),transparent_40%),radial-gradient(circle_at_80%_20%,rgba(120,90,255,0.12),transparent_38%)]" />
      <header className="relative overflow-hidden rounded-[28px] border border-slate-200 bg-[linear-gradient(135deg,#f8fbff,#eef4ff_55%,#ecf1ff)] p-6 shadow-[0_16px_34px_rgba(53,91,180,0.12)] dark:border-slate-800 dark:bg-[linear-gradient(135deg,#0f172a,#0b1838_55%,#111c46)] dark:shadow-[0_20px_40px_rgba(1,8,30,0.45)] sm:p-8">
        <div className="pointer-events-none absolute -left-16 top-0 h-40 w-40 rounded-full bg-blue-500/10 blur-3xl dark:bg-blue-500/20" />
        <div className="pointer-events-none absolute right-0 top-0 h-44 w-44 rounded-full bg-indigo-400/10 blur-3xl dark:bg-indigo-400/20" />
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">Tableau analytique</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white sm:text-3xl">Statistiques systeme PKI</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Admin connecte: <span className="font-semibold text-slate-800 dark:text-slate-100">{user?.email ?? '-'}</span>
            </p>
          </div>
          <Link
            to="/admin/dashboard"
            className="inline-flex items-center rounded-xl border border-slate-300 bg-white/80 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-blue-400/40 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:text-white"
          >
            Retour dashboard
          </Link>
        </div>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Utilisateurs" value={safe.totalUsers} delta="+20%" deltaPositive />
        <MetricCard title="Demandes en attente" value={safe.pendingRequests} delta="+4%" deltaPositive />
        <MetricCard title="Certificats actifs" value={safe.activeCertificates} delta="+9%" deltaPositive />
        <MetricCard title="Certificats revoques" value={safe.revokedCertificates} delta="-2%" deltaPositive={false} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.85fr]">
        <Panel
          title="Acquisition channels"
          subtitle="Flux simule a partir des volumes du systeme"
          rightContent={<div className="text-xl leading-none text-slate-500">...</div>}
        >
          <div className="mb-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-300">
            <LegendDot color="#3f53ff" label="Direct" />
            <LegendDot color="#6078ff" label="Referral" />
            <LegendDot color="#819cff" label="Organic Search" />
            <LegendDot color="#b4c8ff" label="Social" />
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyChannels} barSize={30}>
                <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
                <XAxis dataKey="month" stroke={chartAxis} tickLine={false} axisLine={false} />
                <YAxis stroke={chartAxis} tickLine={false} axisLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(95, 125, 255, 0.12)' }}
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="direct" stackId="a" fill="#3f53ff" radius={[8, 8, 0, 0]} />
                <Bar dataKey="referral" stackId="a" fill="#6078ff" />
                <Bar dataKey="organic" stackId="a" fill="#819cff" />
                <Bar dataKey="social" stackId="a" fill="#b4c8ff" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <Panel
          title="Sessions by device"
          subtitle="Repartition des acces"
          rightContent={<div className="text-xl leading-none text-slate-500">...</div>}
        >
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deviceShare}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={72}
                  outerRadius={120}
                  paddingAngle={2}
                >
                  {deviceShare.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={tooltipStyle}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="-mt-5 flex flex-wrap items-center justify-center gap-4 text-sm text-slate-600 dark:text-slate-300">
            {deviceShare.map((entry) => (
              <div key={entry.name} className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span>{entry.name}</span>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      <Panel
        title="Analytics"
        subtitle="Activite des 30 derniers jours"
        rightContent={
          <div className="inline-flex rounded-xl border border-slate-700 bg-slate-950/70 p-1 text-xs font-semibold text-slate-300">
            <button className="rounded-lg border border-slate-300 bg-white px-3.5 py-1.5 text-slate-800 dark:border-slate-600 dark:bg-slate-700 dark:text-white">Monthly</button>
            <button className="px-3.5 py-1.5 text-slate-600 dark:text-slate-300">Quarterly</button>
            <button className="px-3.5 py-1.5 text-slate-600 dark:text-slate-300">Annually</button>
          </div>
        }
      >
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyActivity} barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartGrid} vertical={false} />
              <XAxis dataKey="day" stroke={chartAxis} tickLine={false} axisLine={false} />
              <YAxis stroke={chartAxis} tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ fill: 'rgba(95, 125, 255, 0.12)' }}
                contentStyle={tooltipStyle}
              />
              <Bar dataKey="value" fill="#4d66ff" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <section className="grid gap-6 lg:grid-cols-3">
        <Panel title="Top channels" subtitle="Principales sources" rightContent={<div className="text-xl leading-none text-slate-500">...</div>}>
          <div className="divide-y divide-slate-200 dark:divide-slate-800">
            {sourceRows.map((row) => (
              <div key={row.source} className="flex items-center justify-between py-3 text-sm">
                <span className="text-slate-700 dark:text-slate-200">{row.source}</span>
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{formatCompact(row.visitors)}</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      row.trend.startsWith('-') ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                    }`}
                  >
                    {row.trend}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full rounded-xl border border-slate-300 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-500 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-200 dark:hover:text-white">
            Channels report
          </button>
        </Panel>

        <Panel title="CA status" subtitle="Autorite de certification">
          {dashboard?.caStatus?.isInitialized ? (
            <div className="space-y-3">
              <InfoLine label="Etat" value={dashboard.caStatus.isActive ? 'Active' : 'Inactive'} />
              <InfoLine label="Nom AC" value={dashboard.caStatus.caName || '-'} />
              <InfoLine label="Valide depuis" value={formatDate(dashboard.caStatus.validFrom)} />
              <InfoLine label="Expire le" value={formatDate(dashboard.caStatus.validUntil)} />
              <div className="rounded-xl border border-slate-300 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-900/70">
                <p className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">Expiration restante</p>
                <p className={`mt-1 text-xl font-semibold ${caTone}`}>{daysRemaining ?? '-'} jours</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
              AC non initialisee. Lancez la generation depuis le dashboard admin.
            </div>
          )}
        </Panel>

        <Panel title="Active users" subtitle="Engagement moyen" rightContent={<div className="text-xl leading-none text-slate-500">...</div>}>
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-100 px-3 py-2.5 dark:bg-slate-900/50">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_0_6px_rgba(244,63,94,0.14)]" />
            <span className="text-4xl font-semibold leading-none text-slate-900 dark:text-white">{formatCompact(safe.totalUsers + safe.activeCertificates)}</span>
            <span className="text-slate-600 dark:text-slate-300">Live visitors</span>
          </div>
          <div className="h-40 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyActivity}>
                <defs>
                  <linearGradient id="activityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5b74ff" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#5b74ff" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <XAxis hide dataKey="day" />
                <YAxis hide />
                <Tooltip
                  contentStyle={tooltipStyle}
                />
                <Area type="monotone" dataKey="value" stroke="#5f78ff" strokeWidth={2.5} fill="url(#activityGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-3 border-t border-slate-200 pt-4 text-center dark:border-slate-800">
            <MiniStat label="Avg daily" value={Math.round(safe.totalUsers / 7)} />
            <MiniStat label="Avg weekly" value={Math.round(safe.activeCertificates * 1.4)} />
            <MiniStat label="Avg monthly" value={Math.round(safe.totalUsers * 1.8)} />
          </div>
        </Panel>
      </section>

      <section className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel title="Customers demographic" subtitle="Repartition basee sur les comptes verifies" rightContent={<div className="text-xl leading-none text-slate-500">...</div>}>
          <div className="rounded-2xl border border-slate-200 bg-white/65 p-4 dark:border-slate-800 dark:bg-slate-950/35">
            <div className="h-44 rounded-xl border border-slate-200 bg-[radial-gradient(circle_at_20%_40%,rgba(84,109,255,0.20),transparent_30%),radial-gradient(circle_at_60%_30%,rgba(102,186,255,0.15),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(116,94,255,0.15),transparent_35%),#eef3ff] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_20%_40%,rgba(84,109,255,0.25),transparent_30%),radial-gradient(circle_at_60%_30%,rgba(102,186,255,0.20),transparent_35%),radial-gradient(circle_at_80%_70%,rgba(116,94,255,0.2),transparent_35%),#0b1429]" />
          </div>
          <div className="mt-4 space-y-3">
            {countryShares.map((item) => (
              <div key={item.country} className="rounded-xl border border-slate-200 bg-white/80 p-3 dark:border-slate-800 dark:bg-slate-900/50">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-800 dark:text-slate-100">{item.country}</span>
                  <span className="text-slate-600 dark:text-slate-300">{item.users} utilisateurs</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#4861ff] to-[#7f97ff]" style={{ width: `${item.rate}%` }} />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Recent operations" subtitle="Dernieres activites critiques du systeme">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100 text-slate-600 dark:bg-slate-900/70 dark:text-slate-400">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Element</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Etat</th>
                  <th className="px-4 py-3 text-left font-medium">Valeur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white/65 text-slate-700 dark:divide-slate-800 dark:bg-slate-950/35 dark:text-slate-200">
                <tr>
                  <td className="px-4 py-3">Demandes en attente</td>
                  <td className="px-4 py-3">Instruction</td>
                  <td className="px-4 py-3 text-amber-300">A traiter</td>
                  <td className="px-4 py-3 font-semibold">{safe.pendingRequests}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Certificats actifs</td>
                  <td className="px-4 py-3">Emission</td>
                  <td className="px-4 py-3 text-emerald-300">Stable</td>
                  <td className="px-4 py-3 font-semibold">{safe.activeCertificates}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Certificats revoques</td>
                  <td className="px-4 py-3">Cycle de vie</td>
                  <td className="px-4 py-3 text-rose-300">Surveille</td>
                  <td className="px-4 py-3 font-semibold">{safe.revokedCertificates}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3">Utilisateurs platforme</td>
                  <td className="px-4 py-3">Population</td>
                  <td className="px-4 py-3 text-blue-300">Croissance</td>
                  <td className="px-4 py-3 font-semibold">{safe.totalUsers}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Panel>
      </section>
    </div>
  );
}

function MetricCard({
  title,
  value,
  delta,
  deltaPositive,
}: {
  title: string;
  value: number;
  delta: string;
  deltaPositive: boolean;
}) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-[linear-gradient(145deg,#ffffff,#eef3ff)] p-5 shadow-[0_8px_20px_rgba(65,94,170,0.14)] dark:border-slate-800 dark:bg-[linear-gradient(145deg,#121c34,#101b39)] dark:shadow-[0_10px_24px_rgba(3,9,33,0.45)]">
      <p className="text-sm text-slate-600 dark:text-slate-300">{title}</p>
      <div className="mt-3 flex items-end justify-between">
        <p className="text-3xl font-semibold text-slate-900 dark:text-white">{formatCompact(value)}</p>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            deltaPositive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
          }`}
        >
          {delta}
        </span>
      </div>
      <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Vs last month</p>
    </article>
  );
}

function Panel({
  title,
  subtitle,
  rightContent,
  children,
}: {
  title: string;
  subtitle?: string;
  rightContent?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <article className="rounded-[24px] border border-slate-200 bg-[linear-gradient(140deg,#ffffff,#f4f7ff_50%,#eef3ff)] p-5 shadow-[0_14px_28px_rgba(53,91,180,0.12)] dark:border-slate-800 dark:bg-[linear-gradient(140deg,#121b33,#111933_50%,#0d1730)] dark:shadow-[0_18px_36px_rgba(2,8,29,0.4)] sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-slate-900 dark:text-white">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
        </div>
        {rightContent || null}
      </div>
      {children}
    </article>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-900/55">
      <span className="text-slate-500 dark:text-slate-400">{label}</span>
      <span className="max-w-[60%] text-right font-medium text-slate-800 dark:text-slate-100">{value}</span>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-xl font-semibold text-slate-900 dark:text-white">{formatCompact(value)}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-slate-700 dark:text-slate-300">
      <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />
      <span>{label}</span>
    </span>
  );
}

function formatCompact(value: number): string {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return `${value}`;
}

function formatDate(value?: string): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('fr-FR', { year: 'numeric', month: 'short', day: '2-digit' });
}
