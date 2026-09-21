'use client';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BootLoader, LiveClock } from '@/components/chrome';
import { Icon, paths } from '@/components/icons';
import { NotificationToastContainer, showToast } from '@/components/NotificationToast';
import { checkEngineHealth } from '@/lib/api';
const NAV = [
  { href: '/dashboard', label: 'Overview' },
  { href: '/integrations', label: 'Integrations' },
  { href: '/events', label: 'Activity' },
  { href: '/simulator', label: 'Simulator' },
  { href: '/settings', label: 'Settings' },
  { href: '/docs', label: 'Docs', external: true },
];

export function useDevMode() {
  const [devMode, setDevModeState] = useState(false);
  useEffect(() => {
    try {
      setDevModeState(localStorage.getItem('te-dev-mode') === 'true');
    } catch {
      /* SSR */
    }
    const onStorage = () => {
      try {
        setDevModeState(localStorage.getItem('te-dev-mode') === 'true');
      } catch {
        /* SSR */
      }
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('te-dev-mode-change', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('te-dev-mode-change', onStorage);
    };
  }, []);
  return devMode;
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [booted, setBooted] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [engineOnline, setEngineOnline] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [devMode, setDevMode] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [search, setSearch] = useState('');
  const [logoOk, setLogoOk] = useState(true);

  useEffect(() => {
    try {
      setDevMode(localStorage.getItem('te-dev-mode') === 'true');
    } catch {
      /* SSR */
    }
  }, []);

  const toggleDevMode = () => {
    const next = !devMode;
    setDevMode(next);
    try {
      localStorage.setItem('te-dev-mode', String(next));
      window.dispatchEvent(new Event('te-dev-mode-change'));
    } catch {
      /* SSR */
    }
    showToast(
      next ? 'Activated' : 'Deactivated',
      '',
      next ? 'info' : 'success'
    );
  };

  useEffect(() => {
    const id = setTimeout(() => setBooted(true), 2800);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    const ping = async () => {
      const ok = await checkEngineHealth();
      setEngineOnline(ok);
    };
    ping();
    const interval = setInterval(ping, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [path]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Landing, Docs, and ChatGPT story page own their navigation and layout — no dashboard console chrome.
  if (path === '/' || path?.startsWith('/docs') || path === '/chatgpt') {
    return (
      <>
        <BootLoader done={booted} />
        <NotificationToastContainer />
        {children}
      </>
    );
  }

  return (
    <>
      <BootLoader done={booted} />
      <NotificationToastContainer />

      <div className="min-h-screen w-full max-w-[100vw] overflow-x-clip bg-[#12131C] text-[#F2F4F8] md:flex">
        {/* Mobile overlay */}
        {mobileOpen && (
          <button
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
          />
        )}
        {/* ═══ LEFT VERTICAL SIDEBAR — fixed full-height, no horizontal scroll ═══ */}
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex h-screen max-h-screen w-64 shrink-0 flex-col justify-between overflow-y-auto overflow-x-hidden border-r border-white/5 bg-[#161726] p-5 transition-transform duration-200 md:translate-x-0 ${
            mobileOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="min-h-0">
            {/* Top Brand Logo — raw ThirdEye mark, no container */}
            <Link
              href="/dashboard"
              className="group mb-8 flex items-center gap-3 px-2 py-2"
              aria-label="ThirdEye dashboard"
            >
              {logoOk ? (
                <Image
                  src="/logo.jpeg"
                  alt="ThirdEye"
                  width={120}
                  height={40}
                  style={{ width: 'auto', height: 'auto' }}
                  className="h-10 w-auto object-contain transition-transform group-active:scale-95"
                  onError={() => setLogoOk(false)}
                  priority
                />
              ) : (
                <span className="text-white">
                  <Icon d={paths.shield} size={28} />
                </span>
              )}
              <span className="leading-none">
                <span className="block text-[18px] font-bold tracking-tight text-white">ThirdEye</span>
                <span className="mt-0.5 block text-[10px] font-medium tracking-[0.08em] text-[#8E92A4]">
                  TRUST LAYER
                </span>
              </span>
            </Link>

            {/* Vertical Navigation Links */}
            <nav className="space-y-1.5" aria-label="Sidebar console navigation">
              {NAV.map(n => {
                const active = path === n.href || path?.startsWith(`${n.href}/`);
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    target={n.external ? '_blank' : undefined}
                    rel={n.external ? 'noopener noreferrer' : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={`group flex items-center gap-3.5 rounded-xl px-4 py-3 text-[14px] font-medium transition-all ${
                      active
                        ? 'bg-[#5B50E6] text-white font-semibold shadow-lg shadow-[#5B50E6]/40'
                        : 'text-[#8E92A4] hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <Icon
                      d={
                        n.href === '/dashboard'
                          ? paths.grid
                          : n.href === '/integrations'
                            ? paths.layers
                            : n.href === '/events'
                              ? paths.activity
                              : n.href === '/simulator'
                                ? paths.zap
                                : n.href === '/docs'
                                  ? paths.book
                                  : paths.lock
                      }
                      size={18}
                    />
                    <span>{n.label}</span>
                    {n.external && (
                      <span className="ml-auto text-[#8E92A4] group-hover:text-white transition-colors">
                        <Icon d={paths.external} size={13} />
                      </span>
                    )}
                    {n.href === '/events' && !engineOnline && (
                      <span
                        className="ml-auto h-1.5 w-1.5 rounded-full bg-[#FFC42E]"
                        title="Security engine syncing"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Bottom Controls & User Profile */}
          <div className="mt-8 pt-4 border-t border-white/10 space-y-3">
            <button
              onClick={toggleDevMode}
              className={`w-full flex items-center justify-between rounded-xl px-3.5 py-2.5 text-[12px] font-semibold border transition-all ${
                devMode
                  ? 'border-[#5B50E6] bg-[#5B50E6]/20 text-white'
                  : 'border-white/10 bg-white/5 text-[#8E92A4]'
              }`}
            >
              <span>Dev Mode</span>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold ${devMode ? 'bg-[#5B50E6] text-white' : 'bg-white/10 text-white/70'}`}
              >
                {devMode ? 'ON' : 'OFF'}
              </span>
            </button>

            <div className="flex items-center gap-3 px-2 py-1">
              <div className="h-9 w-9 shrink-0 rounded-full bg-gradient-to-tr from-[#5B50E6] to-[#00CEC9] flex items-center justify-center text-white font-bold text-[13px]">
                TS
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-semibold text-white truncate">Tim @ StoreX</div>
                <div className="text-[11px] text-[#8E92A4] truncate">tim.sec@storex.store</div>
              </div>
              <span
                className={`h-2 w-2 shrink-0 rounded-full ${engineOnline ? 'bg-[#19D98A]' : 'bg-[#FFC42E]'}`}
                title={engineOnline ? 'Engine online' : 'Engine offline'}
              />
            </div>
          </div>
        </aside>

        {/* ═══ MAIN CONTENT AREA + TOP HEADER BAR — offset for fixed sidebar ═══ */}
        <div className="flex min-h-screen w-full min-w-0 max-w-full flex-1 flex-col overflow-x-clip md:pl-64">
          {/* Top Header Bar */}
          <header
            className={`sticky top-0 z-20 border-b border-white/5 bg-[#161726]/80 px-4 py-3 backdrop-blur-md transition-shadow sm:px-6 sm:py-4 ${scrolled ? 'shadow-[0_12px_32px_-16px_rgba(0,0,0,0.8)]' : ''}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  onClick={() => setMobileOpen(true)}
                  aria-label="Open menu"
                  className="rounded-xl border border-white/10 bg-white/5 p-2 text-[#B8C4D8] md:hidden"
                >
                  <Icon d={paths.grid} size={16} />
                </button>
                <h1 className="truncate text-[20px] font-bold tracking-tight text-white sm:text-[24px]">
                  {path === '/dashboard'
                    ? 'Dashboard'
                    : path === '/integrations'
                      ? 'Integrations Marketplace'
                      : path?.startsWith('/integrations/')
                        ? 'Trust Profile'
                        : path === '/events'
                          ? 'Security Events Stream'
                          : path === '/simulator'
                            ? 'Attack Simulator'
                            : 'Settings & Gateway Policies'}
                </h1>
              </div>

              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <form
                  className="relative hidden w-56 sm:block lg:w-64"
                  onSubmit={e => {
                    e.preventDefault();
                    const q = search.trim();
                    router.push(q ? `/integrations?q=${encodeURIComponent(q)}` : '/integrations');
                    setMobileOpen(false);
                  }}
                >
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    type="text"
                    placeholder="Search APIs or logs…"
                    aria-label="Search integrations"
                    className="w-full rounded-full border border-white/10 bg-[#1C1D2A] px-4 py-2 pl-9 text-[13px] text-white outline-none placeholder:text-[#8E92A4] focus:border-[#5B50E6]"
                  />
                  <span className="absolute left-3 top-2.5 text-[#8E92A4]">
                    <Icon d={paths.grid} size={14} />
                  </span>
                </form>
                <span className="hidden lg:inline-flex">
                  <LiveClock />
                </span>
                <span
                  className={`chip !text-[11px] ${engineOnline ? '!border-[#10B981]/30 !bg-[#10B981]/10 !text-[#10B981]' : '!border-[#FFC42E]/30 !bg-[#FFC42E]/10 !text-[#FFC42E]'}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full animate-pulse ${engineOnline ? 'bg-[#10B981]' : 'bg-[#FFC42E]'}`}
                  />
                  {engineOnline ? 'Shield Active' : 'Demo'}
                </span>
                {devMode && (
                  <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-[#00CEC9]/40 bg-[#00CEC9]/10 px-3 py-1 text-[11px] font-mono font-bold text-[#00CEC9] shadow-sm shadow-[#00CEC9]/20 animate-pulse">
                    <span>DEV MODE ACTIVE</span>
                    <span className="opacity-60 text-[10px]">| p99: 0.8ms</span>
                  </span>
                )}
              </div>
            </div>
            {/* Mobile search */}
            <form
              className="mt-3 sm:hidden"
              onSubmit={e => {
                e.preventDefault();
                const q = search.trim();
                router.push(q ? `/integrations?q=${encodeURIComponent(q)}` : '/integrations');
              }}
            >
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                type="text"
                placeholder="Search APIs or logs…"
                aria-label="Search integrations"
                className="w-full rounded-xl border border-white/10 bg-[#1C1D2A] px-4 py-2 text-[13px] text-white outline-none placeholder:text-[#8E92A4] focus:border-[#5B50E6]"
              />
            </form>
          </header>

          <main className="w-full min-w-0 max-w-full flex-1 overflow-x-clip p-4 sm:p-6 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
