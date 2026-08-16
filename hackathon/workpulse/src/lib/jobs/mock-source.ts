import { MOCK_JOBS } from "./mock-data";
import { filterJobs, type JobSearchParams, type JobSource } from "./types";
import type { Job } from "@/types";

export class MockJobSource implements JobSource {
  name = "MockJobSource";

  isAvailable(): boolean {
    return true;
  }

  async searchJobs(params: JobSearchParams): Promise<Job[]> {
    return filterJobs(MOCK_JOBS, params);
  }

  getJobById(id: string): Job | undefined {
    return MOCK_JOBS.find((j) => j.id === id);
  }
}

export const mockJobSource = new MockJobSource();
