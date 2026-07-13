import "dotenv/config";
import express from "express";
import cors from "cors";
import { ChromaClient } from "chromadb";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pdfParse from "pdf-parse";

// ──────────────────────────────────────────────
// Config
// ──────────────────────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 5174;
const CHROMA_URL = process.env.CHROMA_URL || "http://localhost:8000";
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL || "mxbai-embed-large";
const GROQ_API_KEY = process.env.GROQ_API_KEY || "";
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const COLLECTION_NAME = "prd_docs";
const DATA_DIR = join(__dirname, "..", "data");

// ──────────────────────────────────────────────
// In-memory state
// ──────────────────────────────────────────────
let state = {
  pdf: null,
  chunks: 0,
  embeddedChunks: 0,
  storedChunks: 0,
  embeddingModel: EMBEDDING_MODEL,
  collectionName: COLLECTION_NAME,
};

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

// ──────────────────────────────────────────────
// Chunking: Recursive character text splitter
// ──────────────────────────────────────────────
function chunkText(text, chunkSize = 800, overlap = 120) {
  const chunks = [];
  const separators = ["\n\n", "\n", ". ", " ", ""];

  function splitRecursive(content, seps) {
    if (!content.trim()) return;
    if (content.length <= chunkSize) {
      chunks.push(content.trim());
      return;
    }

    const sep = seps[0];
    if (!sep) {
      // Force split by chunkSize
      for (let i = 0; i < content.length; i += chunkSize - overlap) {
        const slice = content.slice(i, i + chunkSize).trim();
        if (slice) chunks.push(slice);
      }
      return;
    }

    const parts = content.split(sep);
    let current = "";

    for (const part of parts) {
      if ((current + sep + part).length > chunkSize && current) {
        splitRecursive(current.trim(), seps.slice(1));
        current = part;
      } else {
        current = current ? current + sep + part : part;
      }
    }
    if (current.trim()) {
      splitRecursive(current.trim(), seps.slice(1));
    }
  }

  splitRecursive(text, separators);
  return chunks;
}

// ──────────────────────────────────────────────
// Embedding via Ollama
// ──────────────────────────────────────────────
async function getEmbedding(text) {
  const response = await fetch(`${OLLAMA_URL}/api/embeddings`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: EMBEDDING_MODEL, prompt: text }),
  });
  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Ollama embedding failed: ${err}`);
  }
  const data = await response.json();
  return data.embedding;
}

async function getEmbeddingsBatch(texts) {
  const embeddings = [];
  for (let i = 0; i < texts.length; i++) {
    const emb = await getEmbedding(texts[i]);
    embeddings.push(emb);
    // Small delay to avoid overwhelming Ollama
    if (i < texts.length - 1) await new Promise((r) => setTimeout(r, 50));
  }
  return embeddings;
}

// ──────────────────────────────────────────────
// Groq answer generation
// ──────────────────────────────────────────────
async function generateAnswer(question, contextChunks) {
  const context = contextChunks
    .map((c, i) => `[CHUNK ${i + 1}]: ${c.text}`)
    .join("\n\n");

  const systemPrompt = `You are a helpful assistant that answers questions based ONLY on the provided document context. 
