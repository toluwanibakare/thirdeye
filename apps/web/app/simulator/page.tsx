'use client';
export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Icon, paths } from '@/components/icons';
import { RiskBadge } from '@/components/RiskBadge';
import {
  api,
  apiSafe,
  getSimulatorTarget,
  riskColor,
  type CheckResult,
  type IntegrationRow,
  type SimulatorPhase,
  type SimulatorStartResponse,
} from '@/lib/api';

const FALLBACK_PHASES: SimulatorPhase[] = [
  {
    phase: 1,
    name: 'Normal Operation',
    endpoint: '/analytics/events',
    method: 'GET',
    dataRequested: ['event'],
    requestCount: 95,
    expectedRisk: 5,
    expectedAction: 'ALLOW',
  },
  {
    phase: 2,
    name: 'Endpoint Probe (Reconnaissance)',
    endpoint: '/customers/profile',
    method: 'GET',
    dataRequested: ['event'],
    requestCount: 300,
    expectedRisk: 45,
    expectedAction: 'MONITOR',
  },
  {
    phase: 3,
    name: 'Sensitive Data Exfiltration Surge',
    endpoint: '/customers/payment-details',
    method: 'GET',
    dataRequested: ['payment', 'phone'],
    requestCount: 800,
    expectedRisk: 75,
    expectedAction: 'RATE_LIMIT',
  },
  {
    phase: 4,
    name: 'Full Breach Spike & Auto-Quarantine',
    endpoint: '/customers/payment-details',
    method: 'GET',
    dataRequested: ['payment', 'phone', 'address'],
    requestCount: 1780,
    expectedRisk: 95,
    expectedAction: 'BLOCK',
  },
];

const AGENT_PHASES: SimulatorPhase[] = [
  {
    phase: 1,
    name: 'Normal Agent Skill Execution',
    endpoint: '/agent/cart-checkout',
    method: 'POST',
    dataRequested: ['item_sku', 'quantity'],
    requestCount: 85,
    expectedRisk: 5,
    expectedAction: 'ALLOW',
  },
  {
    phase: 2,
    name: 'Agent Prompt Drift (System Probe)',
    endpoint: '/agent/system-prompt-probe',
    method: 'POST',
    dataRequested: ['item_sku'],
    requestCount: 280,
    expectedRisk: 45,
    expectedAction: 'MONITOR',
  },
  {
    phase: 3,
    name: 'Agent PII Exfiltration Surge',
    endpoint: '/agent/exfiltrate-customer-pii',
    method: 'POST',
    dataRequested: ['full_credit_card', 'customer_password_hash'],
    requestCount: 750,
    expectedRisk: 75,
    expectedAction: 'RATE_LIMIT',
  },
  {
    phase: 4,
    name: 'Compromised Agent Tool Flood',
    endpoint: '/agent/exfiltrate-customer-pii',
    method: 'POST',
    dataRequested: ['full_credit_card', 'customer_password_hash', 'master_api_secret'],
    requestCount: 1650,
    expectedRisk: 95,
    expectedAction: 'BLOCK',
  },
];

const STALE_KEY_PHASES: SimulatorPhase[] = [
  {
    phase: 1,
    name: '3-Year Legacy Trial Key Ping',
    endpoint: '/analytics/events',
    method: 'GET',
    dataRequested: ['anonymous_user_id'],
    requestCount: 80,
    expectedRisk: 5,
    expectedAction: 'ALLOW',
  },
  {
    phase: 2,
    name: 'Forgotten Key Probe (Resigned Dev)',
    endpoint: '/internal/legacy-v1/export',
    method: 'GET',
    dataRequested: ['event_type'],
    requestCount: 250,
    expectedRisk: 45,
    expectedAction: 'MONITOR',
  },
  {
    phase: 3,
    name: 'Unused Key Data Harvesting',
    endpoint: '/customers/address-book',
    method: 'GET',
    dataRequested: ['phone', 'address'],
    requestCount: 650,
    expectedRisk: 75,
    expectedAction: 'RATE_LIMIT',
  },
  {
    phase: 4,
    name: 'Stale Trial Breach & Auto-Quarantine',
    endpoint: '/customers/address-book',
    method: 'GET',
    dataRequested: ['phone', 'address', 'customer_password_hash'],
    requestCount: 1500,
    expectedRisk: 95,
    expectedAction: 'BLOCK',
  },
];

