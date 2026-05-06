-- Migration: Sandboxes table for ephemeral demo orgs
-- Purpose: Enable product-first landing experience — users try before signup
-- Date: 2026-05-13

CREATE TABLE IF NOT EXISTS sandboxes (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    project_id TEXT NOT NULL,
    dev_env_id TEXT NOT NULL,
    prod_env_id TEXT NOT NULL,
    api_key_id TEXT NOT NULL,
    env_key TEXT NOT NULL,
    env_key_hash TEXT NOT NULL,
    env_key_prefix TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    claimed_by TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    claimed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sandboxes_status ON sandboxes(status);
CREATE INDEX IF NOT EXISTS idx_sandboxes_expires_at ON sandboxes(expires_at);
CREATE INDEX IF NOT EXISTS idx_sandboxes_org_id ON sandboxes(org_id);

-- Composite index for cleanup queries: find active sandboxes past expiry
CREATE INDEX IF NOT EXISTS idx_sandboxes_cleanup ON sandboxes(status, expires_at)
    WHERE status = 'active';

COMMENT ON TABLE sandboxes IS 'Ephemeral demo organizations for product-first landing experience';
COMMENT ON COLUMN sandboxes.env_key IS 'Plaintext evaluation API key — shown once at creation';
COMMENT ON COLUMN sandboxes.env_key_hash IS 'SHA-256 hash of the evaluation API key';
