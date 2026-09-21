/**
 * Resolves the ThirdEye API base URL dynamically:
 * - On non-localhost environments (e.g. deployed on Vercel or custom domain),
 *   it defaults to '' (relative path), hitting the Next.js serverless route handlers
 *   on the same origin directly, avoiding any CORS or unreachable localhost issues.
 * - If NEXT_PUBLIC_API_URL is explicitly configured to an external origin, it is honored.
 * - On local development (localhost), it falls back to NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'.
 */
export function getApiUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (typeof window !== 'undefined') {
    const isLocal =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('192.168.') ||
      window.location.hostname.startsWith('10.');

    if (!isLocal) {
      if (envUrl && !envUrl.includes('localhost') && !envUrl.includes('127.0.0.1')) {
        return envUrl.replace(/\/+$/, '');
      }
      return '';
    }

    return envUrl ? envUrl.replace(/\/+$/, '') : 'http://localhost:4000';
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return envUrl ? envUrl.replace(/\/+$/, '') : 'http://localhost:4000';
}

export const API_URL = getApiUrl();

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getApiUrl();
  const url = `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`API ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiSafe<T>(
  path: string,
  fallback: T,
  init?: RequestInit
): Promise<{ data: T; live: boolean }> {
  try {
    const data = await api<T>(path, init);
    return { data, live: true };
  } catch {
    return { data: fallback, live: false };
  }
}

export type RiskLevel = 'TRUSTED' | 'SUSPICIOUS' | 'HIGH_RISK' | 'CRITICAL';
export type Action = 'ALLOW' | 'MONITOR' | 'RATE_LIMIT' | 'BLOCK' | 'QUARANTINE';
export type IntegrationStatus = 'ACTIVE' | 'MONITORED' | 'RATE_LIMITED' | 'QUARANTINED';
export type ContextEvent = 'none' | 'black_friday' | 'campaign_launch' | 'known_spike';

export interface IntegrationRow {
  id: string;
  name: string;
  purpose: string;
  status: string;
  risk_score?: number;
  riskScore?: number;
  expected_request_rate?: number;
  expectedRequestRate?: number;
  currentRequestRate?: number;
  requestsPerMin?: number;
  allowed_endpoints?: string[];
  allowedEndpoints?: string[];
  allowed_methods?: string[];
  allowedMethods?: string[];
  allowed_data?: string[];
  allowedData?: string[];
  forbidden_data?: string[];
  forbiddenData?: string[];
  updated_at?: string;
  updatedAt?: string;
  created_at?: string;
  createdAt?: string;
  lastActivity?: string;
}

export function getRiskScore(it: IntegrationRow): number {
  return it.risk_score ?? it.riskScore ?? 0;
}

export function getExpectedRate(it: IntegrationRow): number {
  return it.expected_request_rate ?? it.expectedRequestRate ?? 100;
}

export function getCurrentRate(it: IntegrationRow): number {
  return it.currentRequestRate ?? it.requestsPerMin ?? getExpectedRate(it);
}

export function getAllowedEndpoints(it: IntegrationRow): string[] {
  return it.allowed_endpoints ?? it.allowedEndpoints ?? [];
}

export function getAllowedMethods(it: IntegrationRow): string[] {
  return it.allowed_methods ?? it.allowedMethods ?? [];
}

export function getAllowedData(it: IntegrationRow): string[] {
  return it.allowed_data ?? it.allowedData ?? [];
}

export function getForbiddenData(it: IntegrationRow): string[] {
  return it.forbidden_data ?? it.forbiddenData ?? [];
}

export function getUpdatedAt(it: IntegrationRow): string {
  return it.updated_at ?? it.updatedAt ?? it.created_at ?? it.createdAt ?? new Date().toISOString();
}

/** Backend returns dual-cased formatted rows — normalise to one shape for UI. */
export function normaliseIntegration(r: IntegrationRow): IntegrationRow {
  const expected = getExpectedRate(r);
  return {
    ...r,
    requestsPerMin: r.requestsPerMin ?? r.currentRequestRate ?? expected,
    lastActivity: r.lastActivity ?? r.updated_at ?? r.updatedAt ?? r.created_at ?? 'just now',
  };
}

export interface DashboardStats {
  integrations?: number;
  totalIntegrations?: number;
  active?: number;
  activeIntegrations?: number;
  monitoredRequests?: number;
  totalRequestsToday?: number;
  totalThreats?: number;
  threats?: number;
  totalViolationsToday?: number;
  quarantined?: number;
  quarantinedIntegrations?: number;
  averageRiskScore?: number;
}

