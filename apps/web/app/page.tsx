'use client';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { CodeTypingPreview } from '@/components/CodeTypingPreview';
import { IntegrationMap } from '@/components/IntegrationMap';
import { CountUp, Reveal } from '@/components/Reveal';
import { Icon, paths } from '@/components/icons';
import {
  apiSafe,
  getRiskScore,
  levelFor,
  normaliseIntegration,
  riskColor,
  type IntegrationRow,
} from '@/lib/api';

const TIERS = [
  {
    range: '0–30',
    tier: 'Trusted',
    action: 'Allow',
    color: '#19D98A',
    desc: 'Matches declared purpose, endpoint scope and method.',
  },
  {
    range: '31–60',
    tier: 'Suspicious',
    action: 'Allow + monitor',
    color: '#FFC42E',
    desc: 'Endpoint or purpose drift. Logged for review.',
  },
  {
    range: '61–80',
    tier: 'High risk',
    action: 'Rate limit + monitor',
    color: '#FF9F2E',
    desc: 'Restricted data or volume anomaly.',
  },
  {
    range: '81–100',
    tier: 'Critical',
    action: 'Block + quarantine',
    color: '#FF4D5E',
    desc: 'Sustained abuse. Isolated until review.',
  },
];

const NAV_LINKS: { href: string; label: string; external?: boolean }[] = [
  { href: '#how', label: 'How it works' },
  { href: '#everyone', label: 'Start here' },
  { href: '#architecture', label: 'Topology' },
  { href: '#response', label: 'Response' },
  { href: '#audit', label: 'Audit' },
  { href: '/docs', label: 'Docs', external: true },
];

/** Auto-playing compromise story: what the hero risk loop cycles through. */
const RISK_LOOP = [
  { score: 8, name: 'Normal operation', detail: '/analytics/events · 95/min', action: 'ALLOW' },
  { score: 45, name: 'Endpoint probe', detail: '/customers/profile · 300/min', action: 'ALLOW + MONITOR' },
  {
    score: 75,
    name: 'Data exfiltration',
    detail: '/customers/payment-details · 800/min',
    action: 'RATE LIMIT',
  },
  {
    score: 95,
    name: 'Full breach spike',
    detail: 'payment + phone + address · 1,780/min',
    action: 'BLOCK + QUARANTINE',
  },
];