const SEASONAL_PHASES: SimulatorPhase[] = [
  {
    phase: 1,
    name: 'Black Friday Normal Sales Traffic',
    endpoint: '/checkout/validate',
    method: 'POST',
    dataRequested: ['item_sku', 'quantity'],
    requestCount: 200,
    expectedRisk: 5,
    expectedAction: 'ALLOW',
  },
  {
    phase: 2,
    name: 'Sales Campaign Endpoint Probe',
    endpoint: '/orders/search',
    method: 'GET',
    dataRequested: ['order_id'],
    requestCount: 500,
    expectedRisk: 45,
    expectedAction: 'MONITOR',
  },
  {
    phase: 3,
    name: 'Hiding PII Theft Inside Sales Surge',
    endpoint: '/orders/financial-records',
    method: 'GET',
    dataRequested: ['amount', 'payment_token'],
    requestCount: 1100,
    expectedRisk: 75,
    expectedAction: 'RATE_LIMIT',
  },
  {
    phase: 4,
    name: 'Mass Financial Exfiltration Flood',
    endpoint: '/orders/financial-records',
    method: 'GET',
    dataRequested: ['amount', 'payment_token', 'bank_account_secret'],
    requestCount: 2400,
    expectedRisk: 95,
    expectedAction: 'BLOCK',
  },
];

const COURIER_PHASES: SimulatorPhase[] = [
  {
    phase: 1,
    name: 'Normal Parcel Dispatch Request',
    endpoint: '/delivery/shipments',
    method: 'POST',
    dataRequested: ['order_id', 'shipping_address'],
    requestCount: 70,
    expectedRisk: 5,
    expectedAction: 'ALLOW',
  },
  {
    phase: 2,
    name: 'Logistics Partner System Probe',
    endpoint: '/customers/summary',
    method: 'GET',
    dataRequested: ['customer_name'],
    requestCount: 220,
    expectedRisk: 45,
    expectedAction: 'MONITOR',
  },
  {
    phase: 3,
    name: 'Courier API Over-Reach into Financials',
    endpoint: '/customers/payment-details',
    method: 'GET',
    dataRequested: ['card_last4', 'phone'],
    requestCount: 600,
    expectedRisk: 75,
    expectedAction: 'RATE_LIMIT',
  },
  {
    phase: 4,
    name: 'Unauthorized Financial Data Scrape',
    endpoint: '/customers/payment-details',
    method: 'GET',
    dataRequested: ['card_last4', 'phone', 'full_credit_card'],
    requestCount: 1400,
    expectedRisk: 95,
    expectedAction: 'BLOCK',
  },
];