export function getStatsIntegrations(s: DashboardStats): number {
  return s.integrations ?? s.totalIntegrations ?? 0;
}
export function getStatsActive(s: DashboardStats): number {
  return s.active ?? s.activeIntegrations ?? 0;
}
export function getStatsRequests(s: DashboardStats): number {
  return s.monitoredRequests ?? s.totalRequestsToday ?? 0;
}
export function getStatsThreats(s: DashboardStats): number {
  return s.threats ?? s.totalThreats ?? s.totalViolationsToday ?? 0;
}
export function getStatsQuarantined(s: DashboardStats): number {
  return s.quarantined ?? s.quarantinedIntegrations ?? 0;
}

/** GET /api/dashboard/activity returns a bare array (not {activities:[]}). */
export interface ActivityItem {
  id: string;
  type?: string;
  integrationId: string;
  integrationName?: string;
  endpoint?: string;
  action: string;
  riskScore?: number;
  risk_score?: number;
  reason?: string;
  timestamp?: string;
  created_at?: string;
}

export interface SecEvent {
  id: string;
  integration_id?: string;
  integrationId?: string;
  event_type?: string;
  eventType?: string;
  endpoint?: string;
  risk_score?: number;
  riskScore?: number;
  action: string;
  reason: string;
  prev_hash?: string;
  prevHash?: string;
  hash?: string;
  created_at?: string;
  createdAt?: string;
}

export function getEventIntegrationId(e: SecEvent | ActivityItem): string {
  const v =
    (e as SecEvent).integration_id ??
    (e as SecEvent).integrationId ??
    (e as ActivityItem).integrationId ??
    'unknown';
  return v;
}

export function getEventRiskScore(e: SecEvent | ActivityItem): number {
  return (
    (e as SecEvent).risk_score ??
    (e as SecEvent).riskScore ??
    (e as ActivityItem).riskScore ??
    (e as ActivityItem).risk_score ??
    0
  );
}

export function getEventCreatedAt(e: SecEvent | ActivityItem): string {
  return (
    (e as SecEvent).created_at ??
    (e as SecEvent).createdAt ??
    (e as ActivityItem).timestamp ??
    (e as ActivityItem).created_at ??
    new Date().toISOString()
  );
}

export function getEventType(e: SecEvent): string {
  return e.event_type ?? e.eventType ?? 'VIOLATION';
}

/** Detail recentViolations come back camelCase-only — accept either casing. */
export function normaliseEvent(e: SecEvent): SecEvent {
  const integrationId = getEventIntegrationId(e);
  const riskScore = getEventRiskScore(e);
  const createdAt = getEventCreatedAt(e);
  const eventType = getEventType(e);
  return {
    ...e,
    id: e.id,
    integration_id: integrationId,
    integrationId,
    event_type: eventType,
    eventType,
    risk_score: riskScore,
    riskScore,
    created_at: createdAt,
    createdAt,
  };
}

/** Map dashboard activity rows into timeline-ready events. */
export function activityToEvent(a: ActivityItem): SecEvent {
  const riskScore = a.riskScore ?? a.risk_score ?? 0;
  const createdAt = a.timestamp ?? a.created_at ?? new Date().toISOString();
  const type =
    a.type === 'NORMAL'
      ? 'NORMAL'
      : a.type === 'QUARANTINE'
        ? 'QUARANTINED'
        : a.type === 'RELEASE'
          ? 'RELEASED'
          : undefined;
  return normaliseEvent({
    id: a.id,
    integrationId: a.integrationId,
    eventType: type ?? (riskScore >= 31 ? 'VIOLATION' : 'NORMAL'),
    endpoint: a.endpoint,
    riskScore,
    action: a.action,
    reason: a.reason || 'Request evaluated',
    createdAt,
  } as SecEvent);
}

export interface IntegrationDetailResponse {
  profile: IntegrationRow;
  behaviour: {
    normalRate?: number;
    normal?: number;
    expectedRatePerMin?: number;
    currentRate?: number;
    current?: number;
    currentRatePerMin?: number;
    deviationMultiple?: number;
    deviation?: number;
    anomalous?: boolean;
  };
  recentViolations?: SecEvent[];
}

export function getBehaviourNormal(b: IntegrationDetailResponse['behaviour'], fallback = 100): number {
  return b.normalRate ?? b.normal ?? b.expectedRatePerMin ?? fallback;
}
export function getBehaviourCurrent(b: IntegrationDetailResponse['behaviour'], fallback: number): number {
  return b.currentRate ?? b.current ?? b.currentRatePerMin ?? fallback;
}
export function getBehaviourDeviation(
  b: IntegrationDetailResponse['behaviour'],
  normal: number,
  current: number
): number {
  if (typeof b.deviationMultiple === 'number') return b.deviationMultiple;
  if (typeof b.deviation === 'number') return b.deviation;
  return Number((current / Math.max(1, normal)).toFixed(1));
}

