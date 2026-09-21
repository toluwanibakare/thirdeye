'use client';
import Link from 'next/link';
import { getRiskScore, riskColor } from '@/lib/api';
import type { IntegrationRow } from '@/lib/api';

/**
 * High-Tech Live Topology Map:
 * Store Application -> ThirdEye Risk Engine -> 4 Partner Integration Nodes
 * Pixel-perfect SVG layout with zero text/icon overlaps, smooth cubic Bezier paths,
 * animated packet flows, and high-contrast alert indicators.
 */
export function IntegrationMap({
  items,
  onSelect,
  variant = 'auto',
}: {
  items: IntegrationRow[];
  onSelect?: (id: string) => void;
  variant?: 'light' | 'dark' | 'auto';
}) {
  const W = 860;
  const H = 380;
  const cx = W / 2; // 430

  // Coordinates
  const appY = 40;
  const coreY = 126;
  const nodeY = 272;

  const hasConnectedItems = items.length > 0;
  const displayItems = items.slice(0, 5);
  const n = Math.max(1, displayItems.length);
  const cardW = n <= 4 ? 180 : 154;
  const gap = n <= 4 ? 30 : 14;
  const totalW = n * cardW + (n - 1) * gap;
  const startLeft = (W - totalW) / 2;
  const xs = Array.from({ length: n }, (_, i) => startLeft + i * (cardW + gap) + cardW / 2);
  const coreSpan = 220;
  const corePortXs =
    n === 1 ? [cx] : Array.from({ length: n }, (_, i) => cx - coreSpan / 2 + (i * coreSpan) / (n - 1));

  return (
    <div className="panel relative overflow-hidden rounded-2xl shadow-sm border border-[#E2E8F0]">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E2E8F0] px-5 py-3.5 md:px-6 bg-[#FAFCFF]">
        <div>
          <div className="eyebrow font-bold text-[11px] uppercase tracking-wider text-brand">
            Live Integration Topology
          </div>
          <div className="h-section mt-0.5 text-[15px] font-bold text-[#0A1830]">
            Authorised traffic under continuous verification
          </div>
        </div>
        <span
          className={`chip font-semibold text-[11.5px] ${
            hasConnectedItems
              ? '!border-[#0E9F6E]/30 !bg-[#0E9F6E]/[0.08] !text-[#0B7A55]'
              : '!border-slate-300 !bg-slate-100 !text-slate-600'
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              hasConnectedItems ? 'bg-[#0E9F6E] animate-pulseDot' : 'bg-slate-400'
            }`}
          />
          <span className="tabular-nums">
            {hasConnectedItems
              ? `${items.length} integrations active · live monitoring`
              : '0 integrations active · standby'}
          </span>
        </span>
      </div>

      {/* Topology Canvas Area */}
      <div className="relative py-3 bg-[#0B132B]">
        {/* Grid pattern background */}
        <div className="bg-grid absolute inset-0 opacity-30 pointer-events-none" />

        {/* Scan sweep line animation (only active when connected) */}
        {hasConnectedItems && (
          <div className="pointer-events-none absolute inset-x-0 top-0 bottom-0 overflow-hidden">
            <div
              className="absolute inset-x-0 h-16 bg-gradient-to-b from-transparent via-brand/[0.08] to-transparent"
              style={{ animation: 'scanSweep 6s ease-in-out infinite' }}
            />
          </div>
        )}
        <style>{`@keyframes scanSweep { 0%,100% { top: -12%; } 50% { top: 92%; } }`}</style>

        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="relative h-auto w-full min-w-[680px] select-none">
            <defs>
              {/* Soft Glow filter */}
              <filter id="glowLight" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Critical Red Glow filter */}
              <filter id="glowRed" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>

              {/* Core Box Gradient */}
              <linearGradient id="thirdEyeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0B172A" />
                <stop offset="100%" stopColor="#112240" />
              </linearGradient>

              {/* App Box Gradient */}
              <linearGradient id="appGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#12233F" />
                <stop offset="100%" stopColor="#0E1A33" />
              </linearGradient>
            </defs>

            {/* 1. STORE APPLICATION NODE (Width: 280, Height: 52) */}
            <g transform={`translate(${cx - 140}, ${appY - 26})`}>
              <rect
                width={280}
                height={52}
                rx={14}
                fill="url(#appGrad)"
                stroke={hasConnectedItems ? 'rgba(22,119,255,0.45)' : 'rgba(255,255,255,0.15)'}
                strokeWidth={1.5}
                strokeDasharray={hasConnectedItems ? 'none' : '4 3'}
                className="shadow-sm"
              />
              {/* App Icon Circle */}
              <circle cx={26} cy={26} r={13} fill={hasConnectedItems ? '#1677FF' : '#475569'} opacity={0.25} />
              <path
                d="M20 26h12 M26 20v12"
                stroke={hasConnectedItems ? '#5B9CFF' : '#94A3B8'}
                strokeWidth={2}
                strokeLinecap="round"
              />
              {/* Title & Subtitle */}
              <text x={52} y={23} fill={hasConnectedItems ? '#F5F9FF' : '#94A3B8'} fontSize={13} fontWeight={800} fontFamily="Inter, system-ui">
                STORE APPLICATION
              </text>
              <text x={52} y={38} fill={hasConnectedItems ? '#8B9BB4' : '#64748B'} fontSize={9.5} fontFamily="monospace" letterSpacing={0.5}>
                {hasConnectedItems ? 'checkout · payments · delivery' : 'disconnected · no store linked'}
              </text>
            </g>

            {/* Connection: App -> ThirdEye Core */}
            <line
              x1={cx}
              y1={appY + 25}
              x2={cx}
              y2={coreY - 28}
              stroke={hasConnectedItems ? '#1677FF' : 'rgba(255,255,255,0.15)'}
              strokeWidth={2}
              strokeDasharray="4 3"
              strokeOpacity={hasConnectedItems ? 0.7 : 0.3}
            />
            {/* Animated App-to-Core Flow Packet (Only when connected) */}
            {hasConnectedItems && (
              <circle cx={cx} cy={appY + 36} r={3.5} fill="#00C8D7" filter="url(#glowLight)">
                <animate
                  attributeName="cy"
                  values={`${appY + 25};${coreY - 28};${appY + 25}`}
                  dur="2.2s"
                  repeatCount="indefinite"
                />
                <animate attributeName="opacity" values="1;0.4;1" dur="2.2s" repeatCount="indefinite" />
              </circle>
            )}

            {/* 2. THIRDEYE CORE RISK ENGINE NODE (Width: 280, Height: 56) */}
            <g transform={`translate(${cx - 140}, ${coreY - 28})`}>
              {/* Background Container */}
              <rect
                width={280}
                height={56}
                rx={14}
                fill="url(#thirdEyeGrad)"
                stroke={hasConnectedItems ? '#1E3A8A' : 'rgba(255,255,255,0.15)'}
                strokeWidth={1.5}
                className="shadow-md"
              />
              {/* Top Cyan Accent Strip */}
              <rect x={16} y={0} width={248} height={3} rx={1.5} fill={hasConnectedItems ? '#00C8D7' : '#475569'} />

              {/* Emblem Circle */}
              <circle cx={26} cy={28} r={11} fill="none" stroke={hasConnectedItems ? '#3B82F6' : '#64748B'} strokeWidth={2} />
              <circle cx={26} cy={28} r={4.5} fill={hasConnectedItems ? '#00C8D7' : '#64748B'} filter={hasConnectedItems ? 'url(#glowLight)' : undefined} />

              {/* Engine Text */}
              <text
                x={48}
                y={23}
                fill="#FFFFFF"
                fontSize={13.5}
                fontWeight={900}
                fontFamily="Inter, system-ui"
                letterSpacing={0.6}
              >
                THIRDEYE
              </text>
              <text
                x={48}
                y={39}
                fill="#94A3B8"
                fontSize={9.5}
                fontFamily="monospace"
                letterSpacing={1.0}
                fontWeight={600}
              >
                {hasConnectedItems ? 'RISK ENGINE · LIVE' : 'RISK ENGINE · STANDBY'}
              </text>

              {/* Indicator Pill */}
              <g transform="translate(204, 18)">
                <rect
                  width={64}
                  height={20}
                  rx={10}
                  fill={hasConnectedItems ? '#0E9F6E' : '#475569'}
                  fillOpacity={0.2}
                  stroke={hasConnectedItems ? '#0E9F6E' : '#64748B'}
                  strokeWidth={1}
                />
                <circle
                  cx={12}
                  cy={10}
                  r={3}
                  fill={hasConnectedItems ? '#19D98A' : '#94A3B8'}
                  className={hasConnectedItems ? 'animate-pulseDot' : ''}
                />
                <text
                  x={36}
                  y={13.5}
                  textAnchor="middle"
                  fill={hasConnectedItems ? '#19D98A' : '#94A3B8'}
                  fontSize={9}
                  fontWeight={800}
                  fontFamily="Inter, system-ui"
                >
                  {hasConnectedItems ? 'LIVE' : 'STANDBY'}
                </text>
              </g>
            </g>

            {!hasConnectedItems && (
              <g transform={`translate(${cx - 180}, ${nodeY - 35})`}>
                <rect
                  width={360}
                  height={64}
                  rx={14}
                  fill="#0E1A33"
                  stroke="rgba(245,249,255,0.12)"
                  strokeWidth={1}
                  strokeDasharray="5 4"
                />
                <text
                  x={180}
                  y={28}
                  textAnchor="middle"
                  fill="#FFFFFF"
                  fontSize={13}
                  fontWeight={700}
                  fontFamily="Inter, system-ui"
                >
                  No Store Project Connected
                </text>
                <text
                  x={180}
                  y={45}
                  textAnchor="middle"
                  fill="#8B9BB4"
                  fontSize={10.5}
                  fontFamily="Inter, system-ui"
                >
                  Connect your project to ThirdEye to start live traffic monitoring
                </text>
              </g>
            )}

            {/* Ports on bottom of ThirdEye Engine Box */}
            {corePortXs.map(px => (
              <circle
                key={px}
                cx={px}
                cy={coreY + 28}
                r={3.5}
                fill="#3B82F6"
                stroke="#FFFFFF"
                strokeWidth={1.5}
              />
            ))}

            {/* 3. BRANCH LINKS + INTEGRATION NODES */}
            {displayItems.map((it, i) => {
              const destX = xs[i] ?? 115;
              const portX = corePortXs[i] ?? cx;
              const cardHalf = cardW / 2;

              const score = getRiskScore(it);

              const isCritical = score >= 81 || it.status === 'QUARANTINED';
              const isHigh = score >= 61 && score < 81;
              const isWatch = score >= 31 && score < 61;
              const bad = isCritical || isHigh;

              const linkColor = isCritical ? '#FF4D5E' : isHigh ? '#FF9F2E' : isWatch ? '#FFC42E' : '#19D98A';

              // Smooth cubic Bezier path from ThirdEye bottom port to Node top port
              const startY = coreY + 28;
              const endY = nodeY - 32;
              const controlY1 = startY + 45;
              const controlY2 = endY - 45;
              const pathD = `M ${portX} ${startY} C ${portX} ${controlY1}, ${destX} ${controlY2}, ${destX} ${endY}`;

              let cleanName = it.name
                .replace(/\s*\(3-Yr Legacy Trial\)/gi, '')
                .replace(/\s*AI Agent Skill/gi, '')
                .replace(/\s*Autonomous Agent Skill/gi, '')
                .replace(/\s*Provider/gi, '')
                .replace(/\s*Sync/gi, '')
                .trim();
              if (cleanName.length > 18) {
                cleanName = cleanName.substring(0, 17) + '…';
              }
              const nodeName = cleanName.toUpperCase();
              const statusLabel = isCritical
                ? 'CRITICAL'
                : isHigh
                  ? 'HIGH_RISK'
                  : isWatch
                    ? 'SUSPICIOUS'
                    : 'TRUSTED';
              const rateText = `${it.requestsPerMin ?? it.expected_request_rate ?? '90'}/min`;

              return (
                <g key={it.id}>
                  {/* Connection Line */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke={linkColor}
                    strokeOpacity={isCritical ? 0.85 : bad ? 0.7 : 0.45}
                    strokeWidth={isCritical ? 2.5 : bad ? 2 : 1.6}
                    strokeDasharray={isCritical ? '5 3' : 'none'}
                  />

                  {/* Animated Flow Packet along path */}
                  <circle
                    r={isCritical ? 4.5 : 3.5}
                    fill={linkColor}
                    filter={isCritical ? 'url(#glowRed)' : 'url(#glowLight)'}
                  >
                    <animateMotion
                      dur={isCritical ? '1.1s' : isHigh ? '1.8s' : '2.6s'}
                      repeatCount="indefinite"
                      path={pathD}
                    />
                  </circle>

                  {/* Input port dot on top of node card */}
                  <circle cx={destX} cy={endY} r={4} fill={linkColor} stroke="#FFFFFF" strokeWidth={1.5} />

                  {/* INTEGRATION CARD NODE */}
                  <g
                    transform={`translate(${destX - cardHalf}, ${nodeY - 32})`}
                    onClick={() => onSelect?.(it.id)}
                    style={{ cursor: onSelect ? 'pointer' : 'default', transition: 'filter 150ms ease-out' }}
                    onMouseEnter={e => {
                      e.currentTarget.style.filter = 'brightness(1.18)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.filter = '';
                    }}
                  >
                    <title>{it.name}</title>
                    {/* Card Shadow and Background */}
                    <rect
                      width={cardW}
                      height={76}
                      rx={14}
                      fill={isCritical ? '#2A0E18' : isHigh ? '#2A1E0A' : '#0E1A33'}
                      stroke={isCritical ? '#FF4D5E' : isHigh ? '#FF9F2E' : 'rgba(245,249,255,0.14)'}
                      strokeWidth={isCritical ? 2 : 1.5}
                      className="shadow-sm"
                    />

                    {/* Red Alert Indicator Badge for Critical Nodes */}
                    {isCritical && (
                      <g transform={`translate(${cardW - 24}, -6)`}>
                        <circle cx={0} cy={0} r={10} fill="#FF4D5E" className="animate-pulseDot" />
                        <circle
                          cx={0}
                          cy={0}
                          r={14}
                          fill="none"
                          stroke="#FF4D5E"
                          strokeWidth={1.5}
                          opacity={0.5}
                        />
                        <path
                          d="M-3 -3l6 6 M3 -3l-6 6"
                          stroke="#FFFFFF"
                          strokeWidth={2}
                          strokeLinecap="round"
                        />
                      </g>
                    )}

                    {/* Integration Name */}
                    <text
                      x={cardHalf}
                      y={19}
                      textAnchor="middle"
                      fill="#F5F9FF"
                      fontSize={n <= 4 ? 12 : 11}
                      fontWeight={800}
                      fontFamily="Inter, system-ui"
                      letterSpacing={0.4}
                    >
                      {nodeName}
                    </text>

                    {/* Risk Score & Tier Label */}
                    <text
                      x={cardHalf}
                      y={34}
                      textAnchor="middle"
                      fill={linkColor}
                      fontSize={n <= 4 ? 11.5 : 10.5}
                      fontWeight={900}
                      fontFamily="monospace"
                    >
                      {score.toString().padStart(2, '0')} · {statusLabel}
                    </text>

                    {/* Traffic Rate & Status */}
                    <text
                      x={cardHalf}
                      y={48}
                      textAnchor="middle"
                      fill="#8B9BB4"
                      fontSize={9}
                      fontFamily="monospace"
                      fontWeight={500}
                    >
                      {rateText} · {it.status}
                    </text>

                    {/* Reached & Touched Data Scope / Scope Violation Tag */}
                    {(() => {
                      const allowedDataList = (it.allowed_data || it.allowedData || []).slice(0, 2);
                      const forbiddenList = (it.forbidden_data || it.forbiddenData || []).slice(0, 1);
                      const dataLabel = allowedDataList.length > 0 ? allowedDataList.join('·') : 'order_id';
                      const forbiddenLabel = forbiddenList.length > 0 ? forbiddenList[0] : 'PII_DATA';
                      return (
                        <text
                          x={cardHalf}
                          y={62}
                          textAnchor="middle"
                          fill={isCritical ? '#FF8090' : isHigh ? '#FFB84D' : isWatch ? '#FFE066' : '#00C8D7'}
                          fontSize={8.5}
                          fontFamily="monospace"
                          fontWeight={700}
                          letterSpacing={0.3}
                        >
                          {isCritical ? `⚠️ BREACH: ${forbiddenLabel}` : isHigh ? `⚠️ DRIFT: ${forbiddenLabel}` : `REACH: ${dataLabel}`}
                        </text>
                      );
                    })()}
                  </g>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend Bar */}
        <div className="relative flex flex-wrap items-center gap-2.5 border-t border-white/10 bg-[#040B16]/80 px-5 py-3 md:px-6">
          <span className="eyebrow mr-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Legend
          </span>
          {[
            ['#19D98A', 'Trusted 0–30'],
            ['#FFC42E', 'Suspicious 31–60'],
            ['#FF9F2E', 'High 61–80'],
            ['#FF4D5E', 'Critical 81–100'],
          ].map(([c, t]) => (
            <span
              key={t}
              className="chip font-semibold text-[11px] !bg-white/5 !border-white/10 !text-slate-300"
            >
              <span className="h-2 w-2 rounded-full mr-1.5 inline-block" style={{ background: c }} />
              {t}
            </span>
          ))}
          <Link
            href="/integrations"
            className="ml-auto font-mono text-[11.5px] font-bold tracking-wide text-brand hover:underline inline-flex items-center gap-1"
          >
            Open registry →
          </Link>
        </div>
      </div>
    </div>
  );
}
