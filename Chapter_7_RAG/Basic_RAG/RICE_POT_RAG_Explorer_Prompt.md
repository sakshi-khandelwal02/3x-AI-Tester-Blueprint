# RICE-POT Prompt: Build a Simple RAG Explorer

## Role

You are a senior full-stack AI engineer responsible for building a
simple Retrieval-Augmented Generation (RAG) Explorer that demonstrates
the complete document ingestion and retrieval workflow.

## Input

-   A React application as the frontend.
-   A `data/` folder containing a single PDF (Product Requirements
    Document).
-   ChromaDB running locally.
-   The Monic embedding model for document embeddings.
-   Groq as the LLM provider using the OpenGPT 120B model for answer
    generation.

## Constraints

-   Keep the application simple and educational.
-   Automatically ingest the PDF from `data/` on startup.
-   Split the PDF into chunks before embedding.
-   Store all embeddings in the local ChromaDB instance.
-   Do not require manual ingestion.
-   The UI should clearly demonstrate the ingestion and retrieval
    pipeline.

## Expectations

The application should: 1. Load the PDF from `data/`. 2. Chunk the
document. 3. Generate embeddings using the Monic embedding model. 4.
Store the embeddings in local ChromaDB. 5. Provide a search interface
where users can ask questions about the PDF. 6. Retrieve the Top 4 most
relevant chunks. 7. Send the retrieved context to Groq (OpenGPT 120B)
for answer generation. 8. Display both: - The generated answer. - The
Top 4 retrieved chunks with relevance scores (if available).

## Process

1.  Read the PDF.
2.  Chunk the document.
3.  Generate embeddings.
4.  Store embeddings in ChromaDB.
5.  Accept a user query.
6.  Embed the query.
7.  Retrieve the Top 4 matching chunks.
8.  Display the retrieved chunks.
9.  Send the chunks and query to Groq.
10. Display the final answer.

## Output

Build a React application with: - A clean, minimal UI. - Automatic
document ingestion. - A query input box. - A section showing the Top 4
retrieved chunks. - A section displaying the final LLM response. - Clear
separation between retrieval and generation so users can understand the
RAG workflow.

## Tone

Keep the implementation simple, educational, and easy to understand.
Prioritize clarity over production-grade complexity.