export interface HistoryPoint {
  t: string;
  v?: number;
  volume: number;
  risk: number;
  normalRate: number;
}
export interface HistoryResponse {
  integrationId: string;
  normalRate: number;
  currentRate: number;
  currentRisk: number;
  history: HistoryPoint[];
}
export function getHistoryVolume(p: HistoryPoint): number {
  return p.volume ?? p.v ?? 0;
}

export interface CheckResult {
  riskScore: number;
  level: string;
  violations: { code: string; detail: string; points: number }[];
  action: string;
  reason: string;
}

export interface SimulatorPhase {
  phase: number;
  name: string;
  endpoint: string;
  method: string;
  dataRequested: string[];
  requestCount: number;
  expectedRisk: number;
  expectedAction: string;
}
export interface SimulatorStartResponse {
  sessionId: string;
  integrationId?: string;
  target?: string;
  status: string;
  phases: SimulatorPhase[];
}
export function getSimulatorTarget(r: SimulatorStartResponse, fallback: string): string {
  return r.integrationId ?? r.target ?? fallback;
}

export interface AuditVerifyResult {
  verified: boolean;
  integrity: string;
  chainLength: number;
  genesisHash: string;
  latestHash: string;
  verifiedRecordsCount: number;
  timestamp: string;
}

export interface ThreatStats {
  totalEvents: number;
  byEventType: Record<string, number>;
  byAction: Record<string, number>;
  topTargetedEndpoints: { endpoint: string; count: number }[];
  topOffendingIntegrations: { integrationId: string; count: number }[];
  mostTargetedEndpoint: string;
  mostFlaggedIntegration: string;
}

export async function checkEngineHealth(): Promise<boolean> {
  try {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}/healthz`, { cache: 'no-store' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function downloadAuditExport(format: 'csv' | 'json' = 'json', fallbackEvents?: SecEvent[]) {
  try {
    const baseUrl = getApiUrl();
    const url = `${baseUrl}/api/security-events/export?format=${format}`;
    const res = await fetch(url);
    if (res.ok) {
      const blob = await res.blob();
      triggerBlobDownload(blob, `thirdeye-audit-log.${format}`);
      return;
    }
  } catch {
    /* Fallback to local client-side export */
  }

  const list = fallbackEvents ?? [];
  let content = '';
  let mimeType = 'application/json';

  if (format === 'json') {
    content = JSON.stringify(list, null, 2);
    mimeType = 'application/json';
  } else {
    const headers = [
      'id',
      'timestamp',
      'integration_id',
      'event_type',
      'risk_score',
      'action',
      'endpoint',
      'reason',
      'hash',
    ];
    const rows = list.map(e =>
      [
        e.id,
        getEventCreatedAt(e),
        getEventIntegrationId(e),
        getEventType(e),
        getEventRiskScore(e),
        e.action ?? '',
        e.endpoint ?? '',
        `"${(e.reason ?? '').replace(/"/g, '""')}"`,
        e.hash ?? '',
      ].join(',')
    );
    content = [headers.join(','), ...rows].join('\n');
    mimeType = 'text/csv;charset=utf-8;';
  }

  const blob = new Blob([content], { type: mimeType });
  triggerBlobDownload(blob, `thirdeye-audit-log.${format}`);
}

function triggerBlobDownload(blob: Blob, filename: string) {
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = downloadUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

export function levelFor(score: number): RiskLevel {
  if (score >= 81) return 'CRITICAL';
  if (score >= 61) return 'HIGH_RISK';
  if (score >= 31) return 'SUSPICIOUS';
  return 'TRUSTED';
}

/** Short labels for badges — map HIGH_RISK/SUSPICIOUS to display form. */
export function levelShort(score: number): string {
  if (score >= 81) return 'CRITICAL';
  if (score >= 61) return 'HIGH';
  if (score >= 31) return 'WATCH';
  return 'TRUSTED';
}

export function riskColor(score: number): string {
  if (score >= 81) return '#FF4D5E';
  if (score >= 61) return '#FF9F2E';
  if (score >= 31) return '#FFC42E';
  return '#19D98A';
}

export function statusColor(status: string): string {
  switch (status) {
    case 'QUARANTINED':
      return '#FF4D5E';
    case 'RATE_LIMITED':
      return '#FF9F2E';
    case 'MONITORED':
      return '#FFC42E';
    default:
      return '#19D98A';
  }
}

export function actionLabel(action: string): string {
  switch (action) {
    case 'ALLOW':
      return 'Allow';
    case 'MONITOR':
      return 'Allow + Monitor';
    case 'RATE_LIMIT':
      return 'Rate limit + Monitor';
    case 'BLOCK':
      return 'Block';
    case 'QUARANTINE':
      return 'Block + Quarantine';
    default:
      return action;
  }
}

/** Formats an ISO date into relative time string. */
export function timeAgo(iso: string): string {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}
