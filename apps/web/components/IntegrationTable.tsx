'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useDevMode } from '@/app/shell';
import { getCurrentRate, getRiskScore, riskColor, timeAgo } from '@/lib/api';
import type { IntegrationRow } from '@/lib/api';
import { RiskBadge, StatusDot } from './RiskBadge';
import { EmptyState } from './chrome';
import { showToast } from './NotificationToast';

export function IntegrationTable({
  items,
  quarantining = null,
  onQuarantine,
  onRelease,
  compact = false,
}: {
  items: IntegrationRow[];
  quarantining?: string | null;
  onQuarantine?: (id: string) => void;
  onRelease?: (id: string) => void;
  compact?: boolean;
}) {
  const devMode = useDevMode();
  const [inspectItem, setInspectItem] = useState<IntegrationRow | null>(null);

  if (!items.length) {
    return (
      <EmptyState
        title="No integrations found"
        body="No third-party integrations are registered yet. Connect one from the marketplace."
      />
    );
  }

  const rows = compact ? items.slice(0, 5) : items;

  return (
    <div className="overflow-x-auto">
      <table className="data-table">
        <thead>
          <tr className="data-table__head">
            <th className="data-table__cell font-semibold">Integration</th>
            <th className="data-table__cell font-semibold hidden lg:table-cell">Purpose</th>
            <th className="data-table__cell font-semibold text-right whitespace-nowrap">Req/min</th>
            <th className="data-table__cell font-semibold whitespace-nowrap">Risk</th>
            <th className="data-table__cell font-semibold whitespace-nowrap">Status</th>
            <th className="data-table__cell font-semibold hidden md:table-cell whitespace-nowrap">Last activity</th>
            <th className="data-table__cell font-semibold text-right whitespace-nowrap">Action</th>
          </tr>
        </thead>
        <tbody className="data-table__divider divide-y">
          {rows.map(it => {
            const score = getRiskScore(it);
            const rate = getCurrentRate(it);
            const c = riskColor(score);
            const isQ = it.status === 'QUARANTINED';
            const busy = quarantining === it.id;
            return (
              <tr key={it.id} className="data-table__row">
                <td className="data-table__cell">
                  <Link href={`/integrations/${it.id}`} className="group block min-w-0">
                    <div className="truncate text-[13.5px] font-semibold text-[#F5F9FF] group-hover:text-[#5B9CFF]">
                      {it.name}
                    </div>
                    <div className="mono-num truncate text-[11px] text-[#64748B]">
                      {it.id}
                      {devMode && (
                        <span className="ml-2 font-mono text-[10px] text-[#00CEC9] bg-[#00CEC9]/10 px-1.5 py-0.5 rounded border border-[#00CEC9]/20">
                          /api/proxy/{it.id}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 lg:hidden truncate text-[12px] text-[#94A3B8]">{it.purpose}</div>
                  </Link>
                </td>
                <td className="data-table__cell hidden lg:table-cell max-w-[220px]">
                  <span className="line-clamp-2 text-[12.5px] text-[#94A3B8]">{it.purpose}</span>
                </td>
                <td className="data-table__cell text-right whitespace-nowrap">
                  <span className="mono-num text-[13px] font-bold tabular-nums text-[#F5F9FF]">{rate}</span>
                  <span className="mono-num text-[11px] text-[#64748B]">/min</span>
                  {rate > 500 && (
                    <span
                      className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full animate-pulseDot align-middle"
                      style={{ background: c }}
                    />
                  )}
                </td>
                <td className="data-table__cell whitespace-nowrap">
                  <RiskBadge score={score} size="sm" />
                </td>
                <td className="data-table__cell whitespace-nowrap">
                  <StatusDot status={it.status} />
                </td>
                <td className="data-table__cell hidden md:table-cell whitespace-nowrap">
                  <span className="mono-num text-[12px] text-[#94A3B8]">
                    {it.lastActivity && !it.lastActivity.includes('T')
                      ? it.lastActivity
                      : (() => {
                          try {
                            return timeAgo(
                              it.lastActivity ?? it.updated_at ?? it.updatedAt ?? new Date().toISOString()
                            );
                          } catch {
                            return 'just now';
                          }
                        })()}
                  </span>
                </td>
                <td className="data-table__cell text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {devMode && (
                      <button
                        onClick={() => setInspectItem(it)}
                        className="rounded-lg border border-[#00CEC9]/40 bg-[#00CEC9]/10 px-2.5 py-1.5 font-mono text-[11px] font-bold text-[#00CEC9] transition-colors hover:bg-[#00CEC9]/20"
                        title="Dev Mode cURL & SDK Inspector"
                      >
                        cURL
                      </button>
                    )}
                    <Link
                      href={`/integrations/${it.id}`}
                      className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11.5px] font-semibold text-[#B8C4D8] transition-colors hover:border-[#5B50E6] hover:text-white"
                    >
                      View
                    </Link>
                    {isQ ? (
                      <button
                        onClick={() => onRelease?.(it.id)}
                        disabled={busy}
                        className="rounded-lg border border-[#19D98A]/30 bg-[#19D98A]/10 px-2.5 py-1.5 text-[11.5px] font-semibold text-[#19D98A] transition-colors hover:bg-[#19D98A]/20 disabled:opacity-50"
                      >
                        {busy ? '…' : 'Activate'}
                      </button>
                    ) : (
                      <button
                        onClick={() => onQuarantine?.(it.id)}
                        disabled={busy}
                        className="rounded-lg border border-[#FF4D5E]/30 bg-[#FF4D5E]/10 px-2.5 py-1.5 text-[11.5px] font-semibold text-[#FF8090] transition-colors hover:bg-[#FF4D5E]/20 disabled:opacity-50"
                      >
                        {busy ? '…' : 'Deactivate'}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {compact && items.length > 5 && (
        <div className="border-t px-5 py-3" style={{ borderColor: 'rgba(245,249,255,0.08)' }}>
          <Link
            href="/integrations"
            className="font-mono text-[11.5px] font-semibold text-[#5B9CFF] hover:underline"
          >
            View all {items.length} integrations →
          </Link>
        </div>
      )}

      {/* DEV MODE cURL INSPECTOR MODAL */}
      {inspectItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-xl rounded-3xl border border-[#00CEC9]/30 bg-[#12131C] p-6 shadow-2xl shadow-[#00CEC9]/20 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-mono font-bold text-[#00CEC9] uppercase tracking-wider">⚡ DEV MODE cURL INSPECTOR</span>
                <span className="chip !text-[10px] !border-white/10 !bg-white/5 !text-white">{inspectItem.name}</span>
              </div>
              <button
                onClick={() => setInspectItem(null)}
                className="text-[#8E92A4] hover:text-white font-mono text-[16px]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-[12px] text-[#8E92A4]">
                Proxy route for <strong className="text-white">{inspectItem.name}</strong> (`{inspectItem.id}`). Send HTTP requests through ThirdEye Gateway for real-time risk verification:
              </p>

              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-[#8E92A4] mb-1">
                  <span>cURL Command</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`curl -X POST http://localhost:3000/api/proxy/${inspectItem.id} \\
  -H "Authorization: Bearer te_live_storex_99a8b7c6" \\
  -H "Content-Type: application/json" \\
  -d '{"action": "verify", "data": {"provider": "${inspectItem.id}"}}'`);
                      showToast('Copied to Clipboard', 'cURL command ready to run in terminal.', 'success');
                    }}
                    className="text-[#00CEC9] hover:underline"
                  >
                    Copy cURL
                  </button>
                </div>
                <pre className="rounded-xl border border-white/10 bg-[#0B0C14] p-3 text-[12px] font-mono text-[#10B981] overflow-x-auto whitespace-pre-wrap">
{`curl -X POST http://localhost:3000/api/proxy/${inspectItem.id} \\
  -H "Authorization: Bearer te_live_storex_99a8b7c6" \\
  -H "Content-Type: application/json" \\
  -d '{"action": "verify", "data": {"provider": "${inspectItem.id}"}}'`}
                </pre>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-[#8E92A4] mb-1">
                  <span>Node.js SDK (`@the-third-eye/sdk`)</span>
                </div>
                <pre className="rounded-xl border border-white/10 bg-[#0B0C14] p-3 text-[12px] font-mono text-[#5B9CFF] overflow-x-auto whitespace-pre-wrap">
{`import { ThirdEye } from '@the-third-eye/sdk';

const thirdeye = new ThirdEye({ apiKey: 'te_live_storex_99a8b7c6' });
const decision = await thirdeye.guard({
  integration: '${inspectItem.id}',
  payload: { amount: 49.99, currency: 'USD' }
});`}
                </pre>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setInspectItem(null)}
                className="rounded-xl bg-white/10 px-4 py-2 text-[12px] font-semibold text-white hover:bg-white/20"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
