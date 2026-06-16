import { memo } from 'react';
import { useDraggable } from '@dnd-kit/core';

const statusStyles = {
  wishlist: 'border-l-slate-400',
  applied: 'border-l-sky-500',
  'follow-up': 'border-l-amber-500',
  interview: 'border-l-violet-500',
  offer: 'border-l-emerald-500',
  rejected: 'border-l-rose-500',
};

const daysSinceApplied = (dateApplied) => {
  const then = new Date(dateApplied);
  if (Number.isNaN(then.getTime())) return 'Date not set';
  const diff = Math.max(0, Math.floor((new Date() - then) / 86400000));
  return diff === 0 ? 'Today' : `${diff}d ago`;
};

const getJobRole = (job) => job?.role || job?.jobTitle || job?.title || '';

const JobCard = ({ job, onEdit, onDelete }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useDraggable({
    id: job.id,
    data: { status: job.status },
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.55 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`group relative border border-l-4 border-slate-200 bg-white p-3 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-700 dark:bg-slate-950 ${statusStyles[job.status]}`}
    >
      <div className="relative flex flex-col gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <div {...listeners} className="min-w-0 cursor-grab active:cursor-grabbing">
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{job.company}</p>
            <p className="truncate text-xs text-slate-500 dark:text-slate-400">{getJobRole(job)}</p>
          </div>
          {job.linkedInUrl ? (
            <a href={job.linkedInUrl} target="_blank" rel="noreferrer" aria-label={`Open LinkedIn job for ${job.company}`} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-sky-300 hover:bg-sky-50 hover:text-sky-600 dark:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-sky-400">
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor" aria-hidden="true">
                <path d="M4.98 3.5C4.98 4.88 3.87 6 2.5 6S0 4.88 0 3.5 1.12 1 2.5 1 4.98 2.12 4.98 3.5zM0 8.5h5v15H0v-15zm7.5 0h4.8v2.1h.1c.7-1.2 2.4-2.4 4.9-2.4 5.3 0 6.3 3.5 6.3 8.1v9.3h-5v-8.2c0-2 .1-4.6-2.8-4.6-2.8 0-3.2 2.2-3.2 4.4v8.4h-5v-15z" />
              </svg>
            </a>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
          <span className="max-w-full truncate rounded-md bg-slate-100 px-2 py-0.5 dark:bg-slate-800">Resume: {job.resume || 'Not set'}</span>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 dark:bg-slate-800">{daysSinceApplied(job.dateApplied)}</span>
          <span className="rounded-md bg-slate-100 px-2 py-0.5 dark:bg-slate-800">{job.dateApplied || 'No date'}</span>
        </div>
        <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
          {job.salary ? <p className="truncate">Salary: {job.salary}</p> : null}
          {job.notes ? <p className="line-clamp-2">Notes: {job.notes}</p> : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => onEdit(job)} className="rounded-lg bg-slate-950 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-950 dark:hover:bg-slate-200">
            Edit
          </button>
          <button type="button" onClick={() => onDelete(job)} className="rounded-lg border border-rose-200 px-2.5 py-1.5 text-[11px] font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/40 dark:hover:bg-rose-500/10">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(JobCard);
