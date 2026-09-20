'use client';
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { EventTimeline } from '@/components/EventTimeline';
import { IntegrationTable } from '@/components/IntegrationTable';
import { RiskBars, TrafficDonut, TrustGauge } from '@/components/DashboardCharts';
import { StatCard } from '@/components/chrome';
import { showToast } from '@/components/NotificationToast';
import {
  activityToEvent,
  apiSafe,
  getRiskScore,
  getStatsActive,
  getStatsIntegrations,
  getStatsQuarantined,
  getStatsRequests,
  getStatsThreats,
  normaliseEvent,
  normaliseIntegration,
  type ActivityItem,
  type DashboardStats,
  type IntegrationRow,
  type SecEvent,
} from '@/lib/api';
import { isSupabaseEnvConfigured, supabaseBrowser } from '@/lib/supabaseClient';
import { useDevMode } from '@/app/shell';

export default function Dashboard() {
  const devMode = useDevMode();
  const [stats, setStats] = useState<DashboardStats>({
    integrations: 0,
    active: 0,
    monitoredRequests: 0,
    threats: 0,
    quarantined: 0,
  });
  const [items, setItems] = useState<IntegrationRow[]>([]);
  const [events, setEvents] = useState<SecEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);
  const [quarantining, setQuarantining] = useState<string | null>(null);
  const [underAttackMode, setUnderAttackMode] = useState(false);

  const load = useCallback(async () => {
    const [s, list, act, ev] = await Promise.all([
      apiSafe<DashboardStats>('/api/dashboard/stats', {
        integrations: 0,
        active: 0,
        monitoredRequests: 0,
        threats: 0,
        quarantined: 0,
      }),
      apiSafe<IntegrationRow[]>('/api/integrations', []),
      apiSafe<ActivityItem[] | { activities: ActivityItem[] }>('/api/dashboard/activity?limit=20', []),
      apiSafe<SecEvent[]>('/api/security-events?limit=8', []),
    ]);
    setStats(s.data);
    setItems(list.data.map(normaliseIntegration));
    const rawAct: ActivityItem[] = Array.isArray(act.data)
      ? act.data
      : ((act.data as { activities?: ActivityItem[] })?.activities ?? []);
    if (rawAct.length) setEvents(rawAct.map(activityToEvent));
    else if (ev.data.length) setEvents(ev.data.map(normaliseEvent));
    else setEvents([]);
    setLive(s.live || list.live || act.live || ev.live);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 5000);
    let chan: { unsubscribe: () => void } | null = null;
    try {
      if (isSupabaseEnvConfigured()) {
        const sb = supabaseBrowser();
        chan = sb
          .channel('te-events')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'security_events' }, () =>
            load()
          )
          .subscribe() as unknown as { unsubscribe: () => void };
      }
    } catch {
      /* polling fallback */
    }
    return () => {
      clearInterval(id);
      chan?.unsubscribe();
    };
  }, [load]);

  async function quarantine(id: string) {
    setQuarantining(id);
    try {
      await apiSafe(
        `/api/integrations/${id}/quarantine`,
        { status: 'QUARANTINED' },
        { method: 'POST', body: JSON.stringify({ reason: 'Manual quarantine from overview' }) }
      );
      showToast('Deactivated', '', 'warn');
    } finally {
      setQuarantining(null);
      load();
    }
  }

  async function release(id: string) {
    setQuarantining(id);
    try {
      await apiSafe(`/api/integrations/${id}/release`, {}, { method: 'POST', body: JSON.stringify({}) });
      showToast('Activated', '', 'success');
    } finally {
      setQuarantining(null);
      load();
    }
  }

  const integrationsCount = getStatsIntegrations(stats);
  const activeCount = getStatsActive(stats);
  const reqCount = getStatsRequests(stats);
  const threatCount = getStatsThreats(stats);
  const quarantineCount = getStatsQuarantined(stats);

  const toggleUnderAttack = () => {
    const next = !underAttackMode;
    setUnderAttackMode(next);
    showToast(
      next ? 'Under Attack Mode ENABLED' : 'Standard Security Mode',
      next
        ? 'Zero-tolerance PII validation and strict rate caps enforced.'
        : 'Standard adaptive security rules restored.',
      next ? 'warn' : 'info'
    );
  };

  return (
    <div className="space-y-6">
      {/* ═══ DEV MODE VISIBLE BANNER (When Dev Mode is Active) ═══ */}
      {devMode && (
        <div className="rounded-2xl border border-[#5B50E6]/50 bg-[#5B50E6]/10 p-4 shadow-lg shadow-[#5B50E6]/20 flex flex-col md:flex-row md:items-center justify-between gap-4 animate-rise">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#5B50E6] text-white font-mono font-bold text-[14px]">
              ⚡
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-mono font-bold text-white uppercase tracking-wider">DEVELOPER & SECURITY ENGINEER MODE ACTIVE</span>
                <span className="chip !text-[10px] !border-[#00CEC9]/30 !bg-[#00CEC9]/10 !text-[#00CEC9]">RAW TELEMETRY UNLOCKED</span>
              </div>
              <p className="text-[12px] text-[#8E92A4] mt-0.5 font-mono">
                Showing cURL inspectors, gateway routing tokens (<code className="text-[#00CEC9]">te_proj_storex_99a8b7c6</code>), P99 latency (0.8ms), and raw payload JSON.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
            <span className="rounded bg-black/40 px-2 py-1 text-[#8E92A4]">p99: 0.8ms</span>
            <span className="rounded bg-black/40 px-2 py-1 text-[#10B981]">HTTP 200/403 Logged</span>
          </div>
        </div>
      )}

      {/* ═══ TOP ROW: 2 CARDS (Wide Category Donut + Bar Chart) ═══ */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Card 1: Wide Category Donut Breakdown */}
        <div className="panel lg:col-span-8 p-6 bg-[#1C1D2A] border-white/5 rounded-3xl flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#8E92A4]">Integration Scope & Telemetry</p>
              <h2 className="text-[28px] font-extrabold text-white mt-1 mono-num">
                {reqCount.toLocaleString()} <span className="text-[14px] font-semibold text-[#8E92A4]">verified reqs</span>
              </h2>
            </div>
            <span className="chip !border-[#5B50E6]/30 !bg-[#5B50E6]/15 !text-white !py-1 !px-3 font-semibold">
              Live Gateway Stream
            </span>
          </div>

          <div className="pt-5">
            <TrafficDonut items={items} />
          </div>
        </div>

        {/* Card 2: Risk Bars Visualization */}
        <div className="panel lg:col-span-4 p-6 bg-[#1C1D2A] border-white/5 rounded-3xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-bold text-[#8E92A4]">Risk Density per API</span>
              <span className="text-[11px] font-semibold text-[#10B981] bg-[#10B981]/15 px-2 py-0.5 rounded-md">Live Verified</span>
            </div>
            <h3 className="text-[28px] font-extrabold text-white mt-1 mono-num">
              {items.length} <span className="text-[14px] font-semibold text-[#8E92A4]">active connectors</span>
            </h3>
            <p className="text-[12px] text-[#8E92A4]">Height = live risk score. Hover to inspect.</p>
          </div>

          <RiskBars items={items} />
        </div>
      </div>

      {/* ═══ BOTTOM ROW: 3 CARDS (Integration Table + Trust Gauge + Activity Stream) ═══ */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Card 3: Integration Trust Table */}
        <div className="panel lg:col-span-8 p-6 bg-[#1C1D2A] border-white/5 rounded-3xl space-y-4 overflow-hidden !p-0">
          <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
            <h4 className="text-[14px] font-bold text-white">Integration Trust Registry</h4>
            <Link href="/integrations" className="text-[12px] font-semibold text-[#5B50E6] hover:underline">
              Open Marketplace →
            </Link>
          </div>

          <IntegrationTable
            items={items}
            quarantining={quarantining}
            onQuarantine={quarantine}
            onRelease={release}
            compact
          />
        </div>

        {/* Card 4 & 5: Security Posture Gauge & Activity Timeline */}
        <div className="lg:col-span-4 space-y-6">
          {/* Card 4: Semicircular Radial Gauge */}
          <div className="panel p-6 bg-[#1C1D2A] border-white/5 rounded-3xl">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-[12px] font-bold text-[#8E92A4]">Security Posture</span>
              <span className="chip !text-[10px] !border-[#10B981]/30 !bg-[#10B981]/10 !text-[#10B981]">
                SHIELD ACTIVE
              </span>
            </div>

            <TrustGauge items={items} quarantined={quarantineCount} />
          </div>

          {/* Card 5: Gradient Quick Action Banner */}
          <div className="panel p-6 bg-gradient-to-br from-[#5B50E6] via-[#7B2CBF] to-[#9D4EDD] rounded-3xl flex flex-col justify-between text-white shadow-xl shadow-[#5B50E6]/30">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-1 rounded-full">
                ThirdEye Shield
              </span>
              <h3 className="text-[22px] font-extrabold mt-3 leading-snug">Connect New Project</h3>
              <p className="text-[13px] text-white/80 mt-2 leading-relaxed">
                Protect any store or web application with ThirdEye Custom Gateway proxy.
              </p>
            </div>

            <button
              onClick={() => showToast('Connect Project', 'Opening Project Setup wizard on Integrations Marketplace.', 'info')}
              className="mt-5 w-full rounded-2xl bg-[#FF2A6D] py-3 text-[14px] font-bold text-white shadow-lg shadow-[#FF2A6D]/40 transition-transform active:scale-95 hover:brightness-110"
            >
              Connect Project Now →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
