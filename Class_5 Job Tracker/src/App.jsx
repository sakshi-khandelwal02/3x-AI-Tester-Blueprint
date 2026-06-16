import { useCallback, useEffect, useMemo, useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { clearJobs, fetchJobs, fetchResumes, saveJob, deleteJob, saveResume } from './lib/db.js';
import JobModal from './components/JobModal.jsx';
import StatusColumn from './components/StatusColumn.jsx';
import PieChart from './components/PieChart.jsx';

const STATUS_ORDER = ['wishlist', 'applied', 'follow-up', 'interview', 'offer', 'rejected'];
const STORAGE_KEYS = {
  candidate: 'job-tracker-candidate-name',
  theme: 'job-tracker-theme',
};

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

const inferCandidateNameFromResume = (fileName = '') => {
  const withoutExtension = fileName.replace(/\.[^.]+$/, '');
  const withoutResumeWords = withoutExtension
    .replace(/\b(resume|cv|curriculum|vitae|profile|latest|final|updated|ats|sde|qa|lead|v\d+)\b/gi, ' ')
    .replace(/\b\d{2,4}\b/g, ' ');
  const words = withoutResumeWords
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-zA-Z\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1)
    .slice(0, 3);

  if (!words.length) return '';

  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

const createNewJob = (job) => ({
  ...job,
  id: createId(),
  createdAt: new Date().toISOString(),
});

const createResumeRecord = (file) => ({
  id: createId(),
  name: file.name,
  type: file.type || 'resume-file',
  size: file.size,
  uploadedAt: new Date().toISOString(),
});

const formatPercent = (value, total) => (total ? `${Math.round((value / total) * 100)}%` : '0%');

const getJobRole = (job) => job?.role || job?.jobTitle || job?.title || '';

const getSearchText = (job) =>
  [job?.company, getJobRole(job), job?.resume, job?.salary, job?.notes]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

const App = () => {
  const [jobs, setJobs] = useState([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [theme, setTheme] = useState(() => localStorage.getItem(STORAGE_KEYS.theme) || 'light');
  const [candidateName, setCandidateName] = useState(() => localStorage.getItem(STORAGE_KEYS.candidate) || 'Candidate');
  const [activeId, setActiveId] = useState(null);
  const [resumeFiles, setResumeFiles] = useState([]);
  const [sortMode, setSortMode] = useState('newest');

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const refreshData = useCallback(async () => {
    const [jobsData, resumes] = await Promise.all([fetchJobs(), fetchResumes()]);
    setJobs(jobsData);
    setResumeFiles(resumes);
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(STORAGE_KEYS.theme, theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.candidate, candidateName || 'Candidate');
  }, [candidateName]);

  const saveAndRefresh = useCallback(
    async (job) => {
      await saveJob(job);
      if (job.resume && !resumeFiles.some((resume) => resume.name === job.resume)) {
        await saveResume({
          id: createId(),
          name: job.resume,
          type: 'manual-entry',
          size: 0,
          uploadedAt: new Date().toISOString(),
        });
      }
      await refreshData();
    },
    [refreshData, resumeFiles],
  );

  const handleSave = async (jobData) => {
    const job = selectedJob ? { ...selectedJob, ...jobData } : createNewJob(jobData);
    await saveAndRefresh(job);
    setModalOpen(false);
    setSelectedJob(null);
  };

  const handleDelete = async (job) => {
    if (window.confirm(`Delete ${job.company} - ${getJobRole(job)}?`)) {
      await deleteJob(job.id);
      await refreshData();
    }
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveId(null);
    if (!over) return;
    const targetStatus = over.id;
    if (!STATUS_ORDER.includes(targetStatus)) return;
    const moved = jobs.find((item) => item.id === active.id);
    if (!moved || moved.status === targetStatus) return;
    await saveAndRefresh({ ...moved, status: targetStatus, updatedAt: new Date().toISOString() });
  };

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase();
    return jobs.filter((job) => {
      if (!query) return true;
      return getSearchText(job).includes(query);
    });
  }, [jobs, search]);

  const jobsByStatus = useMemo(() => {
    return STATUS_ORDER.reduce((acc, status) => {
      const list = filteredJobs.filter((job) => job.status === status);
      acc[status] = [...list].sort((a, b) => {
        const first = new Date(a.dateApplied || a.createdAt).getTime();
        const second = new Date(b.dateApplied || b.createdAt).getTime();
        return sortMode === 'newest' ? second - first : first - second;
      });
      return acc;
    }, {});
  }, [filteredJobs, sortMode]);

  const statusCounts = useMemo(() => {
    return STATUS_ORDER.reduce((acc, status) => {
      acc[status] = jobs.filter((job) => job.status === status).length;
      return acc;
    }, {});
  }, [jobs]);

  const analytics = useMemo(() => {
    const total = jobs.length;
    const active = (statusCounts.applied || 0) + (statusCounts['follow-up'] || 0) + (statusCounts.interview || 0);
    const positive = (statusCounts.interview || 0) + (statusCounts.offer || 0);
    const uniqueResumes = new Set(jobs.map((job) => job.resume).filter(Boolean)).size;
    const newestJob = [...jobs].sort((a, b) => new Date(b.dateApplied || b.createdAt) - new Date(a.dateApplied || a.createdAt))[0];

    return {
      total,
      active,
      uniqueResumes,
      momentum: formatPercent(positive, total),
      newestJob,
    };
  }, [jobs, statusCounts]);

  const activeJob = jobs.find((job) => job.id === activeId) || null;

  const handleExport = () => {
    const payload = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        candidateName,
        jobs,
        resumes: resumeFiles,
      },
      null,
      2,
    );
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'job-tracker-backup.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const importedJobs = Array.isArray(parsed) ? parsed : parsed.jobs;
      const importedResumes = Array.isArray(parsed?.resumes) ? parsed.resumes : [];
      if (!Array.isArray(importedJobs)) throw new Error('Invalid format');

      await Promise.all(importedJobs.map((item) => saveJob({ ...item, id: item.id || createId() })));
      await Promise.all(importedResumes.map((item) => saveResume({ ...item, id: item.id || createId() })));
      if (parsed.candidateName) setCandidateName(parsed.candidateName);
      await refreshData();
    } catch (error) {
      window.alert('Unable to import JSON. Ensure the file is a valid Job Tracker backup.');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-5 text-slate-900 dark:bg-slate-950 dark:text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1800px] flex-col gap-5">
        <header className="grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[1.5fr_1fr]">
          <div className="space-y-5">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <p className="text-sm font-medium text-sky-600 dark:text-sky-300">Welcome</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-3xl font-semibold text-slate-950 dark:text-white">Welcome</span>
                  <input
                    value={candidateName}
                    onChange={(event) => setCandidateName(event.target.value)}
                    aria-label="Candidate name"
                    className="min-w-0 rounded-lg border border-transparent bg-slate-100 px-3 py-2 text-3xl font-semibold text-slate-950 outline-none transition focus:border-sky-300 focus:bg-white focus:ring-2 focus:ring-sky-100 dark:bg-slate-800 dark:text-white dark:focus:border-sky-500 dark:focus:bg-slate-950"
                  />
                </div>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">
                  A local-first job command center for applications, resumes, follow-ups, interviews, offers, and outcomes.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:hover:bg-slate-800"
                >
                  {theme === 'dark' ? 'Light mode' : 'Dark mode'}
                </button>
                <button
                  onClick={() => {
                    setSelectedJob(null);
                    setModalOpen(true);
                  }}
                  className="rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
                >
                  Add job
                </button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border border-sky-100 bg-sky-50 p-4 dark:border-sky-900/50 dark:bg-sky-950/30">
                <p className="text-sm text-sky-700 dark:text-sky-200">Total jobs</p>
                <p className="mt-2 text-3xl font-semibold">{analytics.total}</p>
              </div>
              <div className="rounded-lg border border-violet-100 bg-violet-50 p-4 dark:border-violet-900/50 dark:bg-violet-950/30">
                <p className="text-sm text-violet-700 dark:text-violet-200">Active pipeline</p>
                <p className="mt-2 text-3xl font-semibold">{analytics.active}</p>
              </div>
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
                <p className="text-sm text-emerald-700 dark:text-emerald-200">Interview or offer rate</p>
                <p className="mt-2 text-3xl font-semibold">{analytics.momentum}</p>
              </div>
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
                <p className="text-sm text-amber-800 dark:text-amber-200">Resume variants used</p>
                <p className="mt-2 text-3xl font-semibold">{analytics.uniqueResumes}</p>
              </div>
            </div>
          </div>

          <aside className="rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-700 dark:bg-slate-950">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">AI intelligent analytics dashboard</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">Pipeline health</h2>
              </div>
              <label
                htmlFor="resume-upload"
                className="cursor-pointer rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500"
              >
                Upload resume
              </label>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
              {analytics.newestJob
                ? `Newest activity: ${analytics.newestJob.company} for ${getJobRole(analytics.newestJob)}.`
                : 'Add your first card to unlock status percentages and resume insights.'}
            </p>
            <input
              id="resume-upload"
              type="file"
              accept=".pdf,.doc,.docx"
              className="hidden"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                try {
                  await saveResume(createResumeRecord(file));
                  const inferredName = inferCandidateNameFromResume(file.name);
                  if (inferredName) setCandidateName(inferredName);
                  await refreshData();
                } catch (error) {
                  window.alert('Resume upload failed. Please try a smaller PDF/DOC file or enter the resume name manually in the job form.');
                } finally {
                  event.target.value = '';
                }
              }}
            />
            <div className="mt-4 grid gap-2">
              {resumeFiles.slice(0, 4).map((resume) => (
                <div key={resume.id} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900">
                  <span className="truncate font-medium">{resume.name}</span>
                  <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{new Date(resume.uploadedAt).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          </aside>
        </header>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <label className="w-full text-sm font-medium text-slate-600 dark:text-slate-300 lg:max-w-sm">
              Search
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Company or role..."
                className="mt-1.5 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              <select
                value={sortMode}
                onChange={(event) => setSortMode(event.target.value)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
              </select>
              <button onClick={handleExport} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                Export JSON
              </button>
              <label className="cursor-pointer rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold transition hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800">
                Import JSON
                <input type="file" accept="application/json" onChange={handleImport} className="hidden" />
              </label>
              <button
                type="button"
                onClick={async () => {
                  if (!window.confirm('Clear all jobs from the tracker? This cannot be undone.')) return;
                  await clearJobs();
                  await refreshData();
                }}
                className="rounded-lg border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 dark:border-rose-500/40 dark:hover:bg-rose-500/10"
              >
                Clear jobs
              </button>
            </div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/60">
            <PieChart data={statusCounts} />
          </div>
        </section>

        <DndContext sensors={sensors} onDragStart={({ active }) => setActiveId(active.id)} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {STATUS_ORDER.map((status) => (
              <StatusColumn
                key={status}
                status={status}
                jobs={jobsByStatus[status] || []}
                onEdit={(job) => {
                  setSelectedJob(job);
                  setModalOpen(true);
                }}
                onDelete={handleDelete}
              />
            ))}
          </section>
          <DragOverlay>
            {activeJob ? (
              <div className="w-72 rounded-lg border border-slate-200 bg-white p-4 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{activeJob.company}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{getJobRole(activeJob)}</p>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <JobModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleSave} job={selectedJob} resumeOptions={resumeFiles.map((resume) => resume.name)} />
    </div>
  );
};

export default App;