If the answer cannot be found in the context, say so clearly. 
Always cite which chunks you used. Be concise and accurate.`;

  const userPrompt = `CONTEXT:\n${context}\n\nQUESTION: ${question}\n\nAnswer the question using only the information from the context above.`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

// ──────────────────────────────────────────────
// Express app
// ──────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// GET /api/status
app.get("/api/status", (_req, res) => {
  res.json(state);
});

// POST /api/ingest
app.post("/api/ingest", async (_req, res) => {
  try {
    // 1. Find PDF
    const fs = await import("fs");
    const files = fs.readdirSync(DATA_DIR);
    const pdfFile = files.find((f) => f.toLowerCase().endsWith(".pdf"));
    if (!pdfFile) {
      return res.status(404).json({ error: "No PDF found in /data folder" });
    }
    const pdfPath = join(DATA_DIR, pdfFile);
    const pdfBuffer = fs.readFileSync(pdfPath);
    const pdfStats = fs.statSync(pdfPath);

    state.pdf = {
      name: pdfFile,
      size: `${(pdfStats.size / 1024).toFixed(1)} KB`,
      path: pdfPath,
    };

    // 2. Parse PDF
    const pdfData = await pdfParse(pdfBuffer);
    const fullText = pdfData.text;

    if (!fullText || fullText.trim().length === 0) {
      return res.status(400).json({ error: "PDF contains no extractable text" });
    }

    // 3. Chunk
    const chunks = chunkText(fullText);
    state.chunks = chunks.length;

    // 4. Generate embeddings
    const embeddings = await getEmbeddingsBatch(chunks);
    state.embeddedChunks = embeddings.length;

    // 5. Store in ChromaDB
    const chroma = new ChromaClient({ path: CHROMA_URL });

    // Delete existing collection if present
    try {
      await chroma.deleteCollection({ name: COLLECTION_NAME });
    } catch (_) {
      // Collection doesn't exist yet — fine
    }

    const collection = await chroma.createCollection({
      name: COLLECTION_NAME,
      metadata: { "hnsw:space": "cosine" },
    });

    const ids = chunks.map((_, i) => `chunk_${i}`);
    const metadatas = chunks.map((_, i) => ({
      chunkIndex: i,
      totalChunks: chunks.length,
      source: pdfFile,
    }));

    // ChromaDB add in batches of 100
    const BATCH = 100;
    for (let i = 0; i < chunks.length; i += BATCH) {
      const end = Math.min(i + BATCH, chunks.length);
      await collection.add({
        ids: ids.slice(i, end),
        embeddings: embeddings.slice(i, end),
        documents: chunks.slice(i, end),
        metadatas: metadatas.slice(i, end),
      });
    }

    state.storedChunks = chunks.length;

    res.json(state);
  } catch (err) {
    console.error("Ingestion error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/query
app.post("/api/query", async (req, res) => {
  try {
    const { question } = req.body;
    if (!question?.trim()) {
      return res.status(400).json({ error: "Question is required" });
    }

    if (!GROQ_API_KEY || GROQ_API_KEY === "your-groq-api-key") {
      return res.status(400).json({ error: "GROQ_API_KEY not configured in .env" });
    }

    // 1. Generate query embedding
    const queryEmbedding = await getEmbedding(question.trim());

    // 2. Connect to ChromaDB and retrieve top 4
    const chroma = new ChromaClient({ path: CHROMA_URL });
    const collection = await chroma.getCollection({ name: COLLECTION_NAME });

    const results = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: 4,
      include: ["documents", "metadatas", "distances"],
    });

    // 3. Format retrieved chunks
    const retrievedChunks = (results.ids[0] || []).map((id, i) => {
      const distance = results.distances?.[0]?.[i] ?? 1;
      // Cosine distance → similarity (1 - distance for cosine distance)
      const similarity = Math.max(0, 1 - distance);
      return {
        id,
        text: results.documents?.[0]?.[i] || "",
        chunkIndex: results.metadatas?.[0]?.[i]?.chunkIndex ?? i,
        similarity: similarity,
        scoreLabel: `${(similarity * 100).toFixed(1)}% match`,
        metadata: results.metadatas?.[0]?.[i] || {},
      };
    });

    // 4. Generate answer via Groq
    const answer = await generateAnswer(question.trim(), retrievedChunks);

    res.json({
      question: question.trim(),
      answer,
      chunks: retrievedChunks,
    });
  } catch (err) {
    console.error("Query error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`\n🚀 RAG Explorer server running on http://localhost:${PORT}`);
  console.log(`   ChromaDB: ${CHROMA_URL}`);
  console.log(`   Ollama:   ${OLLAMA_URL}`);
  console.log(`   Embed:    ${EMBEDDING_MODEL}`);
  console.log(`   Groq:     ${GROQ_MODEL}\n`);
});