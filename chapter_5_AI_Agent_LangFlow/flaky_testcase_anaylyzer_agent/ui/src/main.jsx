import React, { useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  AlertCircle,
  ArrowRight,
  Braces,
  CheckCircle2,
  FileJson,
  Flag,
  Loader2,
  Sparkles,
  X
} from "lucide-react";
import "./styles.css";

const API_URL = import.meta.env.VITE_ANALYZER_API_URL || "/api/analyze";
const DEFAULT_INSTRUCTION =
  "Analyze these two Playwright runs and tell me which build has the most failing/flaky test.";

function App() {
  const [baselineFile, setBaselineFile] = useState(null);
  const [candidateFile, setCandidateFile] = useState(null);
  const [instruction, setInstruction] = useState(DEFAULT_INSTRUCTION);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const canSubmit = Boolean(baselineFile && candidateFile && !isLoading);

  async function analyzeFiles(event) {
    event.preventDefault();
    setError("");
    setResult(null);

    if (!baselineFile || !candidateFile) {
      setError("Select both results JSON files before running the analysis.");
      return;
    }

    setIsLoading(true);

    try {
      const [baselineContent, candidateContent] = await Promise.all([
        baselineFile.text(),
        candidateFile.text()
      ]);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          instruction,
          files: [
            {
              role: "baseline",
              name: baselineFile.name,
              type: baselineFile.type || "application/json",
              content: baselineContent
            },
            {
              role: "candidate",
              name: candidateFile.name,
              type: candidateFile.type || "application/json",
              content: candidateContent
            }
          ]
        })
      });

      const contentType = response.headers.get("content-type") || "";
      const body = contentType.includes("application/json")
        ? await response.json()
        : await response.text();

      if (!response.ok) {
        const message = typeof body === "string" ? body : body?.error || body?.message || "Analysis failed.";
        throw new Error(message);
      }

      setResult({
        raw: body,
        reportText: extractLangflowText(body)
      });
    } catch (requestError) {
      setError(requestError.message || "Unable to complete the analysis. Check the analyzer connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="hero">
          <div className="brand-mark" aria-hidden="true">
            <Flag size={25} fill="currentColor" />
          </div>
          <div className="hero-copy">
            <h1>Flaky Test Analyzer</h1>
            <p>Compare two Playwright runs · LangFlow AI agent</p>
          </div>
          <div className="status-pill">
            <span className="status-dot" />
            <span>LANGFLOW</span>
          </div>
        </header>

        <form onSubmit={analyzeFiles}>
          <section className="connection-row">
            <span>Connection</span>
            <CheckCircle2 size={17} />
          </section>

          <section className="comparison-grid">
            <ResultDropzone
              id="baseline-file"
              index="01"
              title="Build A - Baseline"
              file={baselineFile}
              onFileChange={setBaselineFile}
            />
            <span className="versus">vs</span>
            <ResultDropzone
              id="candidate-file"
              index="02"
              title="Build B - Candidate"
              file={candidateFile}
              onFileChange={setCandidateFile}
            />
          </section>

          <section className="instruction-panel">
            <label htmlFor="instruction">Instruction to the agent</label>
            <div className="instruction-row">
              <textarea
                id="instruction"
                value={instruction}
                onChange={(event) => setInstruction(event.target.value)}
              />
              <button className="run-button" type="submit" disabled={!canSubmit}>
                {isLoading ? <Loader2 className="spin" size={19} /> : null}
                <span>{isLoading ? "Analyzing" : "Run Analysis"}</span>
                {!isLoading ? <ArrowRight size={18} /> : null}
              </button>
            </div>
          </section>
        </form>

        {error ? (
          <div className="notice error" role="alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        ) : null}

        <ResultView result={result} isLoading={isLoading} hasFiles={baselineFile && candidateFile} />

        <footer>Local tool · talks directly to LangFlow · The Testing Academy</footer>
      </section>
    </main>
  );
}

function ResultDropzone({ id, index, title, file, onFileChange }) {
  const sizeLabel = useMemo(() => {
    if (!file) return "";
    if (file.size < 1024) return `${file.size} B`;
    if (file.size < 1024 * 1024) return `${(file.size / 1024).toFixed(1)} KB`;
    return `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
  }, [file]);

  function handleDrop(event) {
    event.preventDefault();
    const nextFile = event.dataTransfer.files?.[0];
    if (nextFile) onFileChange(nextFile);
  }

  return (
    <article
      className={file ? "drop-card has-file" : "drop-card"}
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleDrop}
    >
      <header>
        <span>{index}</span>
        <h2>{title}</h2>
      </header>

      <label className="drop-target" htmlFor={id}>
        <input
          id={id}
          type="file"
          accept=".json,application/json,.txt,.log"
          onChange={(event) => onFileChange(event.target.files?.[0] || null)}
        />
        {file ? (
          <span className="selected-file">
            <FileJson size={36} />
            <strong>{file.name}</strong>
            <small>{sizeLabel}</small>
          </span>
        ) : (
          <span className="empty-file">
            <Braces size={45} />
            <strong>Drop results JSON</strong>
            <small>or click to browse</small>
          </span>
        )}
      </label>

      {file ? (
        <button
          aria-label={`Remove ${title}`}
          className="remove-file"
          type="button"
          onClick={() => onFileChange(null)}
        >
          <X size={16} />
        </button>
      ) : null}
    </article>
  );
}

function ResultView({ result, isLoading, hasFiles }) {
  if (isLoading) {
    return (
      <section className="result-placeholder active">
        <Loader2 className="spin" size={24} />
        <span>Analyzing both runs and preparing the report.</span>
      </section>
    );
  }

  if (!result) {
    return (
      <section className="result-placeholder">
        <Sparkles size={18} />
        <span>
          {hasFiles
            ? "Ready to run the analysis."
            : "Select two results.json files, then run the analysis."}
        </span>
      </section>
    );
  }

  return (
    <section className="report-panel">
      <div className="report-heading">
        <Sparkles size={19} />
        <h2>Analysis Report</h2>
      </div>
      {result.reportText ? <MarkdownReport text={result.reportText} /> : <RawResponse value={result.raw} />}
    </section>
  );
}

function MarkdownReport({ text }) {
  const sections = parseMarkdownSections(text);

  return (
    <div className="report-sections">
      {sections.map((section) => (
        <article className="report-section" key={section.title}>
          <h3>{section.title}</h3>
          {section.blocks.map((block, index) => (
            <ReportBlock block={block} key={`${section.title}-${index}`} />
          ))}
        </article>
      ))}
    </div>
  );
}

function ReportBlock({ block }) {
  if (block.type === "table") {
    return (
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {block.headers.map((header) => (
                <th key={header}>{renderInline(header)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={`${row.join("-")}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`}>{renderInline(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (block.type === "list") {
    return (
      <ul className="report-list">
        {block.items.map((item) => (
          <li key={item}>{renderInline(item)}</li>
        ))}
      </ul>
    );
  }

  return <p>{renderInline(block.text)}</p>;
}

function RawResponse({ value }) {
  return <pre>{typeof value === "string" ? value : JSON.stringify(value, null, 2)}</pre>;
}

function extractLangflowText(body) {
  if (typeof body === "string") return body;

  return (
    body?.outputs?.[0]?.outputs?.[0]?.results?.message?.text ||
    body?.outputs?.[0]?.outputs?.[0]?.outputs?.message?.message ||
    body?.outputs?.[0]?.outputs?.[0]?.artifacts?.message ||
    body?.message ||
    ""
  );
}

function parseMarkdownSections(text) {
  const chunks = text
    .split(/\n(?=###\s+)/)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  if (!chunks.length) {
    return [
      {
        title: "Summary",
        blocks: [{ type: "paragraph", text }]
      }
    ];
  }

  return chunks.map((chunk, index) => {
    const lines = chunk.split("\n").map((line) => line.trim()).filter(Boolean);
    const rawTitle = lines[0]?.replace(/^###\s*/, "") || `Section ${index + 1}`;
    const title = rawTitle.replace(/^\d+\.\s*/, "").replace(/_/g, " ");

    return {
      title,
      blocks: parseBlocks(lines.slice(1))
    };
  });
}

function parseBlocks(lines) {
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (isTableLine(line) && isTableDivider(lines[index + 1])) {
      const headers = splitTableRow(line);
      index += 2;
      const rows = [];

      while (isTableLine(lines[index])) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }

      blocks.push({ type: "table", headers, rows });
      continue;
    }

    if (line.startsWith("- ")) {
      const items = [];

      while (lines[index]?.startsWith("- ")) {
        items.push(lines[index].replace(/^-\s*/, ""));
        index += 1;
      }

      blocks.push({ type: "list", items });
      continue;
    }

    blocks.push({ type: "paragraph", text: line });
    index += 1;
  }

  return blocks;
}

function isTableLine(line = "") {
  return line.startsWith("|") && line.endsWith("|");
}

function isTableDivider(line = "") {
  return /^\|[\s:-|]+\|$/.test(line);
}

function splitTableRow(line) {
  return line
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

function renderInline(text) {
  const parts = String(text).split(/(\*\*[^*]+\*\*|`[^`]+`)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={`${part}-${index}`}>{part.slice(2, -2)}</strong>;
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>;
    }

    return <React.Fragment key={`${part}-${index}`}>{part}</React.Fragment>;
  });
}

createRoot(document.getElementById("root")).render(<App />);
