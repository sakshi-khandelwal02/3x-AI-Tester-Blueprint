import { runAnalysis } from "./analyze-core.js";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "12mb"
    }
  }
};

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
    const result = await runAnalysis(body, process.env);
    return response.status(result.status).json(result.body);
  } catch (error) {
    return response.status(502).json({
      error: error.message || "Unable to reach the analyzer."
    });
  }
}