export default function SimulatorPage() {
  const [attackType, setAttackType] = useState<
    'credential_compromise' | 'agent_drift' | 'stale_key_leak' | 'seasonal_surge_abuse' | 'courier_address_harvesting'
  >('credential_compromise');
  const [integrations, setIntegrations] = useState<IntegrationRow[]>([]);
  const [integrationId, setIntegrationId] = useState('analytics_001');
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(-1);
  const [phases, setPhases] = useState<SimulatorPhase[]>(FALLBACK_PHASES);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [liveEngine, setLiveEngine] = useState(true);
  const [log, setLog] = useState<(CheckResult & { endpoint: string; count: number; phase: string })[]>([]);
  const stopRef = useRef(false);
  const last = log[log.length - 1];
  const progress = log.length / Math.max(1, phases.length);

  useEffect(() => {
    apiSafe<IntegrationRow[]>('/api/integrations', []).then(r => {
      if (r.data.length) {
        setIntegrations(r.data);
        const exists = r.data.some(d => d.id === integrationId);
        if (!exists) setIntegrationId(r.data[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (!integrationId) return;
    apiSafe<SimulatorStartResponse>(
      '/api/simulator/start',
      { sessionId: 'sim_default', integrationId, status: 'running', phases: FALLBACK_PHASES },
      {
        method: 'POST',
        body: JSON.stringify({ integrationId }),
      }
    ).then(res => {
      if (res.data?.phases?.length) {
        setPhases(res.data.phases);
      }
    });
  }, [integrationId]);

  async function run() {
    setRunning(true);
    stopRef.current = false;
    setLog([]);
    setStep(-1);
    // Backend: POST /api/simulator/start {integrationId, attack} → {sessionId, integrationId, status, phases}
    let activePhases: SimulatorPhase[] = phases;
    try {
      const started = await api<SimulatorStartResponse>('/api/simulator/start', {
        method: 'POST',
        body: JSON.stringify({ integrationId, attack: 'credential_compromise' }),
      });
      if (started.phases?.length) {
        activePhases = started.phases;
        setPhases(started.phases);
      }
      setSessionId(started.sessionId ?? null);
      setLiveEngine(true);
      void getSimulatorTarget(started, integrationId);
    } catch {
      activePhases = phases.length ? phases : FALLBACK_PHASES;
      setPhases(activePhases);
      setSessionId(null);
      setLiveEngine(false);
    }
    for (let i = 0; i < activePhases.length; i++) {
      if (stopRef.current) break;
      setStep(i);
      const p = activePhases[i];
      await new Promise(r => setTimeout(r, 1100));
      if (stopRef.current) break;
      try {
        // Backend: POST /api/check-request {integrationId, method, endpoint, dataRequested, requestCount} → {riskScore, level, violations, action, reason}
        const res = await api<CheckResult>('/api/check-request', {
          method: 'POST',
          body: JSON.stringify({
            integrationId,
            method: p.method ?? 'GET',
            endpoint: p.endpoint,
            dataRequested: p.dataRequested,
            requestCount: p.requestCount,
          }),
        });
        setLog(prev => [
          ...prev,
          { ...res, endpoint: p.endpoint, count: p.requestCount, phase: `Phase ${p.phase} · ${p.name}` },
        ]);
      } catch {
        setLiveEngine(false);
        const fb = activePhases[i] ?? FALLBACK_PHASES[i];
        setLog(prev => [
          ...prev,
          {
            ...localScore(fb.endpoint, fb.dataRequested, fb.requestCount),
            endpoint: fb.endpoint,
            count: fb.requestCount,
            phase: `Phase ${fb.phase} · ${fb.name}`,
          },
        ]);
      }
    }
    setRunning(false);
    apiSafe<IntegrationRow[]>('/api/integrations', []).then(r => {
      if (r.data.length) setIntegrations(r.data);
    });
  }

  function stop() {
    stopRef.current = true;
    setRunning(false);
    apiSafe(
      '/api/simulator/stop',
      {},
      { method: 'POST', body: JSON.stringify(sessionId ? { sessionId } : {}) }
    ).catch(() => {});
  }

  async function reset() {
    stop();
    setStep(-1);
    setLog([]);
    setSessionId(null);
    await apiSafe('/api/simulator/reset', null, {
      method: 'POST',
      body: JSON.stringify({ integrationId }),
    });
    apiSafe<IntegrationRow[]>('/api/integrations', []).then(r => {
      if (r.data.length) setIntegrations(r.data);
    });
  }

  return (
    <div className="stagger space-y-6">
      {/* ═══ Header ═══ */}
      <div className="relative">
        <div className="page-header__bar" />
        <div className="page-header">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="section-label">
                Demo control · the 13-step story in one button {liveEngine ? '' : '· offline sim'}
              </div>
              <h1 className="section-heading mt-2">Credential compromise, live</h1>
              <p className="section-sub mt-2">
                Starts clean, drifts, then floods. Watch risk move 8 → 45 → 75 → 95 and the response graduate
                from allow to quarantine.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap sm:flex-nowrap items-center gap-2 w-full sm:w-auto">
              {!running ? (
                <button onClick={run} className="btn-accent flex-1 sm:flex-none justify-center">
                  <Icon d={paths.play} size={15} /> Start attack
                </button>
              ) : (
                <button onClick={stop} className="btn-ghost flex-1 sm:flex-none justify-center">
                  <Icon d={paths.stop} size={15} /> Stop
                </button>
              )}
              <button onClick={reset} className="btn-ghost flex-1 sm:flex-none justify-center">
                Reset
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="section-card !py-4">
        <div className="flex items-center justify-between text-[12px]">
          <span className="font-mono uppercase tracking-[0.16em]" style={{ color: '#7D8DA8' }}>
            Attack progress
          </span>
          <span
            className="mono-num font-bold"
            style={{ color: last ? riskColor(last.riskScore) : '#7D8DA8' }}
          >
            {Math.round(progress * 100)}%
          </span>
        </div>
        <div
          className="mt-2.5 h-2 overflow-hidden rounded-full"
          style={{ background: 'rgba(245,249,255,0.08)' }}
        >
          <div
            className="risk-fill h-full rounded-full"
            style={{ width: `${progress * 100}%`, background: last ? riskColor(last.riskScore) : '#1677FF' }}
          />
        </div>
      </div>

      {/* Live Integration Health Monitor (Normal vs Misbehaving) */}
      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-2xl border border-[#19D98A]/30 bg-[#19D98A]/5 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#19D98A] uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#19D98A] animate-pulse" />
              🟢 BEHAVING NORMALLY (2 INTEGRATIONS)
            </span>
            <span className="chip !text-[10px] !border-[#19D98A]/30 !bg-[#19D98A]/10 !text-[#19D98A]">RISK SCORE 5-12</span>
          </div>
          <div className="space-y-1.5 text-[12.5px] text-white">
            <div className="flex items-center justify-between rounded-xl bg-black/40 px-3 py-1.5 border border-white/5">
              <span>💳 <strong>Stripe Payments</strong> (<code className="text-[#5B9CFF]">payment_001</code>)</span>
              <span className="text-[#19D98A] font-bold text-[11px]">ACTIVE · 0 Violations</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-black/40 px-3 py-1.5 border border-white/5">
              <span>📦 <strong>ShipFast Logistics</strong> (<code className="text-[#5B9CFF]">delivery_001</code>)</span>
              <span className="text-[#19D98A] font-bold text-[11px]">ACTIVE · 0 Violations</span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-[#FF4D5E]/30 bg-[#FF4D5E]/5 p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#FF8090] uppercase tracking-wider flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#FF4D5E] animate-ping" />
              🔴 MISBEHAVING / DRIFTING (3 INTEGRATIONS)
            </span>
            <span className="chip !text-[10px] !border-[#FF4D5E]/30 !bg-[#FF4D5E]/10 !text-[#FF8090]">RISK SCORE 75-95</span>
          </div>
          <div className="space-y-1.5 text-[12.5px] text-white">
            <div className="flex items-center justify-between rounded-xl bg-black/40 px-3 py-1.5 border border-white/5">
              <span>📊 <strong>Segment Analytics</strong> (<code className="text-[#00C8D7]">analytics_001</code>)</span>
              <span className="text-[#FF8090] font-bold text-[11px]">QUARANTINED · PII Leak</span>
            </div>
            <div className="flex items-center justify-between rounded-xl bg-black/40 px-3 py-1.5 border border-white/5">
              <span><strong>StoreX Sales AI Agent Skill</strong> (<code className="text-[#00C8D7]">agent_001</code>)</span>
              <span className="text-[#FF8090] font-bold text-[11px]">QUARANTINED · Prompt Drift</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[380px_1fr]">
        {/* ═══ Controls ═══ */}
        <div className="space-y-4">
          <div className="section-card">
            <div className="space-y-4">
              <div>
                <label className="section-label-soft">Target integration</label>
                <select
                  value={integrationId}
                  onChange={e => setIntegrationId(e.target.value)}
                  className="input mt-2"
                  disabled={running}
                >
                  {integrations.map(m => (
                    <option key={m.id} value={m.id} style={{ background: '#0E1A33' }}>
                      {m.name} · {m.id} ({m.status})
                    </option>
                  ))}
                </select>
                {(() => {
                  const curr = integrations.find(i => i.id === integrationId);
                  if (!curr) return null;
                  const isQuarantined = curr.status === 'QUARANTINED';
                  return (
                    <div className="mt-2 flex items-center justify-between text-[11.5px]" style={{ color: '#7D8DA8' }}>
                      <span>
                        Status:{' '}
                        <strong style={{ color: isQuarantined ? '#FF4D5E' : '#19D98A' }}>
                          {curr.status}
                        </strong>
                        {isQuarantined ? ' (auto-resets on start)' : ''}
                      </span>
                      <span>
                        Rate:{' '}
                        <strong className="text-[#F5F9FF]">
                          {curr.expected_request_rate ?? curr.expectedRequestRate ?? 100}/min
                        </strong>
                      </span>
                    </div>
                  );
                })()}
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="section-label-soft">Attack Pattern / Scenario</label>
                  <span className="chip !text-[10px] !border-[#5B50E6]/30 !bg-[#5B50E6]/15 !text-white">4 PHASES</span>
                </div>
                <select
                  value={attackType}
                  onChange={e => {
                    const next = e.target.value as any;
                    setAttackType(next);
                    if (next === 'agent_drift') setPhases(AGENT_PHASES);
                    else if (next === 'stale_key_leak') setPhases(STALE_KEY_PHASES);
                    else if (next === 'seasonal_surge_abuse') setPhases(SEASONAL_PHASES);
                    else if (next === 'courier_address_harvesting') setPhases(COURIER_PHASES);
                    else setPhases(FALLBACK_PHASES);
                  }}
                  className="input mt-2"
                  disabled={running}
                >
                  <option value="credential_compromise" style={{ background: '#0E1A33' }}>
                    🔑 Credential Compromise & PII Exfiltration
                    Credential Compromise & PII Exfiltration
                  </option>
                  <option value="stale_key_leak" style={{ background: '#0E1A33' }}>
                    3-Year-Old Stale Trial Key Misuse (G1 Scenario)
                  </option>
                  <option value="seasonal_surge_abuse" style={{ background: '#0E1A33' }}>
                    Seasonal Sales Campaign Traffic Masking
                  </option>
                  <option value="courier_address_harvesting" style={{ background: '#0E1A33' }}>
                    Courier & Logistics Over-Reach
                  </option>
                  <option value="agent_drift" style={{ background: '#0E1A33' }}>
                    Autonomous AI Agent Skill & Tool Drift
                  </option>
                </select>
              </div>
              <div className="space-y-2 border-t pt-4" style={{ borderColor: 'rgba(245,249,255,0.08)' }}>
                {phases.map((p, i) => {
                  const label = `Phase ${p.phase} · ${p.name}`;
                  const active = i === step && running;
                  const done = log.some(l => l.phase === label);
                  return (
                    <div
                      key={label}
                      className="rounded-xl border px-4 py-2.5 text-[12.5px] transition-[border-color,background,opacity] duration-150"
                      style={
                        active
                          ? { borderColor: 'rgba(22,119,255,0.45)', background: 'rgba(22,119,255,0.10)' }
                          : done
                            ? { borderColor: 'rgba(245,249,255,0.14)', background: 'rgba(245,249,255,0.03)' }
                            : { borderColor: 'rgba(245,249,255,0.08)', opacity: 0.55 }
                      }
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-[#F5F9FF]">{label}</span>
                        {active && <span className="h-2 w-2 rounded-full bg-[#1677FF] animate-pulseDot" />}
                        {done && !active && (
                          <span style={{ color: '#19D98A' }}>
                            <Icon d={paths.check} size={13} />
                          </span>
                        )}
                      </div>
                      <div className="mono-num mt-0.5 text-[11px]" style={{ color: '#7D8DA8' }}>
                        {p.endpoint} · {p.requestCount}/min · → {p.expectedRisk}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ Results ═══ */}
        <div className="space-y-5">
          <div className="section-card relative overflow-hidden">
            <div className="section-label-soft">Live risk {liveEngine ? '' : '(offline estimate)'}</div>
            <div className="mt-2 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-5">
              <span
                className="mono-num text-[38px] sm:text-[48px] md:text-[52px] font-bold tabular-nums leading-none"
                style={{ color: last ? riskColor(last.riskScore) : '#3A4A63' }}
              >
                {last ? last.riskScore : '—'}
              </span>
              <div className="flex-1 min-w-0">
                {last ? <RiskBadge score={last.riskScore} /> : <span className="chip">AWAITING ATTACK</span>}
                <div className="section-sub-soft mt-1.5 max-w-sm">
                  {last ? last.reason : 'Press start. Phase 1 should stay green.'}
                </div>
                {last && (
                  <div className="mono-num mt-1 text-[11px]" style={{ color: '#64748B' }}>
                    level {last.level} · action {last.action}
                    {last.violations?.length ? ` · ${last.violations.length} violations` : ''}
                  </div>
                )}
              </div>
              <div
                className="h-2 w-full sm:max-w-[200px] overflow-hidden rounded-full"
                style={{ background: 'rgba(245,249,255,0.08)' }}
              >
                <div
                  className="risk-fill h-full rounded-full"
                  style={{
                    width: `${last ? last.riskScore : 0}%`,
                    background: last ? riskColor(last.riskScore) : 'transparent',
                  }}
                />
              </div>
            </div>
            {last && last.riskScore >= 81 && (
              <div
                className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border px-4 py-3"
                style={{ borderColor: 'rgba(255,77,94,0.4)', background: 'rgba(255,77,94,0.08)' }}
              >
                <span className="text-[13px] font-bold" style={{ color: '#FF8090' }}>
                  BLOCK + QUARANTINE + ALERT
                </span>
                <Link
                  href={`/integrations/${integrationId}`}
                  className="btn-danger w-full sm:w-auto justify-center !py-1.5 !text-[12px]"
                >
                  Open trust profile
                </Link>
              </div>
            )}
          </div>

          <div className="section-card--numbered overflow-hidden">
            <div
              className="relative z-10 border-b px-5 py-4"
              style={{ borderColor: 'rgba(245,249,255,0.08)' }}
            >
              <div className="section-label-soft">Request log — what the middleware saw</div>
            </div>
            {log.length === 0 ? (
              <div className="section-sub-soft px-5 py-8 text-center text-[13px]">
                No requests yet. The story starts at Phase 1.
              </div>
            ) : (
              <ul className="divide-y" style={{ borderColor: 'rgba(245,249,255,0.07)' }}>
                {log.map((l, i) => (
                  <li
                    key={i}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 sm:px-5 py-3"
                    style={{ animation: 'rise 0.18s cubic-bezier(0.23,1,0.32,1) both' }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="chip">{l.phase.split('·')[0].trim().toUpperCase()}</span>
                      <span className="font-mono text-[12px] text-[#F5F9FF]">{l.endpoint}</span>
                      <span className="mono-num text-[11px]" style={{ color: '#7D8DA8' }}>
                        {l.count}/min
                      </span>
                    </div>
                    <div className="flex items-center gap-2 sm:ml-auto">
                      <span
                        className="mono-num text-[13px] font-bold"
                        style={{ color: riskColor(l.riskScore) }}
                      >
                        {l.riskScore}
                      </span>
                      <span
                        className="rounded-md border px-1.5 py-0.5 font-mono text-[10px]"
                        style={{
                          borderColor: 'rgba(245,249,255,0.12)',
                          background: 'rgba(245,249,255,0.04)',
                          color: '#94A3B8',
                        }}
                      >
                        {l.action}
                      </span>
                    </div>
                    <p className="section-sub-soft w-full">{l.reason}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function localScore(endpoint: string, data: string[], count: number): CheckResult {
  let score = 0;
  const bad: CheckResult['violations'] = [];
  if (!endpoint.startsWith('/analytics/')) {
    score += 45;
    bad.push({ code: 'UNKNOWN_ENDPOINT', detail: `${endpoint} outside allowed scope`, points: 20 });
    bad.push({ code: 'PURPOSE_MISMATCH', detail: 'Purpose vs ' + endpoint, points: 25 });
  }
  if (data.some(d => ['payment', 'phone', 'address'].includes(d))) {
    score += 30;
    bad.push({ code: 'FORBIDDEN_DATA', detail: `Forbidden data: ${data.join(', ')}`, points: 30 });
  }
  if (count > 300) {
    score += 20;
    bad.push({ code: 'ABNORMAL_VOLUME', detail: `${count}/min vs normal 100/min`, points: 20 });
  }
  score = Math.min(100, score);
  const level = score >= 81 ? 'CRITICAL' : score >= 61 ? 'HIGH_RISK' : score >= 31 ? 'SUSPICIOUS' : 'TRUSTED';
  const action =
    level === 'CRITICAL'
      ? 'BLOCK'
      : level === 'HIGH_RISK'
        ? 'RATE_LIMIT'
        : level === 'SUSPICIOUS'
          ? 'MONITOR'
          : 'ALLOW';
  return {
    riskScore: score,
    level,
    violations: bad,
    action,
    reason: bad.length ? bad.map(b => b.detail).join('; ') : 'Matches trust profile',
  };
}
