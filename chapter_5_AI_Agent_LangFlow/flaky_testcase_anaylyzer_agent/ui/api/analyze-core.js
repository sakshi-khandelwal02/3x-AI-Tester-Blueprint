import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

export async function runAnalysis(body, env) {
  const langflowUrl = env.LANGFLOW_API_URL;
  const langflowApiKey = env.LANGFLOW_API_KEY;
  const sessionId = env.LANGFLOW_SESSION_ID || "postman-session-1";
  const baselineComponentId = env.LANGFLOW_BASELINE_FILE_COMPONENT_ID || "File-XXXXX";
  const candidateComponentId = env.LANGFLOW_CANDIDATE_FILE_COMPONENT_ID || "File-YYYYY";

  if (!langflowUrl || !langflowApiKey || langflowApiKey === "replace-with-your-langflow-api-key") {
    return {
      status: 500,
      body: {
        error: "Analyzer connection is not configured. Add LANGFLOW_API_URL and LANGFLOW_API_KEY."
      }
    };
  }

  const baseline = body?.files?.find((file) => file.role === "baseline");
  const candidate = body?.files?.find((file) => file.role === "candidate");

  if (!baseline?.content || !candidate?.content) {
    return {
      status: 400,
      body: {
        error: "Both result files are required."
      }
    };
  }

  const uploadDir = join(tmpdir(), `flaky-analysis-${Date.now()}`);
  await mkdir(uploadDir, { recursive: true });

  const baselinePath = join(uploadDir, sanitizeFileName(baseline.name || "baseline-results.json"));
  const candidatePath = join(uploadDir, sanitizeFileName(candidate.name || "candidate-results.json"));

  await Promise.all([
    writeFile(baselinePath, baseline.content, "utf8"),
    writeFile(candidatePath, candidate.content, "utf8")
  ]);

  const langflowPayload = {
    output_type: "chat",
    input_type: "text",
    input_value: body?.instruction || "",
    session_id: sessionId,
    tweaks: {
      [baselineComponentId]: {
        path: [baselinePath]
      },
      [candidateComponentId]: {
        path: [candidatePath]
      }
    }
  };

  const langflowResponse = await fetch(langflowUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": langflowApiKey
    },
    body: JSON.stringify(langflowPayload)
  });

  const contentType = langflowResponse.headers.get("content-type") || "";
  const responseBody = contentType.includes("application/json")
    ? await langflowResponse.json()
    : await langflowResponse.text();

  if (!langflowResponse.ok) {
    return {
      status: langflowResponse.status,
      body: {
        error: typeof responseBody === "string" ? responseBody : responseBody?.error || "LangFlow request failed."
      }
    };
  }

  return {
    status: 200,
    body: responseBody
  };
}

function sanitizeFileName(fileName) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
}
