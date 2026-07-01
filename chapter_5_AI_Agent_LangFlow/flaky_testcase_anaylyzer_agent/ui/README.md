# Flaky Test Analyzer UI

Lightweight React UI for uploading two Playwright `results.json` files, calling the LangFlow agent through a private API proxy, and rendering the returned report.

## Local setup

```bash
npm install
npm run dev
```

Create `.env.local` from `.env.example` and set:

```bash
VITE_ANALYZER_API_URL=/api/analyze

LANGFLOW_API_URL=http://localhost:7860/api/v1/run/d2fa6aed-2907-4eab-8def-a754ec99dc97?stream=false
LANGFLOW_API_KEY=replace-with-your-langflow-api-key
LANGFLOW_SESSION_ID=postman-session-1
LANGFLOW_BASELINE_FILE_COMPONENT_ID=File-XXXXX
LANGFLOW_CANDIDATE_FILE_COMPONENT_ID=File-YYYYY
```

## How it works

The React app only sends the uploaded file names, contents, and visible instruction to `/api/analyze`.

The API proxy privately:

- writes both uploads to temporary JSON files
- builds the LangFlow request with `output_type`, `input_type`, `session_id`, and `tweaks`
- calls LangFlow with `x-api-key`
- returns the LangFlow response to the UI

The UI extracts the report from `outputs[0].outputs[0].results.message.text` and renders headings, tables, lists, bold text, and inline code.

## Vercel

Set the `LANGFLOW_*` values in the Vercel project environment variables, then deploy this `ui` folder as the project root.

For production, `LANGFLOW_API_URL` must be reachable from Vercel. A local-only `http://localhost:7860` LangFlow URL works only while running everything locally.
