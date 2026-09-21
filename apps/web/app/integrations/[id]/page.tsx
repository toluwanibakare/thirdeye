'use client';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { EventTimeline } from '@/components/EventTimeline';
import { Icon, paths } from '@/components/icons';
import { RiskBadge, RiskRing, StatusDot } from '@/components/RiskBadge';
import { useDevMode } from '@/app/shell';
import { showToast } from '@/components/NotificationToast';
import {
  apiSafe,
  getAllowedData,
  getAllowedEndpoints,
  getAllowedMethods,
  getBehaviourCurrent,
  getBehaviourDeviation,
  getBehaviourNormal,
  getExpectedRate,
  getForbiddenData,
  getHistoryVolume,
  getRiskScore,
  normaliseEvent,
  riskColor,
  type HistoryResponse,
  type IntegrationDetailResponse,
  type IntegrationRow,
  type SecEvent,
} from '@/lib/api';

export default function IntegrationDetail() {
  const params = useParams();
  const id = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const router = useRouter();
  const devMode = useDevMode();
  const [profile, setProfile] = useState<IntegrationRow | null>(null);
  const [behaviour, setBehaviour] = useState<IntegrationDetailResponse['behaviour'] | null>(null);
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [events, setEvents] = useState<SecEvent[]>([]);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);

  const load = useCallback(async () => {
    const [p, h, ev] = await Promise.all([
      apiSafe<IntegrationDetailResponse | IntegrationRow | null>(`/api/integrations/${id}`, null),
      apiSafe<HistoryResponse>(`/api/integrations/${id}/history`, {
        integrationId: id as string,
        normalRate: 100,
        currentRate: 100,
        currentRisk: 8,
        history: [],
      }),
      apiSafe<SecEvent[]>(`/api/security-events?integrationId=${id}&limit=10`, []),
    ]);
    if (p.data) {
      const prof = (p.data as { profile?: IntegrationRow }).profile ?? (p.data as IntegrationRow);
      setProfile(prof);
      const beh = (p.data as IntegrationDetailResponse).behaviour ?? null;
      setBehaviour(beh);
      const fromDetail = (p.data as { recentViolations?: SecEvent[] }).recentViolations ?? [];
      const merged = ev.data.length ? ev.data : fromDetail;
      setEvents(merged.map(normaliseEvent));
    } else {
      setProfile(null);
      setBehaviour(null);
      setEvents(ev.data.map(normaliseEvent));
    }
    if (h.live && h.data.history?.length) setHistory(h.data);
    else setHistory(null);
    setLive(p.live || ev.live || h.live);
  }, [id]);

  useEffect(() => {
    load();
    const t = setInterval(load, 6000);
    return () => clearInterval(t);
  }, [load]);

  async function act(kind: 'quarantine' | 'release') {
    setBusy(true);
    try {
      await apiSafe(
        `/api/integrations/${id}/${kind}`,
        {},
        {
          method: 'POST',
          body: JSON.stringify(
            kind === 'quarantine' ? { reason: 'Manual quarantine from trust profile' } : {}
          ),
        }
      );
      showToast(kind === 'release' ? 'Activated' : 'Deactivated', '', kind === 'release' ? 'success' : 'warn');
      await load();
    } finally {
      setBusy(false);
    }
  }

  if (!profile)
    return (
      <div
        className="section-card flex items-center justify-center py-20 text-[14px]"
        style={{ color: '#8B9BB4' }}
      >
        Loading trust profile…
      </div>
    );

  const score = getRiskScore(profile);
  const c = riskColor(score);
  const fallbackNormal = getExpectedRate(profile);
  const normal = behaviour ? getBehaviourNormal(behaviour, fallbackNormal) : fallbackNormal;
  const currentFromProfile = (profile.requestsPerMin ?? profile.currentRequestRate ?? normal) as number;
  const current = behaviour ? getBehaviourCurrent(behaviour, currentFromProfile) : currentFromProfile;
  const deviation = behaviour
    ? getBehaviourDeviation(behaviour, normal, current)
    : Number((current / Math.max(1, normal)).toFixed(1));

  const series = history?.history?.length
    ? history.history.map(p => ({ t: p.t, v: getHistoryVolume(p) }))
    : [
        { t: '-50m', v: Math.round(normal * 0.94) },
        { t: '-40m', v: Math.round(normal * 1.04) },
        { t: '-30m', v: Math.round(normal * 0.9) },
        { t: '-20m', v: Math.round(normal * 1.6) },
        { t: '-10m', v: Math.round(normal * 4.2) },
        { t: 'now', v: current },
      ];

  const allowedEp = getAllowedEndpoints(profile)[0] || '/api/v1/resource';

  return (
    <div className="stagger space-y-6">
      {/* Back button */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 font-mono text-[12.5px] font-medium transition-colors hover:text-white"
        style={{ color: '#7D8DA8' }}
      >
        <span className="rotate-180">
          <Icon d={paths.arrow} size={14} />
        </span>{' '}
        Back to registry
      </button>

      {/* ═══ Developer Mode Inspection Drawer ═══ */}
      {devMode && (
        <div className="section-card border-brand/40 bg-brand/5 p-5 animate-rise">
          <div className="flex items-center justify-between border-b border-brand/20 pb-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#5B9CFF] animate-pulseDot" />
              <span className="font-mono text-[12px] font-bold text-[#5B9CFF] uppercase">
                Developer Inspection Mode Active
              </span>
            </div>
            <span className="chip !border-brand/40 !text-brand">cURL & SDK INSPECTOR</span>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <span className="mono-num text-[10.5px] font-semibold text-[#8494AD] uppercase">
                cURL Gateway Request Test:
              </span>
              <pre className="mono-num mt-1 overflow-x-auto rounded-xl border border-white/10 bg-black/60 p-3 text-[11px] leading-relaxed text-[#00C8D7]">
                {`curl -X POST https://gateway.thirdeye.sec/api/v1/${profile.id} \\
  -H "x-thirdeye-api-key: te_live_${profile.id}_98a7b6c5" \\
  -H "Content-Type: application/json" \\
  -d '{"endpoint":"${allowedEp}","dataRequested":["event_type"]}'`}
              </pre>
            </div>
            <div>
              <span className="mono-num text-[10.5px] font-semibold text-[#8494AD] uppercase">
                StoreX @the-third-eye/sdk Init:
              </span>
              <pre className="mono-num mt-1 overflow-x-auto rounded-xl border border-white/10 bg-black/60 p-3 text-[11px] leading-relaxed text-[#19D98A]">
                {`import { ThirdEye } from '@the-third-eye/sdk';

const thirdeye = new ThirdEye({
  apiKey: 'te_live_${profile.id}_98a7b6c5',
  integrationId: '${profile.id}'
});`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Hero ═══ */}
      <div
        className="relative overflow-hidden rounded-[24px] border p-5 sm:p-6 md:p-8"
        style={{ borderColor: 'rgba(245,249,255,0.10)', background: '#0E1A33' }}
      >
        <div
          className="absolute inset-x-0 top-0 h-[3px] rounded-t-[24px]"
          style={{ background: `linear-gradient(90deg, transparent, ${c}, transparent)` }}
        />
        <div className="flex flex-col gap-5 md:flex-row md:items-start">
          <RiskRing score={score} />
          <div className="min-w-0 flex-1">
            <div className="section-label">
              {profile.id} · {live ? 'live database' : 'connected'}
            </div>
            <h1 className="section-heading mt-1.5">{profile.name}</h1>
            <p className="section-sub mt-1.5">{profile.purpose}</p>
            <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
              <StatusDot status={profile.status} />
              <RiskBadge score={score} />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
            {profile.status === 'QUARANTINED' ? (
              <button
                onClick={() => act('release')}
                disabled={busy}
                className="btn-primary w-full sm:w-auto justify-center"
              >
                <Icon d={paths.check} size={15} /> {busy ? '…' : 'Activate'}
              </button>
            ) : (
              <button
                onClick={() => act('quarantine')}
                disabled={busy}
                className="btn-danger w-full sm:w-auto justify-center"
              >
                <Icon d={paths.lock} size={15} /> {busy ? '…' : 'Deactivate'}
              </button>
            )}
            <Link href="/simulator" className="btn-ghost w-full sm:w-auto justify-center">
              <Icon d={paths.play} size={15} /> Simulate
            </Link>
          </div>
        </div>
        {profile.status === 'QUARANTINED' && (
          <div
            className="mt-5 rounded-xl border px-4 py-3.5 sm:px-5 sm:py-4"
            style={{ borderColor: 'rgba(255,77,94,0.4)', background: 'rgba(255,77,94,0.08)' }}
          >
            <div
              className="flex items-center gap-2 text-[13.5px] sm:text-[14px] font-bold"
              style={{ color: '#FF8090' }}
            >
              <Icon d={paths.alert} size={16} /> Quarantined — all future requests blocked
            </div>
            <p className="section-sub-soft mt-1.5 text-[13px] sm:text-[13.5px]">
              Attempted data access outside registered purpose
              {events[0]?.reason ? `: ${events[0].reason}` : '.'} Review the violations below, then release or
              keep isolated.
            </p>
          </div>
        )}
      </div>

      {/* ═══ Two columns ═══ */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Scope */}
        <div className="section-card">
          <div className="section-label-soft mb-5">Trust profile — declared scope</div>
          <div className="space-y-5">
            {(() => {
              const scopes = [
                { title: 'Allowed endpoints', items: getAllowedEndpoints(profile), tone: 'good' as const },
                { title: 'Allowed methods', items: getAllowedMethods(profile), tone: 'neutral' as const },
                { title: 'Allowed data', items: getAllowedData(profile), tone: 'good' as const },
                { title: 'Forbidden data', items: getForbiddenData(profile), tone: 'bad' as const },
              ];
              return scopes.map(({ title, items, tone }) => (
                <ScopeList key={title} title={title} items={items} tone={tone} />
              ));
            })()}
          </div>
        </div>

        {/* Chart + Timeline */}
        <div className="space-y-5">
          <div className="section-card">
            <div className="flex items-baseline justify-between">
              <div className="section-label-soft">
                Behaviour — normal vs current {history ? '· live' : '· baseline'}
              </div>
              <span className="mono-num text-[11.5px] sm:text-[12px] font-bold" style={{ color: c }}>
                {deviation}x deviation
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-1.5 sm:gap-2.5 text-center">
              {[
                ['Normal', `${normal}/min`, '#7D8DA8'],
                ['Current', `${current}/min`, c],
                ['Deviation', `${deviation}x`, c],
              ].map(([l, v, col]) => (
                <div
                  key={l}
                  className="rounded-xl border px-2 py-2.5 sm:px-3 sm:py-3 min-w-0"
                  style={{ borderColor: 'rgba(245,249,255,0.10)', background: 'rgba(245,249,255,0.03)' }}
                >
                  <div
                    className="font-mono text-[9px] sm:text-[9.5px] uppercase tracking-[0.12em]"
                    style={{ color: '#7D8DA8' }}
                  >
                    {l}
                  </div>
                  <div
                    className="mono-num mt-1 text-[13px] sm:text-[16px] font-bold truncate"
                    style={{ color: col as string }}
                  >
                    {v}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 h-[220px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={series} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                  <defs>
                    <linearGradient id="riskVol" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={c} stopOpacity={0.45} />
                      <stop offset="100%" stopColor={c} stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(245,249,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="t"
                    tick={{ fill: '#7D8DA8', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: '#7D8DA8', fontSize: 10 }}
                    axisLine={false}
                    tickLine={false}
                    width={44}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#0E1A33',
                      border: '1px solid rgba(245,249,255,0.14)',
                      borderRadius: 12,
                      fontSize: 12,
                      color: '#F5F9FF',
                    }}
                    labelStyle={{ color: '#8B9BB4' }}
                    formatter={(v: unknown) => [`${v}/min`, 'Volume']}
                  />
                  <ReferenceLine
                    y={normal}
                    stroke="#19D98A"
                    strokeDasharray="4 4"
                    strokeOpacity={0.6}
                    label={{ value: 'normal', fill: '#19D98A', fontSize: 10, position: 'insideTopRight' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="v"
                    stroke={c}
                    strokeWidth={2.5}
                    fill="url(#riskVol)"
                    dot={false}
                    activeDot={{ r: 4, fill: c, stroke: '#fff', strokeWidth: 1 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            {!series.length && (
              <div className="body-muted mt-2 text-center text-[12px]">
                No traffic history yet — showing baseline.
              </div>
            )}
          </div>

          <div className="section-card--numbered overflow-hidden">
            <div
              className="relative z-10 border-b px-5 py-4"
              style={{ borderColor: 'rgba(245,249,255,0.08)' }}
            >
              <div className="section-label-soft">Recent violations</div>
            </div>
            <EventTimeline events={events.slice(0, 5)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ScopeList({
  title,
  items,
  tone,
}: {
  title: string;
  items: string[];
  tone: 'good' | 'bad' | 'neutral';
}) {
  const col = tone === 'good' ? '#19D98A' : tone === 'bad' ? '#FF4D5E' : '#7D8DA8';
  const mark = tone === 'bad' ? paths.cross : paths.check;
  return (
    <div>
      <div
        className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em]"
        style={{ color: '#7D8DA8' }}
      >
        {title}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {items.length === 0 && (
          <span className="text-[12.5px]" style={{ color: '#8B9BB4' }}>
            —
          </span>
        )}
        {items.map(x => (
          <span
            key={x}
            className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px]"
            style={{
              borderColor: 'rgba(245,249,255,0.10)',
              background: 'rgba(245,249,255,0.04)',
              color: '#B8C4D8',
            }}
          >
            <span style={{ color: col }}>
              <Icon d={mark} size={12} />
            </span>
            {x}
          </span>
        ))}
      </div>
    </div>
  );
}
