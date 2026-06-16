const colors = {
  wishlist: 'bg-slate-400',
  applied: 'bg-amber-400',
  'follow-up': 'bg-violet-500',
  interview: 'bg-teal-400',
  offer: 'bg-emerald-500',
  rejected: 'bg-rose-500',
};

const labels = {
  wishlist: 'Wishlist',
  applied: 'Applied',
  'follow-up': 'Follow-up',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};

const StatusInsights = ({ data = {} }) => {
  const total = Object.values(data).reduce((sum, value) => sum + value, 0);
  const rows = Object.keys(labels).map((key) => {
    const value = data[key] || 0;
    return {
      key,
      label: labels[key],
      value,
      percent: total ? Math.round((value / total) * 100) : 0,
    };
  });
  const activeCount = (data.applied || 0) + (data['follow-up'] || 0) + (data.interview || 0);
  const topStatus = [...rows].sort((a, b) => b.value - a.value)[0];

  if (!total) {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        No status data yet. Add a job to see Application Status insights.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-500">Cards dashboard</p>
        <h2 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Application Status & insights</h2>
        <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600 dark:text-slate-400">
          Review totals, conversion, and status counts across your application pipeline.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Total cards</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{total}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Active pipeline</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{activeCount}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Largest status</p>
          <p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{topStatus?.label || '-'}</p>
        </div>
      </div>

      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.key} title={`${row.label}: ${row.percent}%`} className="space-y-2">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold uppercase text-white dark:bg-slate-100 dark:text-slate-950">
                {row.label}
              </span>
              <span className="font-semibold text-slate-700 dark:text-slate-200">
                {row.value} · {row.percent}%
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div className={`h-full rounded-full ${colors[row.key]}`} style={{ width: `${row.percent}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default StatusInsights;
