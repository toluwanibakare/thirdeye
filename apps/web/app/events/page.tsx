'use client';
import { useEffect, useMemo, useState } from 'react';
import { EventTimeline } from '@/components/EventTimeline';
import { IntegrationMap } from '@/components/IntegrationMap';
import { EmptyState } from '@/components/chrome';
import { Icon, paths } from '@/components/icons';
import {
  apiSafe,
  downloadAuditExport,
  getEventIntegrationId,
  normaliseEvent,
  normaliseIntegration,
  type AuditVerifyResult,
  type IntegrationRow,
  type SecEvent,
} from '@/lib/api';
import { isSupabaseEnvConfigured, supabaseBrowser } from '@/lib/supabaseClient';

export default function EventsPage() {
  const [events, setEvents] = useState<SecEvent[]>([]);
  const [items, setItems] = useState<IntegrationRow[]>([]);
  const [filter, setFilter] = useState('all');
  const [live, setLive] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<AuditVerifyResult | null>(null);
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    // Backend: GET /api/security-events?limit=50 → SecEvent[] dual-cased + SHA-256 hash chain
    apiSafe<SecEvent[]>('/api/security-events?limit=50', []).then(r => {
      setEvents(r.data.map(normaliseEvent));
      setLive(r.live);
    });
    apiSafe<IntegrationRow[]>('/api/integrations', []).then(r => {
      setItems(r.data.map(normaliseIntegration));
    });
    const poll = setInterval(() => {
      apiSafe<SecEvent[]>('/api/security-events?limit=50', []).then(r => {
        setEvents(r.data.map(normaliseEvent));
        setLive(r.live);
      });
      apiSafe<IntegrationRow[]>('/api/integrations', []).then(r => {
        setItems(r.data.map(normaliseIntegration));
      });
    }, 5000);
    let chan: { unsubscribe: () => void } | null = null;
    try {
      if (isSupabaseEnvConfigured()) {
        const sb = supabaseBrowser();
        chan = sb
          .channel('te-events-page')
          .on(
            'postgres_changes',
            { event: 'INSERT', schema: 'public', table: 'security_events' },
            payload => {
              setEvents(prev => [normaliseEvent(payload.new as SecEvent), ...prev].slice(0, 60));
            }
          )
          .subscribe() as unknown as { unsubscribe: () => void };
      }
    } catch {
      /* polling fallback */
    }
    return () => {
      clearInterval(poll);
      chan?.unsubscribe();
    };
  }, []);

  async function verifyChain() {
    setVerifying(true);
    try {
      // Backend: GET /api/security-events/verify → {verified, integrity, chainLength, genesisHash, latestHash}
      const res = await apiSafe<AuditVerifyResult>('/api/security-events/verify', {
        verified: false,
        integrity: 'UNVERIFIED_OFFLINE',
        chainLength: events.length,
        genesisHash: '0000000000000000000000000000000000000000000000000000000000000000',
        latestHash: events[0]?.hash ?? 'offline',
        verifiedRecordsCount: 0,
        timestamp: new Date().toISOString(),
      });
      setVerifyResult(res.data);
    } finally {
      setVerifying(false);
    }
  }

  async function doExport(format: 'csv' | 'json') {
    setExporting(format);
    setExportError(null);
    try {
      await downloadAuditExport(format, shown);
    } catch {
      setExportError('Failed to generate export file. Please try again.');
    } finally {
      setExporting(null);
    }
  }

  const ids = useMemo(
    () => ['all', ...Array.from(new Set(events.map(e => getEventIntegrationId(e))))],
    [events]
  );

  const shown = filter === 'all' ? events : events.filter(e => getEventIntegrationId(e) === filter);
  const verified = verifyResult?.verified === true;

  return (
    <div className="stagger space-y-6">
      {/* ═══ Header ═══ */}
      <div className="relative">
        <div className="page-header__bar" />
        <div className="page-header">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <div className="section-label">
                Audit trail · tamper-evident log {live ? '· live database' : '· verified'}
              </div>
              <h1 className="section-heading mt-2">Every violation, with its reason</h1>
              <p className="section-sub mt-2">
                Tamper-evident SHA-256 chain log detailing what happened, to which data, and why the engine
                responded that way.
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
              <span
                className={`chip font-semibold ${live ? '!border-[#19D98A]/30 !bg-[#19D98A]/10 !text-[#19D98A]' : '!border-[#FFC42E]/30 !bg-[#FFC42E]/10 !text-[#FFC42E]'}`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full animate-pulseDot ${live ? 'bg-[#19D98A]' : 'bg-[#FFC42E]'}`}
                />
                {live ? 'LIVE' : 'DEMO'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {exportError && (
        <div
          className="rounded-2xl border px-5 py-3.5 text-[13px]"
          style={{
            borderColor: 'rgba(255,196,46,0.35)',
            background: 'rgba(255,196,46,0.07)',
            color: '#FFC42E',
          }}
        >
          {exportError}
        </div>
      )}

      {/* Verification Card */}
      {verifyResult && (
        <div
          className="rounded-2xl border p-4 sm:p-5 transition-[border-color,background] duration-150 animate-rise"
          style={
            verified
              ? { borderColor: 'rgba(25,217,138,0.3)', background: 'rgba(25,217,138,0.06)' }
              : { borderColor: 'rgba(255,196,46,0.35)', background: 'rgba(255,196,46,0.06)' }
          }
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start sm:items-center gap-2.5 min-w-0">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white"
                style={{ background: verified ? '#19D98A' : '#FFC42E' }}
              >
                <Icon d={verified ? paths.check : paths.alert} size={16} />
              </span>
              <div className="min-w-0">
                <div className="text-[13.5px] sm:text-[14px] font-bold text-[#F5F9FF] truncate">
                  Cryptographic Audit Chain: {verifyResult.integrity}
                </div>
                <div className="text-[12px] leading-snug" style={{ color: '#8B9BB4' }}>
                  {verified
                    ? `Verified ${verifyResult.verifiedRecordsCount} records · SHA-256 hash sequence unbroken.`
                    : 'Offline — showing last known state. Reconnect to verify live chain.'}
                </div>
              </div>
            </div>
            <span
              className="font-mono text-[11px] shrink-0"
              style={{ color: verified ? '#19D98A' : '#FFC42E' }}
            >
              Latest: {verifyResult.latestHash.slice(0, 14)}…
            </span>
          </div>
        </div>
      )}

      {/* ═══ Live Integration Topology ═══ */}
      <IntegrationMap items={items} onSelect={id => setFilter(prev => (prev === id ? 'all' : id))} />

      {/* ═══ Audit actions ═══ */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          onClick={verifyChain}
          disabled={verifying}
          className="btn-ghost flex-1 sm:flex-none justify-center !px-3.5 !py-2 !text-[12.5px] font-semibold"
        >
          <Icon d={paths.check} size={15} />
          {verifying ? 'Verifying…' : 'Verify SHA-256'}
        </button>
        <button
          onClick={() => doExport('csv')}
          disabled={exporting !== null}
          className="btn-accent flex-1 sm:flex-none justify-center !px-3.5 !py-2 !text-[12.5px] font-semibold disabled:opacity-60"
        >
          <Icon d={paths.arrow} size={14} className="rotate-90" />
          {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
        </button>
        <button
          onClick={() => doExport('json')}
          disabled={exporting !== null}
          className="btn-primary flex-1 sm:flex-none justify-center !px-3.5 !py-2 !text-[12.5px] font-semibold disabled:opacity-60"
        >
          {exporting === 'json' ? 'Exporting…' : 'Export JSON'}
        </button>
      </div>

      {/* ═══ Filters ═══ */}
      <div className="pill-nav flex-nowrap sm:flex-wrap overflow-x-auto pb-1 max-w-full">
        {ids.map(id => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`pill-nav__item shrink-0 ${filter === id ? 'pill-nav__item--active' : ''}`}
          >
            {id === 'all' ? 'ALL INTEGRATIONS' : id.toUpperCase().replace('_001', '')}
          </button>
        ))}
      </div>

      {/* ═══ Timeline ═══ */}
      <div className="section-card--numbered overflow-hidden">
        <div className="relative z-10">
          {shown.length === 0 ? (
            <EmptyState
              title="No events for this filter"
              body="Traffic here is clean. Try another integration."
            />
          ) : (
            <EventTimeline events={shown} />
          )}
        </div>
      </div>
    </div>
  );
}
