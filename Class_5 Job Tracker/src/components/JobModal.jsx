import { useEffect, useMemo, useState } from 'react';

const statusOptions = [
  { value: 'wishlist', label: 'Wishlist' },
  { value: 'applied', label: 'Applied' },
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'interview', label: 'Interview' },
  { value: 'offer', label: 'Offer' },
  { value: 'rejected', label: 'Rejected' },
];

const defaultForm = {
  company: '',
  role: '',
  linkedInUrl: '',
  resume: '',
  dateApplied: new Date().toISOString().slice(0, 10),
  salary: '',
  notes: '',
  status: 'wishlist',
};

const JobModal = ({ open, onClose, onSave, job, resumeOptions = [] }) => {
  const [form, setForm] = useState(defaultForm);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) {
      setForm(job ? { ...defaultForm, ...job } : { ...defaultForm, dateApplied: new Date().toISOString().slice(0, 10) });
      setErrors({});
    }
  }, [open, job]);

  const resumeList = useMemo(() => {
    return Array.from(new Set([...resumeOptions, form.resume].filter(Boolean)));
  }, [resumeOptions, form.resume]);

  const validate = () => {
    const nextErrors = {};
    if (!form.company.trim()) nextErrors.company = 'Company name is required.';
    if (!form.role.trim()) nextErrors.role = 'Role is required.';
    if (form.linkedInUrl && !/^https?:\/\//i.test(form.linkedInUrl)) {
      nextErrors.linkedInUrl = 'Use a valid URL starting with http:// or https://';
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!validate()) return;
    onSave({
      ...form,
      dateApplied: form.dateApplied || new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString(),
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 px-4 py-6 sm:items-center">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-lg bg-white shadow-panel dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-slate-700">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              {job ? 'Edit job' : 'Add new job'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Track your hiring pipeline with resume context.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="max-h-[calc(92vh-88px)] space-y-5 overflow-y-auto px-6 py-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <span>Company name *</span>
              <input
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              {errors.company && <p className="text-xs text-rose-500">{errors.company}</p>}
            </label>
            <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <span>Role *</span>
              <input
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              {errors.role && <p className="text-xs text-rose-500">{errors.role}</p>}
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <span>LinkedIn job URL</span>
              <input
                value={form.linkedInUrl}
                onChange={(e) => setForm({ ...form, linkedInUrl: e.target.value })}
                placeholder="https://www.linkedin.com/jobs/view/..."
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              {errors.linkedInUrl && <p className="text-xs text-rose-500">{errors.linkedInUrl}</p>}
            </label>
            <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <span>Resume used</span>
              <input
                list="resume-options"
                value={form.resume}
                onChange={(e) => setForm({ ...form, resume: e.target.value })}
                placeholder="SDE_Resume_v3"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
              <datalist id="resume-options">
                {resumeList.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </datalist>
              <p className="text-xs text-slate-500 dark:text-slate-400">Type a resume name or choose a previous one.</p>
            </label>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <span>Date applied</span>
              <input
                type="date"
                value={form.dateApplied}
                onChange={(e) => setForm({ ...form, dateApplied: e.target.value })}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
              <span>Salary range</span>
              <input
                value={form.salary}
                onChange={(e) => setForm({ ...form, salary: e.target.value })}
                placeholder="₹25-30 LPA or $150-180K"
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
          </div>

          <div className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <span>Notes</span>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows="4"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <label className="space-y-2 text-sm text-slate-700 dark:text-slate-300">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value })}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-500"
            >
              Save job
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default JobModal;
