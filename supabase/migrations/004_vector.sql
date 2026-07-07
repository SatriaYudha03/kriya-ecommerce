-- M3 AI Vector Migration
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS documents (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding vector(768) NOT NULL
);

-- HNSW Index untuk cosine similarity
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);

-- Fungsi pencarian untuk FastAPI
CREATE OR REPLACE FUNCTION match_documents(
    query_embedding vector(768),
    match_count int DEFAULT 10,
    filter_type text DEFAULT null
)
RETURNS TABLE (
    id bigint,
    content text,
    metadata jsonb,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        documents.id,
        documents.content,
        documents.metadata,
        1 - (documents.embedding <=> query_embedding) AS similarity
    FROM documents
    WHERE filter_type IS NULL OR documents.metadata->>'type' = filter_type
    ORDER BY documents.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;
