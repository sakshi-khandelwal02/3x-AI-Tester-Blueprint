import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import JobCard from './JobCard.jsx';

const columnLabels = {
  wishlist: 'Wishlist',
  applied: 'Applied',
  'follow-up': 'Follow-up',
  interview: 'Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};

const statusColors = {
  wishlist: 'from-slate-600 to-slate-400',
  applied: 'from-sky-600 to-cyan-400',
  'follow-up': 'from-amber-500 to-orange-400',
  interview: 'from-violet-600 to-fuchsia-400',
  offer: 'from-emerald-600 to-teal-400',
  rejected: 'from-rose-600 to-red-400',
};

const StatusColumn = ({ status, jobs, onEdit, onDelete }) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const count = useMemo(() => jobs.length, [jobs]);

  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-[500px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm transition dark:border-slate-700 dark:bg-slate-950 ${isOver ? 'border-sky-400 bg-sky-50/70 dark:bg-slate-800' : ''}`}
    >
      <div className={`flex items-center justify-between gap-2 bg-gradient-to-r ${statusColors[status]} px-3 py-2.5 text-white`}>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em]">{columnLabels[status]}</h3>
          <p className="mt-0.5 text-[11px] leading-4 text-white/85">
            {status === 'wishlist' ? "Saved jobs I haven't applied to yet" : null}
            {status === 'applied' ? 'Application submitted' : null}
            {status === 'follow-up' ? 'Recruiter or referral follow-up' : null}
            {status === 'interview' ? 'Currently in interview rounds' : null}
            {status === 'offer' ? 'Received an offer' : null}
            {status === 'rejected' ? 'Got a rejection' : null}
          </p>
        </div>
        <span className="rounded-md bg-white/20 px-2.5 py-1.5 text-sm font-semibold backdrop-blur">
          {count}
        </span>
      </div>
      <div className="flex max-h-[58vh] min-h-[430px] flex-col gap-2 overflow-y-auto bg-slate-50 p-2 dark:bg-slate-900/70">
        {jobs.length ? (
          jobs.map((job) => <JobCard key={job.id} job={job} onEdit={onEdit} onDelete={onDelete} />)
        ) : (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-4 text-xs text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
            No cards yet. Drag jobs here or create a new one.
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusColumn;
