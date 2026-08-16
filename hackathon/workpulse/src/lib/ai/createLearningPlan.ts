import { callAI } from "./client";
import type { LearningPlan, ProfessionalProfile } from "@/types";
import type { MarketSkillStat } from "@/types";
import { getLearningResourcesForSkill } from "@/lib/skills/learningResources";

function createLearningPlanFallback(
  profile: ProfessionalProfile,
  targetRole: string,
  gaps: string[],
  marketSkills: MarketSkillStat[]
): LearningPlan {
  const prioritySkills = gaps.length
    ? gaps.slice(0, 3)
    : marketSkills.filter((s) => s.percentage >= 30).slice(0, 3).map((s) => s.skill);

  const weeks = prioritySkills.map((skill, i) => ({
    week: i + 1,
    title: `${skill} fundamentals`,
    skills: [skill],
    topics: getTopics(skill),
    practiceProject: getProject(skill),
    resources: getResources(skill),
  }));

  if (weeks.length < 4) {
    weeks.push({
      week: weeks.length + 1,
      title: "Build a cloud deployment project",
      skills: prioritySkills,
      topics: ["Integrate learned skills", "Deploy to cloud", "Document project"],
      practiceProject: "Build and deploy a microservice using your newly learned skills",
      resources: [{ title: "AWS Skill Builder", url: "https://skillbuilder.aws/", type: "Training" }],
    });
  }

  return {
    targetRole,
    durationDays: 30,
    weeks: weeks.slice(0, 4),
    summary: `30-day plan to improve readiness for ${targetRole} by focusing on ${prioritySkills.join(", ")} based on market demand and skill gaps.`,
  };
}

function getTopics(skill: string): string[] {
  const map: Record<string, string[]> = {
    Kubernetes: ["Architecture overview", "Deployments and Services", "ConfigMaps", "Production patterns"],
    Terraform: ["HCL syntax", "Providers", "Modules", "State management"],
    AWS: ["Core services", "IAM", "Networking", "Monitoring"],
    Python: ["Basics", "APIs", "Testing", "Data handling"],
  };
  return map[skill] || [`${skill} fundamentals`, `${skill} best practices`];
}

function getProject(skill: string): string {
  const map: Record<string, string> = {
    Kubernetes: "Deploy a Spring Boot app to a local Kubernetes cluster using minikube",
    Terraform: "Provision AWS infrastructure with Terraform for a sample web app",
    AWS: "Deploy a containerized app to AWS ECS or EC2",
    Python: "Build a REST API with FastAPI and deploy with Docker",
  };
  return map[skill] || `Build a small project demonstrating ${skill} skills`;
}

function getResources(skill: string): { title: string; url?: string; type: string }[] {
  return getLearningResourcesForSkill(skill).map((r) => ({
    title: r.title,
    url: r.url,
    type: r.type,
  }));
}

export async function createLearningPlan(
  profile: ProfessionalProfile,
  targetRole: string,
  gaps: string[],
  marketSkills: MarketSkillStat[]
): Promise<{ plan: LearningPlan; aiPowered: boolean }> {
  const systemPrompt = `Create a 30-day personalized learning roadmap.
Return JSON: { "targetRole": string, "durationDays": 30, "weeks": [{ "week": number, "title": string, "skills": string[], "topics": string[], "practiceProject": string, "resources": [{ "title": string, "url": string optional, "type": string }] }], "summary": string }
Only use verified resource URLs from official documentation. Never invent URLs.`;

  const { data, aiPowered } = await callAI<LearningPlan>(
    systemPrompt,
    JSON.stringify({ profile: { skills: profile.skills, experience: profile.experienceYears }, targetRole, gaps, marketSkills }),
    () => createLearningPlanFallback(profile, targetRole, gaps, marketSkills)
  );

  return { plan: data, aiPowered };
}
