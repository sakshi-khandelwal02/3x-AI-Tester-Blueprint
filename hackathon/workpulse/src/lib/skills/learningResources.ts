export interface LearningResourceLink {
  title: string;
  url: string;
  type: "Video" | "Docs" | "Course" | "Tutorial";
}

const CURATED: Record<string, LearningResourceLink[]> = {
  Kubernetes: [
    { title: "Kubernetes Docs", url: "https://kubernetes.io/docs/home/", type: "Docs" },
    { title: "K8s Full Course (freeCodeCamp)", url: "https://www.youtube.com/watch?v=X48H9RCEA0I", type: "Video" },
  ],
  Terraform: [
    { title: "Terraform Docs", url: "https://developer.hashicorp.com/terraform/docs", type: "Docs" },
    { title: "Terraform Tutorial (HashiCorp)", url: "https://developer.hashicorp.com/terraform/tutorials", type: "Tutorial" },
  ],
  AWS: [
    { title: "AWS Skill Builder", url: "https://skillbuilder.aws/", type: "Course" },
    { title: "AWS Certified Cloud Practitioner", url: "https://www.youtube.com/watch?v=SOTamW9N3X4", type: "Video" },
  ],
  Docker: [
    { title: "Docker Docs", url: "https://docs.docker.com/get-started/", type: "Docs" },
    { title: "Docker Tutorial for Beginners", url: "https://www.youtube.com/watch?v=fqMOX6JJhGo", type: "Video" },
  ],
  Python: [
    { title: "Python Docs", url: "https://docs.python.org/3/tutorial/", type: "Docs" },
    { title: "Python Full Course (freeCodeCamp)", url: "https://www.youtube.com/watch?v=rfscVS0vtbw", type: "Video" },
  ],
  Java: [
    { title: "Java Tutorials (Oracle)", url: "https://docs.oracle.com/javase/tutorial/", type: "Docs" },
    { title: "Java Full Course (freeCodeCamp)", url: "https://www.youtube.com/watch?v=eIrMbAQSU34", type: "Video" },
  ],
  Selenium: [
    { title: "Selenium Documentation", url: "https://www.selenium.dev/documentation/", type: "Docs" },
    { title: "Selenium WebDriver Tutorial", url: "https://www.youtube.com/watch?v=lYeLPLindpc", type: "Video" },
  ],
  Playwright: [
    { title: "Playwright Docs", url: "https://playwright.dev/docs/intro", type: "Docs" },
    { title: "Playwright Tutorial", url: "https://www.youtube.com/watch?v=wawbt1cATsk", type: "Video" },
  ],
  Cypress: [
    { title: "Cypress Docs", url: "https://docs.cypress.io/", type: "Docs" },
    { title: "Cypress End-to-End Testing", url: "https://www.youtube.com/watch?v=BQqzfHQkser", type: "Video" },
  ],
  Jenkins: [
    { title: "Jenkins User Handbook", url: "https://www.jenkins.io/doc/", type: "Docs" },
    { title: "Jenkins CI/CD Tutorial", url: "https://www.youtube.com/watch?v=6YZvp2GwT0A", type: "Video" },
  ],
  "CI/CD": [
    { title: "CI/CD Explained", url: "https://www.youtube.com/watch?v=scEDHrr3Oes", type: "Video" },
    { title: "GitHub Actions Docs", url: "https://docs.github.com/en/actions", type: "Docs" },
  ],
  GraphQL: [
    { title: "GraphQL Official Learn", url: "https://graphql.org/learn/", type: "Docs" },
    { title: "GraphQL Full Course", url: "https://www.youtube.com/watch?v=ed8SzALpx1Q", type: "Video" },
  ],
  PostgreSQL: [
    { title: "PostgreSQL Tutorial", url: "https://www.postgresql.org/docs/current/tutorial.html", type: "Docs" },
    { title: "SQL Full Course", url: "https://www.youtube.com/watch?v=HXV3zeQKqGY", type: "Video" },
  ],
  React: [
    { title: "React Docs", url: "https://react.dev/learn", type: "Docs" },
    { title: "React Course (freeCodeCamp)", url: "https://www.youtube.com/watch?v=bMknfYXA2J8", type: "Video" },
  ],
  "Spring Boot": [
    { title: "Spring Boot Reference", url: "https://docs.spring.io/spring-boot/reference/", type: "Docs" },
    { title: "Spring Boot Tutorial", url: "https://www.youtube.com/watch?v=9SGDpanrc8U", type: "Video" },
  ],
  TestNG: [
    { title: "TestNG Documentation", url: "https://testng.org/doc/documentation-main.html", type: "Docs" },
    { title: "TestNG Tutorial", url: "https://www.youtube.com/results?search_query=testng+tutorial", type: "Video" },
  ],
  JUnit: [
    { title: "JUnit 5 User Guide", url: "https://junit.org/junit5/docs/current/user-guide/", type: "Docs" },
    { title: "JUnit Tutorial", url: "https://www.youtube.com/results?search_query=junit+5+tutorial", type: "Video" },
  ],
  Appium: [
    { title: "Appium Documentation", url: "https://appium.io/docs/en/latest/", type: "Docs" },
    { title: "Appium Mobile Testing", url: "https://www.youtube.com/results?search_query=appium+tutorial", type: "Video" },
  ],
  Kafka: [
    { title: "Apache Kafka Docs", url: "https://kafka.apache.org/documentation/", type: "Docs" },
    { title: "Kafka Tutorial", url: "https://www.youtube.com/watch?v=R873BlNVUB4", type: "Video" },
  ],
  Microservices: [
    { title: "Microservices Guide", url: "https://microservices.io/", type: "Docs" },
    { title: "Microservices Explained", url: "https://www.youtube.com/watch?v=CdBtNQ1567k", type: "Video" },
  ],
};

function normalizeSkillKey(skill: string): string {
  return skill.trim();
}

function findCurated(skill: string): LearningResourceLink[] | undefined {
  const key = normalizeSkillKey(skill);
  if (CURATED[key]) return CURATED[key];
  const lower = key.toLowerCase();
  for (const [name, links] of Object.entries(CURATED)) {
    if (name.toLowerCase() === lower) return links;
  }
  return undefined;
}

function fallbackResources(skill: string): LearningResourceLink[] {
  const q = encodeURIComponent(`${skill} tutorial`);
  const docQ = encodeURIComponent(`${skill} official documentation`);
  return [
    {
      title: `${skill} video tutorials`,
      url: `https://www.youtube.com/results?search_query=${q}`,
      type: "Video",
    },
    {
      title: `${skill} documentation`,
      url: `https://www.google.com/search?q=${docQ}`,
      type: "Docs",
    },
  ];
}

/** Curated docs + video links for a skill; falls back to YouTube/Google search */
export function getLearningResourcesForSkill(skill: string): LearningResourceLink[] {
  return findCurated(skill) ?? fallbackResources(skill);
}

export function getLearningResourcesForSkills(skills: string[]): Record<string, LearningResourceLink[]> {
  return Object.fromEntries(skills.map((s) => [s, getLearningResourcesForSkill(s)]));
}
