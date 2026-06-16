# Task Plan

## Goal
Rebuild the Job Tracker with a modern Light/Dark UI, strong dashboard metrics, resume upload support, and local persistence using IndexedDB.

## Phases

1. **Design & data model**
   - Define required dashboard and job card features.
   - Add resume upload support with file persistence.
   - Add status metrics and pie chart visualizations.

2. **Implementation**
   - Enhance IndexedDB schema to support resumes.
   - Update React app layout with dashboard, welcome banner, and resume section.
   - Improve job card UI and add resume name display.
   - Add import/export backups and theme toggle.

3. **Validation**
   - Confirm build passes.
   - Confirm local app runs with `npm run dev`.
   - Confirm Vercel deploy readiness via `.env.example`.
