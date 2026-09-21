'use client';

import { getApiUrl } from '@/lib/api';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const apiUrl = getApiUrl() || 'internal engine route';

  return (
    <div className="section-card flex flex-col items-center py-12 text-center">
      <div className="text-[16px] font-bold text-[#F5F9FF]">Console hiccup — showing last known state</div>
      <p className="section-sub-soft mt-2 max-w-md">
        {error.message || 'The engine did not respond.'} Check that the API at{' '}
        <span className="mono-num">{apiUrl}</span> is running, then retry.
      </p>
      <button onClick={reset} className="btn-accent mt-5">
        Retry
      </button>
    </div>
  );
}
