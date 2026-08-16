/** Canonical skill aliases — maps variants to a single canonical name */
const SKILL_ALIASES: Record<string, string> = {
  aws: "AWS",
  "amazon web services": "AWS",
  "amazon web service": "AWS",
  gcp: "GCP",
  "google cloud platform": "GCP",
  "google cloud": "GCP",
  azure: "Azure",
  "microsoft azure": "Azure",
  k8s: "Kubernetes",
  kubernetes: "Kubernetes",
  postgres: "PostgreSQL",
  postgresql: "PostgreSQL",
  psql: "PostgreSQL",
  mongo: "MongoDB",
  mongodb: "MongoDB",
  js: "JavaScript",
  javascript: "JavaScript",
  ts: "TypeScript",
  typescript: "TypeScript",
  reactjs: "React",
  "react.js": "React",
  react: "React",
  node: "Node.js",
  "node.js": "Node.js",
  nodejs: "Node.js",
  springboot: "Spring Boot",
  "spring boot": "Spring Boot",
  spring: "Spring Boot",
  cicd: "CI/CD",
  "ci/cd": "CI/CD",
  "ci cd": "CI/CD",
  tf: "Terraform",
  terraform: "Terraform",
  docker: "Docker",
  containerization: "Docker",
  containers: "Docker",
  python: "Python",
  java: "Java",
  golang: "Go",
  go: "Go",
  rust: "Rust",
  cpp: "C++",
  "c++": "C++",
  csharp: "C#",
  "c#": "C#",
  dotnet: ".NET",
  ".net": ".NET",
  ml: "Machine Learning",
  "machine learning": "Machine Learning",
  ai: "AI",
  llm: "LLM",
  llms: "LLM",
  sql: "SQL",
  mysql: "MySQL",
  redis: "Redis",
  kafka: "Kafka",
  spark: "Spark",
  airflow: "Airflow",
  etl: "ETL",
  linux: "Linux",
  git: "Git",
  jenkins: "Jenkins",
  ansible: "Ansible",
  helm: "Helm",
  microservices: "Microservices",
  "rest api": "REST APIs",
  "rest apis": "REST APIs",
  rest: "REST APIs",
  graphql: "GraphQL",
  vue: "Vue",
  vuejs: "Vue",
  angular: "Angular",
  django: "Django",
  flask: "Flask",
  fastapi: "FastAPI",
  pytorch: "PyTorch",
  tensorflow: "TensorFlow",
  selenium: "Selenium",
  playwright: "Playwright",
  cypress: "Cypress",
  testng: "TestNG",
  "api testing": "API Testing",
  postman: "Postman",
  appium: "Appium",
  cucumber: "Cucumber",
  bdd: "BDD",
  jest: "Jest",
  junit: "JUnit",
  "rest assured": "REST Assured",
  "next.js": "Next.js",
  nextjs: "Next.js",
  jmeter: "JMeter",
  gatling: "Gatling",
  soc: "SOC",
  "test automation": "Automation Testing",
  "automated testing": "Automation Testing",
  "functional testing": "Manual Testing",
  "regression testing": "Manual Testing",
  "quality assurance": "Manual Testing",
  sdet: "Automation Testing",
  sre: "SRE",
  devops: "DevOps",
};

export function normalizeSkillKey(skill: string): string {
  const cleaned = skill.toLowerCase().trim().replace(/\s+/g, " ");
  return SKILL_ALIASES[cleaned] ?? skill.trim();
}

export function normalizeSkillCanonical(skill: string): string {
  const key = skill.toLowerCase().trim().replace(/\s+/g, " ");
  return SKILL_ALIASES[key] ?? skill.trim();
}

export function skillsMatch(candidateSkill: string, requiredSkill: string): boolean {
  const a = normalizeSkillCanonical(candidateSkill).toLowerCase();
  const b = normalizeSkillCanonical(requiredSkill).toLowerCase();
  if (a === b) return true;
  // Allow partial match for compound skills (e.g. "Spring Boot" in "Spring")
  if (a.includes(b) || b.includes(a)) return true;
  return false;
}

export function profileHasSkill(profileSkillSet: Set<string>, requiredSkill: string): boolean {
  const canonical = normalizeSkillCanonical(requiredSkill).toLowerCase();
  for (const ps of profileSkillSet) {
    if (skillsMatch(ps, requiredSkill)) return true;
  }
  return false;
}

export function buildProfileSkillSet(skills: string[]): Set<string> {
  return new Set(skills.map((s) => normalizeSkillCanonical(s).toLowerCase()));
}

/** Match skill terms on word boundaries — avoids "go" in Google, "ai" in email, "ml" in html */
export function textContainsSkillTerm(text: string, term: string): boolean {
  const normalized = term.toLowerCase().trim();
  if (!normalized) return false;
  const escaped = normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`(?:^|[^a-z0-9/+.#-])${escaped}(?:[^a-z0-9/+.#-]|$)`, "i");
  return pattern.test(text.toLowerCase());
}

/** Scan text for known skill aliases and return canonical names found */
export function extractSkillsFromText(text: string): string[] {
  if (!text.trim()) return [];
  const found = new Set<string>();

  const aliases = Object.entries(SKILL_ALIASES).sort((a, b) => b[0].length - a[0].length);
  for (const [alias, canonical] of aliases) {
    if (textContainsSkillTerm(text, alias)) {
      found.add(canonical);
    }
  }

  const directSkills = [
    "Java", "Python", "JavaScript", "TypeScript", "React", "Node.js",
    "Spring Boot", "AWS", "Docker", "Kubernetes", "PostgreSQL", "SQL",
    "Terraform", "Git", "Microservices", "REST APIs", "Linux", "CI/CD",
    "Go", "Rust", "C++", "C#", ".NET", "Angular", "Vue", "MongoDB",
    "Redis", "Kafka", "Spark", "TensorFlow", "PyTorch", "Machine Learning",
    "GraphQL", "FastAPI", "Django", "Flask", "Helm", "Ansible", "Jenkins",
    "Selenium", "Playwright", "Cypress", "TestNG", "API Testing", "Postman",
    "JUnit", "Jest", "ETL", "Airflow", "LLM", "GCP", "Azure", "Appium", "BDD",
    "DevOps", "Manual Testing", "Automation Testing", "REST Assured", "Next.js",
    "JMeter", "Gatling", "Load Testing", "Performance Testing",
  ].sort((a, b) => b.length - a.length);

  for (const skill of directSkills) {
    if (textContainsSkillTerm(text, skill)) {
      found.add(normalizeSkillCanonical(skill));
    }
  }

  return Array.from(found);
}