function RiskLoop() {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setI(v => (v + 1) % RISK_LOOP.length), 1900);
    return () => clearInterval(id);
  }, []);
  const p = RISK_LOOP[i];
  const c = riskColor(p.score);
  return (
    <div
      className="mt-4 overflow-hidden rounded-2xl border"
      style={{
        borderColor: 'rgba(245,249,255,0.1)',
        background: 'rgba(4,11,22,0.72)',
        backdropFilter: 'blur(16px)',
      }}
    >
      <div className="flex items-center justify-between px-4 pt-3">
        <span
          className="mono-num text-[10.5px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: '#6E7E99' }}
        >
          Live compromise · phase {i + 1}/4
        </span>
        <span className="mono-num text-[10.5px] font-bold" style={{ color: c }}>
          {p.action}
        </span>
      </div>
      <div className="flex items-center gap-4 px-4 pb-1 pt-2">
        <span
          key={p.score}
          className="mono-num text-[44px] font-bold tabular-nums leading-none"
          style={{ color: c, animation: 'riskPop 0.45s cubic-bezier(0.23,1,0.32,1)' }}
        >
          {p.score}
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px] font-semibold text-white">{p.name}</div>
          <div className="mono-num truncate text-[11.5px]" style={{ color: '#8494AD' }}>
            {p.detail}
          </div>
          <div className="mt-2 flex gap-1.5">
            {RISK_LOOP.map((s, j) => (
              <span
                key={s.score}
                className="h-1.5 flex-1 rounded-full transition-all duration-500"
                style={{ background: j <= i ? riskColor(s.score) : 'rgba(245,249,255,0.1)' }}
              />
            ))}
          </div>
        </div>
        <span
          className="chip hidden shrink-0 !text-[10px] sm:inline-flex"
          style={{ color: c, borderColor: `${c}55` }}
        >
          {levelFor(p.score)}
        </span>
      </div>
      <div className="flex items-center justify-between px-4 pb-3 pt-1">
        <span className="mono-num text-[10.5px]" style={{ color: '#5B6B85' }}>
          analytics_001 · credential compromise
        </span>
        <Link
          href="/simulator"
          className="font-mono text-[11px] font-semibold text-[#5B9CFF] hover:underline"
        >
          Replay live →
        </Link>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const [items, setItems] = useState<IntegrationRow[]>([]);
  const [live, setLive] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [spot, setSpot] = useState({ x: 50, y: 28 });
  const [showBanner, setShowBanner] = useState(true);
  const [tier, setTier] = useState(1);
  const [tierHold, setTierHold] = useState(false);

  useEffect(() => {
    if (tierHold || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => setTier(v => (v + 1) % TIERS.length), 4500);
    return () => clearInterval(id);
  }, [tierHold]);

  useEffect(() => {
    apiSafe<IntegrationRow[]>('/api/integrations', []).then(r => {
      setItems(r.data.map(normaliseIntegration));
      setLive(r.live);
    });
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const critical = [...items].sort((a, b) => getRiskScore(b) - getRiskScore(a))[0];

  return (
    <div className="min-h-screen bg-[#040B16] font-sans text-[#F2F6FC] antialiased overflow-x-clip">
      <style>{`
        @keyframes auroraA { from { transform: translate(0,0) scale(1); } to { transform: translate(70px,40px) scale(1.12); } }
        @keyframes auroraB { from { transform: translate(0,0) scale(1.08); } to { transform: translate(-60px,-36px) scale(1); } }
        @keyframes ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes riskPop { from { opacity: 0; transform: scale(0.85); } to { opacity: 1; transform: scale(1); } }
        @keyframes tierProgress { from { width: 0%; } to { width: 100%; } }
        @keyframes floatY { 0%,100% { transform: translateY(-6px); } 50% { transform: translateY(6px); } }
        @keyframes shineSweep { from { transform: translateX(-120%) skewX(-18deg); } to { transform: translateX(240%) skewX(-18deg); } }
        @property --beam-angle { syntax: "<angle>"; initial-value: 0deg; inherits: false; }
        @keyframes beamSpin { to { --beam-angle: 360deg; } }
        .cf-beam { position: relative; }
        .cf-beam::before {
          content: ''; position: absolute; inset: -1px; border-radius: inherit; padding: 1.5px;
          background: conic-gradient(from var(--beam-angle), transparent 0%, transparent 62%, rgba(91,156,255,0.9) 78%, #00C8D7 86%, transparent 96%);
          -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          -webkit-mask-composite: xor; mask-composite: exclude;
          animation: beamSpin 5s linear infinite; pointer-events: none;
        }
        .cf-shine { position: relative; overflow: hidden; }
        .cf-shine::after {
          content: ''; position: absolute; top: 0; bottom: 0; width: 45%;
          background: linear-gradient(to right, transparent, rgba(255,255,255,0.28), transparent);
          transform: translateX(-120%) skewX(-18deg);
        }
        .cf-shine:hover::after { animation: shineSweep 0.7s ease; }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
      {/* ── Announcement bar (Cloudflare-style) ── */}
      {showBanner && (
        <div
          className="relative z-50 flex items-center justify-center gap-3 px-4 py-2 text-center"
          style={{
            background: 'linear-gradient(90deg, #B34700, #F6821F 45%, #FBAD41 55%, #B34700)',
            backgroundSize: '200% 100%',
            animation: 'bannerSlide 12s linear infinite',
          }}
        >
          <style>{`@keyframes bannerSlide { from { background-position: 0% 0; } to { background-position: 200% 0; } }`}</style>
          <Link
            href="/simulator"
            className="truncate text-[12.5px] font-semibold text-white"
            style={{ letterSpacing: '0.01em' }}
          >
            Watch a live credential-compromise demo, 8 → 95 in four phases{' '}
            <span className="underline underline-offset-2">Run it →</span>
          </Link>
          <button
            onClick={() => setShowBanner(false)}
            aria-label="Dismiss announcement"
            className="shrink-0 rounded-full p-1 text-white/80 transition-colors hover:bg-black/20 hover:text-white"
          >
            <Icon d={paths.cross} size={12} />
          </button>
        </div>
      )}
      {/* ── Nav: glassy layer that stays put while content slides under ── */}
      <header className="sticky top-0 z-50">
        <div
          className="transition-[background,box-shadow,border-color] duration-200"
          style={
            scrolled
              ? {
                  background: 'rgba(4, 11, 22, 0.88)',
                  backdropFilter: 'blur(24px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                  borderBottom: '1px solid rgba(245,249,255,0.09)',
                  boxShadow: '0 12px 40px -18px rgba(0,0,0,0.85)',
                }
              : {
                  background: 'rgba(4, 11, 22, 0.65)',
                  backdropFilter: 'blur(20px) saturate(160%)',
                  WebkitBackdropFilter: 'blur(20px) saturate(160%)',
                  borderBottom: '1px solid rgba(245,249,255,0.06)',
                  boxShadow: 'none',
                }
          }
        >
          <div className="console-full flex h-16 items-center gap-3 sm:gap-4">
            <Link
              href="/"
              className="group flex shrink-0 items-center gap-2.5 sm:gap-3"
              aria-label="ThirdEye home"
            >
              <Image
                src="/logo.jpeg"
                alt="ThirdEye"
                width={56}
                height={56}
                className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl object-contain transition-transform duration-150 group-active:scale-95"
                priority
              />
              <span className="leading-none">
                <span
                  className="block text-[17px] sm:text-[18px] font-bold text-white"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  ThirdEye
                </span>
                <span
                  className="mt-0.5 block text-[10px] sm:text-[11px] font-medium"
                  style={{ letterSpacing: '0.06em', color: '#6E7E99' }}
                >
                  INTEGRATION SECURITY PLATFORM
                </span>
              </span>
            </Link>
            <nav className="mx-auto hidden items-center gap-1 lg:flex" aria-label="Product">
              {NAV_LINKS.map(item => (
                <a
                  key={item.href}
                  href={item.href}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener noreferrer' : undefined}
                  className="rounded-full px-3.5 py-1.5 text-[13.5px] font-medium transition-colors duration-150 hover:text-white"
                  style={{ color: '#93A1B8', letterSpacing: '-0.006em' }}
                >
                  {item.label}
                  {item.external && <span className="ml-1 text-[11px] opacity-60">↗</span>}
                </a>
              ))}
            </nav>
            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-2.5 lg:ml-0">
              <span
                className="chip hidden !text-[11px] md:inline-flex"
                style={{ color: live ? '#19D98A' : '#8B9BB4' }}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-[#19D98A] animate-pulseDot' : 'bg-[#5B6B85]'}`}
                />
                {live ? 'Live' : 'Demo'}
              </span>
              <Link href="/simulator" className="btn-ghost hidden !px-3.5 !py-2 !text-[13px] sm:inline-flex">
                Attack demo
              </Link>
              <Link href="/dashboard" className="btn-accent group !px-3.5 sm:!px-4 !py-2 !text-[13px]">
                Open console
                <span className="transition-transform duration-150 group-hover:translate-x-0.5">
                  <Icon d={paths.arrow} size={14} />
                </span>
              </Link>
              <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="flex h-10 w-10 items-center justify-center rounded-full border lg:hidden active:scale-95 transition-transform"
                style={{
                  borderColor: 'rgba(245,249,255,0.14)',
                  background: 'rgba(245,249,255,0.06)',
                  color: '#F2F6FC',
                }}
                aria-label="Toggle menu"
              >
                <Icon d={mobileNavOpen ? paths.cross : paths.grid} size={16} />
              </button>
            </div>
          </div>

          {/* Landing Mobile Drawer */}
          {mobileNavOpen && (
            <div
              className="border-t px-4 py-4 lg:hidden animate-rise"
              style={{ borderColor: 'rgba(245,249,255,0.08)', background: 'rgba(4, 11, 22, 0.96)' }}
            >
              <nav className="flex flex-col gap-2" aria-label="Product mobile">
                {NAV_LINKS.map(item => (
                  <a
                    key={item.href}
                    href={item.href}
                    target={item.external ? '_blank' : undefined}
                    rel={item.external ? 'noopener noreferrer' : undefined}
                    onClick={() => setMobileNavOpen(false)}
                    className="flex items-center justify-between rounded-xl px-4 py-3 text-[14.5px] font-semibold transition-colors"
                    style={{ background: 'rgba(245,249,255,0.04)', color: '#E6EDF7' }}
                  >
                    <span>{item.label}</span>
                    <Icon d={paths.arrow} size={13} className="text-[#6E7E99]" />
                  </a>
                ))}
              </nav>
              <div
                className="mt-4 flex flex-col gap-2 border-t pt-3"
                style={{ borderColor: 'rgba(245,249,255,0.08)' }}
              >
                <Link
                  href="/simulator"
                  onClick={() => setMobileNavOpen(false)}
                  className="btn-ghost w-full justify-center !py-2.5 !text-[13.5px]"
                >
                  <Icon d={paths.play} size={14} /> Run attack simulator
                </Link>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileNavOpen(false)}
                  className="btn-accent w-full justify-center !py-2.5 !text-[13.5px]"
                >
                  Open live console <Icon d={paths.arrow} size={14} />
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* ── Hero: eyebrow, display, proof, story visual ── */}
      <section
        className="console-full relative overflow-hidden pb-12 pt-10 md:pb-20 md:pt-[76px]"
        onMouseMove={e => {
          const r = e.currentTarget.getBoundingClientRect();
          setSpot({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
      >
        {/* Sleeker layered hero background */}
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-70" />
        <div
          className="pointer-events-none absolute -left-40 top-10 h-[460px] w-[460px] rounded-full blur-[130px]"
          style={{
            background: 'rgba(91,80,230,0.22)',
            animation: 'auroraA 14s ease-in-out infinite alternate',
          }}
        />
        <div
          className="pointer-events-none absolute -right-40 top-64 h-[420px] w-[420px] rounded-full blur-[130px]"
          style={{
            background: 'rgba(0,200,215,0.14)',
            animation: 'auroraB 18s ease-in-out infinite alternate',
          }}
        />
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 opacity-[0.10] animate-spinSlow"
          style={{
            background:
              'conic-gradient(from 0deg, transparent 0deg, rgba(22,119,255,0.6) 40deg, transparent 90deg, transparent 180deg, rgba(255,42,109,0.45) 230deg, transparent 280deg)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 transition-[background] duration-150"
          style={{
            background: `radial-gradient(560px circle at ${spot.x}% ${spot.y}%, rgba(22,119,255,0.12), transparent 65%)`,
          }}
        />
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
          style={{ background: 'linear-gradient(to bottom, transparent, #040B16)' }}
        />
        <div className="relative grid items-center gap-10 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <p
              className="inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-[11.5px] sm:text-[12px] font-semibold"
              style={{
                borderColor: 'rgba(22,119,255,0.35)',
                background: 'rgba(22,119,255,0.08)',
                color: '#8FBFFF',
                letterSpacing: '0.04em',
                animation: 'rise 0.5s cubic-bezier(0.23,1,0.32,1) both',
              }}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#5B9CFF] animate-pulseDot" />
              SECURITY FOR THIRD-PARTY INTEGRATIONS
            </p>
            <h1
              className="mt-4 sm:mt-5 max-w-[16ch] text-white"
              style={{
                fontSize: 'clamp(1.9rem, 7.5vw, 4.1rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.032em',
                fontWeight: 750,
                animation: 'rise 0.55s cubic-bezier(0.23,1,0.32,1) 80ms both',
              }}
            >
              Every third-party request,{' '}
              <span className="bg-gradient-to-r from-[#5B9CFF] via-[#00C8D7] to-[#19D98A] bg-clip-text text-transparent">
                watched
              </span>{' '}
              before it lands.
            </h1>
            <p
              className="mt-4 sm:mt-5 max-w-[56ch]"
              style={{
                fontSize: 'clamp(15px, 2vw, 17px)',
                lineHeight: 1.65,
                color: '#A9B6CC',
                letterSpacing: '-0.006em',
                animation: 'rise 0.55s cubic-bezier(0.23,1,0.32,1) 160ms both',
              }}
            >
              ThirdEye is the trust layer between apps like <strong className="text-white">StoreX</strong> and
              their Payments, Delivery, Analytics &amp; Marketing integrations — scoring every call 0–100
              against its declared purpose, then allowing, throttling or quarantining it.
            </p>
            {/* Story flow strip: app → trust layer → partners */}
            <div
              className="mt-5 flex flex-wrap items-center gap-2"
              style={{ animation: 'rise 0.55s cubic-bezier(0.23,1,0.32,1) 220ms both' }}
            >
              {['StoreX store', 'ThirdEye trust layer', '4 partner APIs'].map((s, j, arr) => (
                <span key={s} className="flex items-center gap-2">
                  <span
                    className="mono-num rounded-full border px-3 py-1.5 text-[11.5px] font-semibold"
                    style={
                      j === 1
                        ? {
                            borderColor: 'rgba(22,119,255,0.5)',
                            background: 'rgba(22,119,255,0.12)',
                            color: '#8FBFFF',
                            boxShadow: '0 0 24px -6px rgba(22,119,255,0.5)',
                          }
                        : {
                            borderColor: 'rgba(245,249,255,0.12)',
                            background: 'rgba(245,249,255,0.04)',
                            color: '#B8C4D8',
                          }
                    }
                  >
                    {j === 1 && (
                      <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-[#5B9CFF] animate-pulseDot" />
                    )}
                    {s}
                  </span>
                  {j < arr.length - 1 && (
                    <span className="font-mono text-[12px]" style={{ color: '#5B6B85' }}>
                      →
                    </span>
                  )}
                </span>
              ))}
            </div>
            <div
              className="mt-7 sm:mt-8 flex flex-col sm:flex-row sm:items-center gap-3"
              style={{ animation: 'rise 0.55s cubic-bezier(0.23,1,0.32,1) 280ms both' }}
            >
              <Link
                href="/dashboard"
                className="btn-accent cf-shine group w-full sm:w-auto justify-center !px-6 !py-3 !text-[14px] transition-all duration-200 hover:brightness-110 hover:shadow-[0_8px_36px_-8px_rgba(22,119,255,0.8)]"
                style={{ boxShadow: '0 8px 28px -10px rgba(22,119,255,0.6)' }}
              >
                Open live console
                <span className="transition-transform duration-150 group-hover:translate-x-0.5">
                  <Icon d={paths.arrow} size={15} />
                </span>
              </Link>
              <Link
                href="/simulator"
                className="btn-ghost group w-full sm:w-auto justify-center !px-6 !py-3 !text-[14px] transition-colors duration-200 hover:border-[#FF2A6D]/50"
              >
                <Icon d={paths.play} size={14} /> Watch an attack live
              </Link>
            </div>
            <p
              className="mono-num mt-4 text-[11.5px]"
              style={{ color: '#5B6B85', animation: 'rise 0.55s cubic-bezier(0.23,1,0.32,1) 340ms both' }}
            >
              no-code dashboard · SDK · AI agent skill · docs — start anywhere
            </p>
            <dl
              className="mt-8 sm:mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border sm:grid-cols-4"
              style={{ borderColor: 'rgba(245,249,255,0.09)', background: 'rgba(245,249,255,0.09)' }}
            >
              {[
                ['Custom Gateway', 'Intercept & route'],
                ['@the-third-eye/sdk', '3-line integration'],
                ['4 Tiers', 'Graded response'],
                ['SHA-256', 'Tamper-evident log'],
              ].map(([v, l]) => (
                <div key={l} className="px-3.5 py-3 sm:px-5 sm:py-4" style={{ background: '#071426' }}>
                  <dt
                    className="mono-num text-[17px] sm:text-[19px] font-semibold text-white"
                    style={{ letterSpacing: '-0.015em' }}
                  >
                    {v}
                  </dt>
                  <dd className="mt-0.5 text-[11px] sm:text-[12px]" style={{ color: '#8494AD' }}>
                    {l}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Story visual: product snapshot + live risk overlay */}
          <div className="relative lg:col-span-5">
            <div
              className="panel cf-beam relative overflow-hidden"
              style={{ boxShadow: '0 24px 80px -24px rgba(22,119,255,0.45)' }}
            >
              <div
                className="flex items-center gap-1.5 border-b px-4 py-3"
                style={{ borderColor: 'rgba(245,249,255,0.08)' }}
              >
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#FF5F57' }} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#FEBC2E' }} />
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#28C840' }} />
                <span className="mono-num ml-2 text-[11px]" style={{ color: '#6E7E99' }}>
                  thirdeye / gateway-flow
                </span>
                <span className="chip ml-auto !py-0.5 !text-[10px]" style={{ color: '#19D98A' }}>
                  <span className="h-1.5 w-1.5 rounded-full bg-[#19D98A] animate-pulseDot" /> LIVE GATEWAY
                </span>
              </div>
              <Image
                src="/hero_shield.jpg"
                alt="ThirdEye monitoring console"
                width={520}
                height={380}
                className="h-auto w-full object-cover"
                priority
              />
              {critical && (
                <div
                  className="absolute inset-x-3 bottom-3 sm:inset-x-4 sm:bottom-4 rounded-xl border p-3.5 backdrop-blur-xl"
                  style={{ borderColor: 'rgba(245,249,255,0.12)', background: 'rgba(4,11,22,0.85)' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full animate-pulseDot"
                        style={{ background: getRiskScore(critical) >= 81 ? '#FF4D5E' : '#19D98A' }}
                      />
                      <span className="truncate text-[13px] font-semibold text-white">{critical.name}</span>
                    </div>
                    <span
                      className="mono-num shrink-0 text-[13px] font-semibold"
                      style={{ color: getRiskScore(critical) >= 81 ? '#FF8090' : '#19D98A' }}
                    >
                      {getRiskScore(critical)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[12px]" style={{ color: '#8494AD' }}>
                    {critical.purpose} · {critical.status}
                  </p>
                </div>
              )}
            </div>
            <RiskLoop />
            <p className="mono-num mt-3 text-center text-[11.5px]" style={{ color: '#5B6B85' }}>
              StoreX Gateway · 1,420 requests verified today · 0 breach exposures
            </p>
          </div>
        </div>
      </section>

      {/* ── Live pulse: counters + event ticker ── */}
      <section
        className="console-full relative border-t py-10"
        style={{ borderColor: 'rgba(245,249,255,0.07)' }}
      >
        <Reveal>
          <div
            className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border lg:grid-cols-4"
            style={{ borderColor: 'rgba(245,249,255,0.09)', background: 'rgba(245,249,255,0.09)' }}
          >
            {[
              { v: items.length, l: 'integrations watched', f: (n: number) => `${n}` },
              {
                v: items.reduce((s, it) => s + (it.requestsPerMin ?? it.expected_request_rate ?? 0), 0),
                l: 'req/min scored live',
                f: (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`),
              },
              {
                v: items.filter(it => getRiskScore(it) >= 31).length,
                l: 'flagged right now',
                f: (n: number) => `${n}`,
              },
              {
                v: items.filter(it => it.status === 'QUARANTINED').length,
                l: 'quarantined',
                f: (n: number) => `${n}`,
              },
            ].map(({ v, l, f }) => (
              <div
                key={l}
                className="px-5 py-4 transition-colors duration-200 hover:bg-white/[0.03]"
                style={{ background: '#071426' }}
              >
                <div
                  className="mono-num text-[26px] font-bold text-white"
                  style={{ letterSpacing: '-0.02em' }}
                >
                  <CountUp value={v} format={f} />
                </div>
                <div className="mt-0.5 text-[12px]" style={{ color: '#8494AD' }}>
                  {l}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ── Partner wall (Cloudflare “trusted by” marquee) ── */}
      <section className="console-full border-t py-10" style={{ borderColor: 'rgba(245,249,255,0.07)' }}>
        <Reveal>
          <p
            className="text-center font-mono text-[11px] font-semibold uppercase"
            style={{ letterSpacing: '0.22em', color: '#5B6B85' }}
          >
            Guarding traffic for modern stacks
          </p>
          <div
            className="group relative mt-6 overflow-hidden"
            style={{
              maskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
              WebkitMaskImage: 'linear-gradient(to right, transparent, black 12%, black 88%, transparent)',
            }}
          >
            <div
              className="flex w-max items-center gap-12 pr-12 group-hover:[animation-play-state:paused]"
              style={{ animation: 'ticker 28s linear infinite' }}
            >
              {[
                'Stripe Payments',
                'Segment Analytics',
                'FedEx Shipping',
                'Klaviyo Marketing',
                'Zendesk Support',
                'StoreX Store',
                'Payments API',
                'Delivery API',
                ...[
                  'Stripe Payments',
                  'Segment Analytics',
                  'FedEx Shipping',
                  'Klaviyo Marketing',
                  'Zendesk Support',
                  'StoreX Store',
                  'Payments API',
                  'Delivery API',
                ],
              ].map((n, j) => (
                <span
                  key={`${n}-${j}`}
                  className="flex shrink-0 items-center gap-12 whitespace-nowrap text-[19px] font-bold"
                  style={{ color: j % 2 ? '#3D4A63' : '#7D8DA8', letterSpacing: '-0.02em' }}
                >
                  {n}
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: 'rgba(22,119,255,0.5)' }} />
                </span>
              ))}
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── How it works: 3-step StoreX integration flow ── */}
      <section
        id="how"
        className="console-full scroll-mt-20 border-t py-12 md:py-14"
        style={{ borderColor: 'rgba(245,249,255,0.07)' }}
      >
        <Reveal>
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-4">
              <p className="section-label-soft">How it works</p>
              <h2
                className="mt-2 text-[22px] sm:text-[26px] font-bold"
                style={{ letterSpacing: '-0.02em', lineHeight: 1.15 }}
              >
                StoreX Integration Journey
              </h2>
              <p className="mt-2 text-[14px] leading-relaxed" style={{ color: '#8494AD' }}>
                StoreX merchants connect partner integrations through our Marketplace or custom SDK. ThirdEye
                continuously verifies scope and intent on every request.
              </p>
              <Link
                href="/integrations"
                className="mt-4 inline-flex items-center gap-2 text-[13.5px] font-semibold text-[#5B9CFF]"
              >
                Browse Marketplace connectors <Icon d={paths.arrow} size={14} />
              </Link>
            </div>
            <ol
              className="grid gap-px overflow-hidden rounded-2xl border sm:grid-cols-3 lg:col-span-8"
              style={{ borderColor: 'rgba(245,249,255,0.08)', background: 'rgba(245,249,255,0.08)' }}
            >
              {[
                [
                  '1. Select Partner',
                  'Browse Payments, Delivery, Analytics & Marketing in the ThirdEye Marketplace.',
                  'Marketplace',
                ],
                [
                  '2. Route & Embed',
                  'Connect via Custom API Gateway or install lightweight @the-third-eye/sdk with your API key.',
                  'SDK / Gateway',
                ],
                [
                  '3. Protect & Grade',
                  'Score requests 0–100. Allow sales spikes (Black Friday), auto-block data leaks.',
                  'Graded Defense',
                ],
              ].map(([t, d, badge], i) => (
                <li
                  key={t}
                  className="group px-5 py-5 sm:px-6 sm:py-6 transition-colors duration-150 hover:bg-white/[0.02]"
                  style={{ background: '#071426' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="mono-num text-[12px]" style={{ color: '#5B9CFF' }}>
                      STEP 0{i + 1}
                    </div>
                    <span className="chip !text-[10px]">{badge}</span>
                  </div>
                  <div
                    className="mt-3 text-[15px] font-semibold text-white"
                    style={{ letterSpacing: '-0.01em' }}
                  >
                    {t}
                  </div>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: '#8494AD' }}>
                    {d}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        </Reveal>
      </section>

      {/* ── SDK & Developer Code Snippet Section ── */}
      <section
        className="console-full border-t py-12 md:py-14"
        style={{ borderColor: 'rgba(245,249,255,0.07)' }}
      >
        <Reveal>
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-10 items-center">
            <div className="lg:col-span-5">
              <p className="section-label-soft">Developer Experience</p>
              <h2
                className="mt-2 text-[22px] sm:text-[26px] font-bold"
                style={{ letterSpacing: '-0.02em', lineHeight: 1.15 }}
              >
                Zero-friction integration for developers.
              </h2>
              <p className="mt-3 text-[14.5px] leading-relaxed" style={{ color: '#A9B6CC' }}>
                Connect StoreX in 3 lines of code using <code>@the-third-eye/sdk</code> or point your HTTP
                client to ThirdEye Custom API Gateway: <code>https://gateway.thirdeye.sec</code>.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="chip">npm install @the-third-eye/sdk</span>
                <span className="chip">pip install thirdeye-sdk</span>
              </div>
            </div>
            <div className="lg:col-span-7">
              <CodeTypingPreview />
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Anyone can use ThirdEye: no-code, SDK, agent skill, docs ── */}
      <section
        id="everyone"
        className="console-full relative scroll-mt-20 overflow-hidden border-t py-12 md:py-16"
        style={{ borderColor: 'rgba(245,249,255,0.07)' }}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-0 h-[320px] w-[720px] -translate-x-1/2 rounded-full blur-[130px]"
          style={{ background: 'rgba(0,200,215,0.1)' }}
        />
        <Reveal>
          <div className="relative mx-auto max-w-2xl text-center">
            <p className="section-label-soft">Start anywhere</p>
            <h2
              className="mt-2 text-[24px] sm:text-[32px] font-bold text-white"
              style={{ letterSpacing: '-0.025em', lineHeight: 1.12 }}
            >
              If you can describe it,{' '}
              <span className="bg-gradient-to-r from-[#5B9CFF] via-[#00C8D7] to-[#19D98A] bg-clip-text text-transparent">
                you can secure it.
              </span>
            </h2>
            <p
              className="mx-auto mt-3 max-w-[58ch] text-[14.5px] sm:text-[15px] leading-relaxed"
              style={{ color: '#A9B6CC' }}
            >
              New to coding or shipping your tenth backend — ThirdEye meets you where you are. Click through
              the dashboard, drop in 3 lines of SDK, hand the skill to your AI agent, or follow the docs. Same
              trust layer underneath.
            </p>
          </div>
        </Reveal>
        <div className="relative mt-8 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: paths.grid,
              tint: '#5B9CFF',
              bg: 'rgba(22,119,255,0.12)',
              title: 'No code, no problem',
              body: 'Connect your store in the dashboard, pick partner APIs from the marketplace, and watch the trust table update live. Zero code required.',
              foot: 'Dashboard → Connect Project',
              href: '/integrations',
            },
            {
              icon: paths.cpu,
              tint: '#00C8D7',
              bg: 'rgba(0,200,215,0.1)',
              title: '3-line SDK',
              body: 'npm install @the-third-eye/sdk, paste your key, and every outbound call is scored against its trust profile before it leaves.',
              foot: 'npm i @the-third-eye/sdk',
              href: '/integrations',
            },
            {
              icon: paths.sparkles,
              tint: '#19D98A',
              bg: 'rgba(25,217,138,0.1)',
              title: 'Guides & API docs',
              body: 'Payload references, graded-response tables and the 4-phase demo script — everything a beginner needs to go from zero to quarantine.',
              foot: 'Read the docs',
              href: '/settings',
            },
          ].map((c, i) => (
            <Reveal key={c.title} delay={i * 90}>
              <Link
                href={c.href}
                className="group flex h-full flex-col rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-1"
                style={{ borderColor: 'rgba(245,249,255,0.09)', background: '#071426' }}
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: c.bg, color: c.tint }}
                >
                  <Icon d={c.icon} size={19} />
                </span>
                <span
                  className="mt-4 text-[16px] font-semibold text-white"
                  style={{ letterSpacing: '-0.01em' }}
                >
                  {c.title}
                </span>
                <span className="mt-1.5 flex-1 text-[13.5px] leading-relaxed" style={{ color: '#94A3B8' }}>
                  {c.body}
                </span>
                <span className="mono-num mt-4 text-[12px] font-semibold" style={{ color: c.tint }}>
                  {c.foot}{' '}
                  <span className="inline-block transition-transform duration-150 group-hover:translate-x-1">
                    →
                  </span>
                </span>
              </Link>
            </Reveal>
          ))}
        </div>
        {/* Agent skill spotlight */}
        <Reveal delay={120}>
          <div
            className="relative mt-4 overflow-hidden rounded-2xl border"
            style={{
              borderColor: 'rgba(246,130,31,0.35)',
              background: 'linear-gradient(180deg, rgba(246,130,31,0.08), rgba(246,130,31,0.02)), #0A1224',
            }}
          >
            <div className="grid gap-0 lg:grid-cols-2">
              <div className="p-6 sm:p-8">
                <span
                  className="chip !text-[10.5px] font-bold uppercase"
                  style={{
                    color: '#FBAD41',
                    borderColor: 'rgba(246,130,31,0.45)',
                    background: 'rgba(246,130,31,0.1)',
                    letterSpacing: '0.12em',
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-[#F6821F] animate-pulseDot" /> Agent skill
                </span>
                <h3
                  className="mt-3 text-[20px] sm:text-[24px] font-bold text-white"
                  style={{ letterSpacing: '-0.02em', lineHeight: 1.2 }}
                >
                  Give your AI agent the ThirdEye skill — it does the wiring.
                </h3>
                <p
                  className="mt-2 max-w-[52ch] text-[13.5px] sm:text-[14px] leading-relaxed"
                  style={{ color: '#A9B6CC' }}
                >
                  Drop the skill file into Claude Code, Cursor or Copilot and just describe what you want:
                  <em className="text-white not-italic font-medium">
                    {' '}
                    “score my checkout API with ThirdEye.”{' '}
                  </em>
                  Your agent registers the integration, routes calls through the gateway, and explains every
                  risk score back to you in plain English. No security background needed.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {['Claude Code', 'Cursor', 'Copilot', 'Windsurf'].map(a => (
                    <span key={a} className="chip !text-[11px]">
                      {a}
                    </span>
                  ))}
                </div>
              </div>
              <div
                className="border-t p-6 sm:p-8 lg:border-l lg:border-t-0"
                style={{ borderColor: 'rgba(245,249,255,0.08)', background: 'rgba(4,11,22,0.55)' }}
              >
                <div
                  className="mono-num text-[10.5px] font-semibold uppercase"
                  style={{ letterSpacing: '0.14em', color: '#6E7E99' }}
                >
                  SKILL.md — what your agent learns
                </div>
                <pre
                  className="mono-num mt-3 overflow-x-auto rounded-xl border p-4 text-[12px] leading-relaxed"
                  style={{
                    borderColor: 'rgba(245,249,255,0.1)',
                    background: 'rgba(0,0,0,0.5)',
                    color: '#B8C4D8',
                  }}
                >
                  {`# thirdeye skill
POST /api/check-request
  { integrationId, method,
    endpoint, dataRequested }

risk 0-100 →
  ALLOW · MONITOR
  RATE_LIMIT · BLOCK

critical? auto-quarantine.
explain the WHY,
never just the score.`}
                </pre>
                <div
                  className="mono-num mt-3 rounded-xl border border-dashed p-3.5 text-[12px] leading-relaxed"
                  style={{
                    borderColor: 'rgba(25,217,138,0.35)',
                    color: '#7EE2B0',
                    background: 'rgba(25,217,138,0.05)',
                  }}
                >
                  <span style={{ color: '#5B6B85' }}>you → agent:</span> “add ThirdEye scoring to my delivery
                  API”
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Topology ── */}
      <section
        id="architecture"
        className="console-full scroll-mt-20 border-t py-12 md:py-14"
        style={{ borderColor: 'rgba(245,249,255,0.07)' }}
      >
        <Reveal>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="max-w-2xl">
              <p className="section-label-soft">Topology</p>
              <h2
                className="mt-2 text-[22px] sm:text-[26px] font-bold"
                style={{ letterSpacing: '-0.02em', lineHeight: 1.15 }}
              >
                One map of everything your partners can reach.
              </h2>
              <p className="mt-2 text-[14.5px] sm:text-[15px] leading-relaxed" style={{ color: '#A9B6CC' }}>
                Store → ThirdEye → partners. Select a node to open its trust profile.
              </p>
            </div>
            <Link
              href="/integrations"
              className="btn-ghost shrink-0 w-full sm:w-auto justify-center !px-4 !py-2 !text-[13px]"
            >
              Open registry <Icon d={paths.arrow} size={14} />
            </Link>
          </div>
          <div className="panel mt-6 sm:mt-7 overflow-hidden transition-shadow duration-300 hover:shadow-[0_0_50px_-16px_rgba(22,119,255,0.4)]">
            <IntegrationMap
              items={
                items.length
                  ? items
                  : [
                      {
                        id: 'stripe_pay_001',
                        name: 'Stripe Payments',
                        purpose: 'Process tokenized card checkout payments',
                        status: 'ACTIVE',
                        riskScore: 8,
                        requestsPerMin: 150,
                        expected_request_rate: 150,
                        allowed_endpoints: ['/v1/charges', '/v1/refunds'],
                        allowed_methods: ['POST', 'GET'],
                        allowed_data: ['amount', 'currency', 'customer_id'],
                        forbidden_data: ['card_cvv', 'raw_password'],
                        lastActivity: '12s ago',
                      },
                      {
                        id: 'openai_agent_001',
                        name: 'OpenAI Agent Skill',
                        purpose: 'AI Agent tool executing store recommendations & cart actions',
                        status: 'ACTIVE',
                        riskScore: 45,
                        requestsPerMin: 220,
                        expected_request_rate: 200,
                        allowed_endpoints: ['/v1/chat/completions', '/agent/execute-tool'],
                        allowed_methods: ['POST'],
                        allowed_data: ['prompt_tokens', 'item_sku', 'quantity'],
                        forbidden_data: ['system_prompt_tokens', 'admin_secret_key'],
                        lastActivity: '5s ago',
                      },
                      {
                        id: 'klaviyo_marketing_001',
                        name: 'Klaviyo Marketing',
                        purpose: 'Send automated promotional order receipts and campaign emails',
                        status: 'ACTIVE',
                        riskScore: 75,
                        requestsPerMin: 310,
                        expected_request_rate: 80,
                        allowed_endpoints: ['/api/campaigns', '/api/subscribers'],
                        allowed_methods: ['POST'],
                        allowed_data: ['email', 'first_name'],
                        forbidden_data: ['credit_card', 'password_hash'],
                        lastActivity: '2s ago',
                      },
                      {
                        id: 'fedex_delivery_001',
                        name: 'FedEx Logistics',
                        purpose: 'Generate tracking numbers, shipping rates and order dispatches',
                        status: 'QUARANTINED',
                        riskScore: 92,
                        requestsPerMin: 850,
                        expected_request_rate: 100,
                        allowed_endpoints: ['/shipments/rates', '/shipments/dispatch'],
                        allowed_methods: ['GET', 'POST'],
                        allowed_data: ['order_id', 'shipping_address'],
                        forbidden_data: ['payment_info', 'customer_ssn'],
                        lastActivity: '1 min ago',
                      },
                    ]
              }
            />
          </div>
        </Reveal>
      </section>

      {/* ── Response tiers ── */}
      <section
        id="response"
        className="console-full scroll-mt-20 border-t py-12 md:py-14"
        style={{ borderColor: 'rgba(245,249,255,0.07)' }}
      >
        <Reveal>
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-4">
              <p className="section-label-soft">Graded response</p>
              <h2
                className="mt-2 text-[22px] sm:text-[26px] font-bold"
                style={{ letterSpacing: '-0.02em', lineHeight: 1.15 }}
              >
                Never just on or off.
              </h2>
              <p className="mt-2 text-[14.5px] sm:text-[15px] leading-relaxed" style={{ color: '#A9B6CC' }}>
                Cutting payments on a false alarm stops real money. Each tier shows its action and why.
              </p>
              <Link
                href="/simulator"
                className="mt-4 inline-flex items-center gap-2 text-[13.5px] font-semibold text-[#5B9CFF]"
              >
                Watch it escalate live <Icon d={paths.arrow} size={14} />
              </Link>
            </div>
            <div
              className="lg:col-span-8"
              onMouseEnter={() => setTierHold(true)}
              onMouseLeave={() => setTierHold(false)}
            >
              {/* Tier tabs */}
              <div
                className="grid grid-cols-2 gap-2 sm:grid-cols-4"
                role="tablist"
                aria-label="Response tiers"
              >
                {TIERS.map((t, i) => {
                  const active = i === tier;
                  return (
                    <button
                      key={t.tier}
                      role="tab"
                      aria-selected={active}
                      onClick={() => {
                        setTier(i);
                        setTierHold(true);
                      }}
                      className="relative overflow-hidden rounded-xl border px-4 py-3 text-left transition-all duration-200 active:scale-[0.98]"
                      style={
                        active
                          ? {
                              borderColor: `${t.color}66`,
                              background: `${t.color}14`,
                              boxShadow: `0 8px 32px -12px ${t.color}66`,
                            }
                          : { borderColor: 'rgba(245,249,255,0.08)', background: 'rgba(245,249,255,0.02)' }
                      }
                    >
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: t.color }} />
                        <span className="text-[13.5px] font-semibold text-white">{t.tier}</span>
                      </div>
                      <div className="mono-num mt-1 text-[11px]" style={{ color: '#6E7E99' }}>
                        {t.range}
                      </div>
                      {active && !tierHold && (
                        <span
                          key={tier}
                          className="absolute bottom-0 left-0 h-[2px]"
                          style={{ background: t.color, animation: 'tierProgress 4.5s linear forwards' }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              {/* Tier detail */}
              <div
                key={tier}
                className="mt-3 overflow-hidden rounded-2xl border p-6 sm:p-7"
                style={{
                  borderColor: 'rgba(245,249,255,0.08)',
                  background: '#071426',
                  animation: 'riskPop 0.4s cubic-bezier(0.23,1,0.32,1)',
                }}
              >
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="mono-num text-[15px] font-bold" style={{ color: TIERS[tier].color }}>
                    {TIERS[tier].range}
                  </span>
                  <span className="text-[22px] font-bold text-white" style={{ letterSpacing: '-0.02em' }}>
                    {TIERS[tier].tier}
                  </span>
                  <span
                    className="chip !text-[11px]"
                    style={{ color: TIERS[tier].color, borderColor: `${TIERS[tier].color}55` }}
                  >
                    {TIERS[tier].action}
                  </span>
                </div>
                <p className="mt-2 max-w-[60ch] text-[14px] leading-relaxed" style={{ color: '#A9B6CC' }}>
                  {TIERS[tier].desc}
                </p>
                <div
                  className="mt-5 h-2.5 overflow-hidden rounded-full"
                  style={{ background: 'rgba(245,249,255,0.08)' }}
                >
                  <div
                    className="risk-fill h-full rounded-full"
                    style={{
                      width: `${[15, 45, 70, 92][tier]}%`,
                      background: `linear-gradient(90deg, #19D98A, #FFC42E, ${TIERS[tier].color})`,
                    }}
                  />
                </div>
                <div
                  className="mono-num mt-2 flex justify-between text-[10.5px]"
                  style={{ color: '#5B6B85' }}
                >
                  <span>0</span>
                  <span>RISK SCORE</span>
                  <span>100</span>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Audit + context ── */}
      <section
        id="audit"
        className="console-full scroll-mt-20 border-t py-12 md:py-14"
        style={{ borderColor: 'rgba(245,249,255,0.07)' }}
      >
        <Reveal>
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="panel p-6 sm:p-7">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-[10px]"
                style={{ background: 'rgba(22,119,255,0.12)', color: '#5B9CFF' }}
              >
                <Icon d={paths.shield} size={18} />
              </div>
              <h3
                className="mt-4 text-[18px] sm:text-[19px] font-semibold text-white"
                style={{ letterSpacing: '-0.015em' }}
              >
                Tamper-evident audit
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed" style={{ color: '#A9B6CC' }}>
                Every violation and quarantine is hash-chained. Verify integrity in one click for auditors.
              </p>
              <div
                className="mono-num mt-4 rounded-xl border p-3.5 sm:p-4 text-[11.5px] sm:text-[12px] leading-relaxed overflow-x-auto"
                style={{
                  borderColor: 'rgba(245,249,255,0.08)',
                  background: 'rgba(4,11,22,0.6)',
                  color: '#00C8D7',
                }}
              >
                <div>genesis 000000…0000</div>
                <div>latest&nbsp;&nbsp; c5f886…194c6f</div>
                <div style={{ color: '#19D98A' }}>integrity INTACT</div>
              </div>
              <Link
                href="/events"
                className="mt-4 inline-flex items-center gap-2 text-[13.5px] font-semibold text-[#5B9CFF]"
              >
                Inspect activity <Icon d={paths.arrow} size={14} />
              </Link>
            </div>
            <div className="panel p-6 sm:p-7">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-[10px]"
                style={{ background: 'rgba(0,200,215,0.1)', color: '#00C8D7' }}
              >
                <Icon d={paths.clock} size={18} />
              </div>
              <h3
                className="mt-4 text-[18px] sm:text-[19px] font-semibold text-white"
                style={{ letterSpacing: '-0.015em' }}
              >
                Context prevents false alarms
              </h3>
              <p className="mt-2 text-[14px] leading-relaxed" style={{ color: '#A9B6CC' }}>
                Black Friday traffic is expected. Context relieves 20 points so volume alone never blocks
                revenue.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {['Black Friday', 'Campaign launch', 'Known spike'].map(tag => (
                  <span key={tag} className="chip">
                    {tag}
                  </span>
                ))}
              </div>
              <Link
                href="/settings"
                className="mt-4 inline-flex items-center gap-2 text-[13.5px] font-semibold text-[#5B9CFF]"
              >
                Configure context <Icon d={paths.arrow} size={14} />
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── CTA ── */}
      <section
        className="console-full border-t py-12 md:py-14"
        style={{ borderColor: 'rgba(245,249,255,0.07)' }}
      >
        <Reveal>
          <div
            className="panel relative flex flex-col items-start justify-between gap-6 overflow-hidden p-6 sm:p-8 md:p-10 lg:flex-row lg:items-center"
            style={{
              background: 'linear-gradient(180deg, rgba(22,119,255,0.1), rgba(22,119,255,0.02)), #0A172E',
            }}
          >
            <div
              className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-[100px]"
              style={{
                background: 'rgba(91,80,230,0.35)',
                animation: 'auroraA 12s ease-in-out infinite alternate',
              }}
            />
            <div>
              <p className="section-label-soft">Demo in one click</p>
              <h2 className="mt-2 text-[22px] sm:text-[26px] font-bold" style={{ letterSpacing: '-0.02em' }}>
                See the compromise happen live.
              </h2>
              <p className="mt-2 text-[14.5px] sm:text-[15px]" style={{ color: '#A9B6CC' }}>
                Four phases. Watch 8 → 45 → 75 → 95, then quarantine.
              </p>
            </div>
            <div className="relative flex shrink-0 flex-col sm:flex-row w-full sm:w-auto gap-3">
              <Link
                href="/dashboard"
                className="btn-accent cf-shine w-full sm:w-auto justify-center !px-6 !py-3 !text-[14px] transition-all duration-200 hover:brightness-110"
              >
                Open console
              </Link>
              <Link
                href="/simulator"
                className="btn-ghost w-full sm:w-auto justify-center !px-6 !py-3 !text-[14px]"
              >
                Run simulator
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <footer
        className="console-full relative border-t pt-14 pb-6"
        style={{ borderColor: 'rgba(245,249,255,0.07)' }}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(22,119,255,0.5), rgba(0,200,215,0.4), transparent)',
          }}
        />
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          {/* Brand block */}
          <div className="sm:col-span-2 lg:col-span-4">
            <Link href="/" className="group inline-flex items-center gap-3" aria-label="ThirdEye home">
              <Image
                src="/logo.jpeg"
                alt="ThirdEye"
                width={120}
                height={36}
                className="h-9 w-auto object-contain transition-transform duration-150 group-active:scale-95"
              />
              <span className="leading-none">
                <span className="block text-[17px] font-bold text-white" style={{ letterSpacing: '-0.02em' }}>
                  ThirdEye
                </span>
                <span
                  className="mt-1 block text-[10px] font-medium"
                  style={{ letterSpacing: '0.14em', color: '#6E7E99' }}
                >
              
                </span>
              </span>
            </Link>
            <p className="mt-4 max-w-[38ch] text-[13.5px] leading-relaxed" style={{ color: '#8494AD' }}>
              The continuous trust layer for third-party integrations. Declared purpose + approved scope +
              actual behaviour — one score, graded response.
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <span className="chip !text-[11px]" style={{ color: live ? '#19D98A' : '#8B9BB4' }}>
                <span
                  className={`h-1.5 w-1.5 rounded-full ${live ? 'bg-[#19D98A] animate-pulseDot' : 'bg-[#5B6B85]'}`}
                />
                {live ? 'Engine live' : 'Demo mode'}
              </span>
              <Link href="/simulator" className="btn-accent cf-shine !px-4 !py-1.5 !text-[12px]">
                <Icon d={paths.play} size={13} /> Run live demo
              </Link>
            </div>
          </div>
          {/* Link columns */}
          {[
            [
              'Product',
              [
                ['Live console', '/dashboard'],
                ['Integrations', '/integrations'],
                ['Attack simulator', '/simulator'],
                ['Activity timeline', '/events'],
              ],
            ],
            [
              'Developers',
              [
                ['Marketplace', '/integrations'],
                ['API & SDK keys', '/settings'],
                ['Gateway endpoint', '/settings'],
                ['Trust profiles', '/integrations'],
              ],
            ],
            [
              'Explore',
              [
                ['How it works', '/#how'],
                ['Topology', '/#architecture'],
                ['Graded response', '/#response'],
                ['Audit model', '/#audit'],
              ],
            ],
          ].map(([title, links]) => (
            <div key={title as string} className="lg:col-span-2">
              <h4
                className="font-mono text-[11px] font-semibold uppercase"
                style={{ letterSpacing: '0.18em', color: '#5B6B85' }}
              >
                {title}
              </h4>
              <ul className="mt-4 space-y-1">
                {(links as [string, string][]).map(([label, href]) => (
                  <li key={label}>
                    <Link
                      href={href}
                      className="group/link inline-flex items-center gap-0 text-[13.5px] transition-all duration-150 hover:translate-x-0.5 hover:text-white"
                      style={{ color: '#A9B6CC' }}
                    >
                      <span className="max-w-0 overflow-hidden text-[#5B9CFF] opacity-0 transition-all duration-150 group-hover/link:max-w-3 group-hover/link:opacity-100">
                        →&nbsp;
                      </span>
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {/* Risk-scale mini card */}
          <div className="sm:col-span-2 lg:col-span-2">
            <h4
              className="font-mono text-[11px] font-semibold uppercase"
              style={{ letterSpacing: '0.18em', color: '#5B6B85' }}
            >
              Response
            </h4>
            <div className="mt-4 space-y-2">
              {[
                ['Trusted', '#19D98A', 'Allow'],
                ['Suspicious', '#FFC42E', 'Monitor'],
                ['High risk', '#FF9F2E', 'Throttle'],
                ['Critical', '#FF4D5E', 'Quarantine'],
              ].map(([label, color, action]) => (
                <div key={label} className="flex items-center gap-2 text-[12px]">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: color }} />
                  <span className="font-medium text-white">{label}</span>
                  <span className="ml-auto" style={{ color: '#6E7E99' }}>
                    {action}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
        {/* Bottom bar */}
        <div
          className="mt-10 flex flex-col items-start justify-between gap-3 border-t pt-5 text-[12px] sm:flex-row sm:items-center"
          style={{ borderColor: 'rgba(245,249,255,0.07)', color: '#6E7E99' }}
        >
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#19D98A] animate-pulseDot" />
            ThirdEye · Continuous Integration Security
          </span>
          <span className="mono-num hidden text-[11px] md:inline" style={{ color: '#475569' }}>
            purpose + scope + behaviour → trust
          </span>
          <span>Zero-Trust Architecture · Cryptographically Verified</span>
        </div>
      </footer>
    </div>
  );
}
