import { openDB } from 'idb';

const DB_NAME = 'job-tracker-db';
const JOB_STORE = 'jobs';
const RESUME_STORE = 'resumes';

export const getDb = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(JOB_STORE)) {
        db.createObjectStore(JOB_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(RESUME_STORE)) {
        db.createObjectStore(RESUME_STORE, { keyPath: 'id' });
      }
    },
  });
};

export const fetchJobs = async () => {
  const db = await getDb();
  return (await db.getAll(JOB_STORE)).sort((a, b) => new Date(b.dateApplied) - new Date(a.dateApplied));
};

export const saveJob = async (job) => {
  const db = await getDb();
  await db.put(JOB_STORE, job);
};

export const deleteJob = async (id) => {
  const db = await getDb();
  await db.delete(JOB_STORE, id);
};

export const clearJobs = async () => {
  const db = await getDb();
  await db.clear(JOB_STORE);
};

export const fetchResumes = async () => {
  const db = await getDb();
  return (await db.getAll(RESUME_STORE)).sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
};

export const saveResume = async (resume) => {
  const db = await getDb();
  await db.put(RESUME_STORE, resume);
};

export const deleteResume = async (id) => {
  const db = await getDb();
  await db.delete(RESUME_STORE, id);
};

export const clearResumes = async () => {
  const db = await getDb();
  await db.clear(RESUME_STORE);
};
