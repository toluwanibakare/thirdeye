'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon, paths } from './icons';

export function StatCard({
  label,
  value,
  sub,
  tone = 'neutral',
  delta,
}: {
  label: string;
  value: string | number;
  sub: string;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
  delta?: string;
}) {
  const accent =
    tone === 'good' ? '#19D98A' : tone === 'warn' ? '#FFC42E' : tone === 'bad' ? '#FF4D5E' : '#1677FF';
  const bgTint =
    tone === 'good'
      ? 'rgba(25,217,138,0.12)'
      : tone === 'warn'
        ? 'rgba(255,196,46,0.12)'
        : tone === 'bad'
          ? 'rgba(255,77,94,0.12)'
          : 'rgba(22,119,255,0.12)';
  const iconD =
    tone === 'good' ? paths.eye : tone === 'warn' ? paths.pulse : tone === 'bad' ? paths.alert : paths.layers;
  return (
    <div className="stat-card">
      <div className="flex items-start justify-between gap-3">
        <span className="stat-card__label">{label}</span>
        <span className="stat-card__icon" style={{ background: bgTint, color: accent }}>
          <Icon d={iconD} size={17} />
        </span>
      </div>
      <div className="mt-2.5 flex items-end justify-between gap-3">
        <span className="stat-card__value" style={{ color: accent }}>
          {value}
        </span>
        {delta && (
          <span
            className="chip"
            style={{ color: accent, borderColor: `${accent}33`, background: `${accent}0D` }}
          >
            {delta}
          </span>
        )}
      </div>
      <div className="stat-card__sub mt-1">{sub}</div>
      <div
        className="absolute bottom-0 left-0 right-0 h-[3px] rounded-b-2xl"
        style={{ background: `linear-gradient(90deg, ${accent}44, ${accent}11, transparent)` }}
      />
    </div>
  );
}

export function LiveClock() {
  const [t, setT] = useState('');
  useEffect(() => {
    const f = () => setT(new Date().toLocaleTimeString('en-GB', { hour12: false }));
    f();
    const id = setInterval(f, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="liquid-glass mono-num hidden items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium text-[#B8C4D8] sm:inline-flex">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#19D98A] animate-pulseDot" />
      {t} WAT
    </span>
  );
}

export function BootLoader({ done }: { done?: boolean }) {
  const [show, setShow] = useState(true);
  const [fading, setFading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const finish = useCallback(() => {
    setFading(true);
    setTimeout(() => {
      setShow(false);
    }, 250);
  }, []);

  useEffect(() => {
    if (done && !fading) {
      // Allow video to complete naturally or fade out if done
      const t = setTimeout(finish, 100);
      return () => clearTimeout(t);
    }
  }, [done, fading, finish]);

  useEffect(() => {
    // Fail-safe max timeout to ensure page is unblocked even if video fails to play
    const fallback = setTimeout(() => {
      finish();
    }, 1100);
    return () => clearTimeout(fallback);
  }, [finish]);

  if (!show) return null;

  return (
    <div
      className={`fixed inset-0 z-[99999] flex h-screen w-screen items-center justify-center bg-[#020617] transition-opacity duration-300 ease-out ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{ backgroundColor: '#020617' }}
    >
      {/* Subtle radial cyan glow overlay inside opaque container */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at center, rgba(0, 206, 201, 0.16) 0%, rgba(14, 165, 233, 0.08) 35%, transparent 70%)',
        }}
      />

      {/* Subtle cyan ambient glow orb behind the video */}
      <div className="absolute h-56 w-56 rounded-full bg-[#00CEC9]/15 blur-3xl pointer-events-none sm:h-72 sm:w-72 md:h-96 md:w-96" />

      {/* Animated ThirdEye logo video centered seamlessly on dark background */}
      <video
        ref={videoRef}
        src="/loading.webm"
        autoPlay
        muted
        playsInline
        preload="auto"
        onPlay={() => {
          if (videoRef.current) videoRef.current.playbackRate = 1.8;
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) videoRef.current.playbackRate = 1.8;
        }}
        onEnded={finish}
        className="relative z-10 h-36 w-36 object-contain sm:h-40 sm:w-40 md:h-48 md:w-48 [filter:invert(1)_hue-rotate(180deg)] [mix-blend-mode:screen]"
      />
    </div>
  );
}

export function EmptyState({
  title,
  body,
  icon = 'grid',
}: {
  title: string;
  body: string;
  icon?: keyof typeof paths;
}) {
  return (
    <div className="section-card flex flex-col items-center py-10">
      <span
        className="flex h-11 w-11 items-center justify-center rounded-xl shadow-sm"
        style={{ background: 'rgba(22,119,255,0.14)', color: '#5B9CFF' }}
      >
        <Icon d={paths[icon]} size={19} />
      </span>
      <div className="h-section mt-4">{title}</div>
      <div className="section-sub-soft mt-1.5 max-w-sm text-center">{body}</div>
    </div>
  );
}
