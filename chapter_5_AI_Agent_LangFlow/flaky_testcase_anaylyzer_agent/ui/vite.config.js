import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import { runAnalysis } from "./api/analyze-core.js";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  return {
    plugins: [
      react(),
      {
        name: "local-analyzer-api",
        configureServer(server) {
          server.middlewares.use("/api/analyze", async (request, response) => {
            if (request.method !== "POST") {
              response.statusCode = 405;
              response.setHeader("Content-Type", "application/json");
              response.end(JSON.stringify({ error: "Method not allowed" }));
              return;
            }

            try {
              const body = await readJsonBody(request);
              const result = await runAnalysis(body, env);

              response.statusCode = result.status;
              response.setHeader("Content-Type", "application/json");
              response.end(JSON.stringify(result.body));
            } catch (error) {
              response.statusCode = 502;
              response.setHeader("Content-Type", "application/json");
              response.end(JSON.stringify({ error: error.message || "Unable to reach the analyzer." }));
            }
          });
        }
      }
    ]
  };
});

function readJsonBody(request) {
  return new Promise((resolve, reject) => {
    let body = "";

    request.on("data", (chunk) => {
      body += chunk;
    });

    request.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });

    request.on("error", reject);
  });
}
