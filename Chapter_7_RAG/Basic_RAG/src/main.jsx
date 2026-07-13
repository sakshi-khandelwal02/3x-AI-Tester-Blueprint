import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Brain,
  Database,
  FileText,
  Layers3,
  Loader2,
  MessageSquareText,
  Search,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import "./styles.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5174";

const pipelineSteps = [
  { key: "pdf", label: "PDF", icon: FileText },
  { key: "chunks", label: "Chunks", icon: Layers3 },
  { key: "embeddings", label: "Mxbai Embed", icon: Brain },
  { key: "storage", label: "ChromaDB", icon: Database },
  { key: "retrieval", label: "Top 4", icon: Search },
  { key: "answer", label: "Groq", icon: Sparkles },
];

function App() {
  const [status, setStatus] = useState(null);
  const [question, setQuestion] = useState("What are the main product requirements for vwo.com?");
  const [queryResult, setQueryResult] = useState(null);
  const [isIngesting, setIsIngesting] = useState(false);
  const [isQuerying, setIsQuerying] = useState(false);
  const [error, setError] = useState("");

  const activeSteps = useMemo(() => {
    const steps = new Set();
    if (status?.pdf) steps.add("pdf");
    if (status?.chunks > 0) steps.add("chunks");
    if (status?.embeddedChunks > 0) steps.add("embeddings");
    if (status?.storedChunks > 0) steps.add("storage");
    if (queryResult?.chunks?.length) steps.add("retrieval");
    if (queryResult?.answer) steps.add("answer");
    return steps;
  }, [status, queryResult]);

  async function loadStatus() {
    const response = await fetch(`${API_BASE}/api/status`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Unable to load status");
    setStatus(data);
  }

  async function ingest() {
    setError("");
    setIsIngesting(true);
    try {
      const response = await fetch(`${API_BASE}/api/ingest`, { method: "POST" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Ingestion failed");
      setStatus(data);
      setQueryResult(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsIngesting(false);
    }
  }

  async function askQuestion(event) {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed) return;

    setError("");
    setIsQuerying(true);
    try {
      const response = await fetch(`${API_BASE}/api/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Query failed");
      setQueryResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsQuerying(false);
    }
  }

  useEffect(() => {
    loadStatus().catch((err) => setError(err.message));
  }, []);

  return (
    <main className="app-shell">
      <section className="topbar">
        <div>
          <p className="eyebrow">Local vector database demo</p>
          <h1>RAG Explorer</h1>
          <p className="subtitle">Trace a PDF from ingestion to grounded answer generation.</p>
        </div>
        <button className="primary-action" onClick={ingest} disabled={isIngesting}>
          {isIngesting ? <Loader2 className="spin" size={18} /> : <FileText size={18} />}
          {isIngesting ? "Ingesting" : "Ingest PDF"}
        </button>
      </section>

      {error ? (
        <div className="alert">
          <TriangleAlert size={18} />
          <span>{error}</span>
        </div>
      ) : null}

      <section className="pipeline">
        {pipelineSteps.map((step) => {
          const Icon = step.icon;
          const isActive = activeSteps.has(step.key);
          return (
            <div className={`pipeline-step ${isActive ? "active" : ""}`} key={step.key}>
              <Icon size={20} />
              <span>{step.label}</span>
            </div>
          );
        })}
      </section>

      <section className="stats-grid">
        <Stat label="Document" value={status?.pdf?.name || "Waiting"} detail={status?.pdf?.size || "Run ingestion"} />
        <Stat label="Chunks" value={status?.chunks ?? 0} detail="Recursive overlap splitter" />
        <Stat label="Embedded" value={status?.embeddedChunks ?? 0} detail={status?.embeddingModel || "mxbai-embed-large"} />
        <Stat label="Stored" value={status?.storedChunks ?? 0} detail={status?.collectionName || "Chroma collection"} />
      </section>

      <section className="workspace">
        <form className="query-panel" onSubmit={askQuestion}>
          <label htmlFor="question">Ask the PRD</label>
          <textarea
            id="question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Ask a question about the VWO PRD..."
          />
          <button className="primary-action" type="submit" disabled={isQuerying}>
            {isQuerying ? <Loader2 className="spin" size={18} /> : <MessageSquareText size={18} />}
            {isQuerying ? "Retrieving" : "Ask"}
          </button>
        </form>

        <article className="answer-panel">
          <div className="panel-heading">
            <Sparkles size={20} />
            <h2>Generated Answer</h2>
          </div>
          <p className={queryResult?.answer ? "answer-text" : "empty-text"}>
            {queryResult?.answer || "Ingest the PDF, then ask a question to see Groq synthesize an answer from the retrieved chunks."}
          </p>
        </article>
      </section>

      <section className="chunks-section">
        <div className="section-heading">
          <h2>Retrieved Top 4 Chunks</h2>
          <span>{queryResult?.chunks?.length || 0} shown</span>
        </div>
        <div className="chunks-grid">
          {(queryResult?.chunks || []).map((chunk, index) => (
            <article className="chunk-card" key={chunk.id}>
              <div className="chunk-meta">
                <strong>#{index + 1}</strong>
                <span>chunk {chunk.chunkIndex + 1}</span>
                <span>{chunk.scoreLabel}</span>
              </div>
              <p>{chunk.text}</p>
            </article>
          ))}
          {!queryResult?.chunks?.length ? (
            <div className="empty-state">
              <Search size={24} />
              <span>The retrieval results will appear here after a query.</span>
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value, detail }) {
  return (
    <article className="stat">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

createRoot(document.getElementById("root")).render(<App />);
