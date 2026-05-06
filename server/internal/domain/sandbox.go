package domain

import (
	"context"
	"time"
)

// Sandbox represents an ephemeral demo organization with pre-seeded flags,
// segments, environments, and an evaluation API key. Sandboxes enable the
// product-first landing experience — users can try the full product before
// signing up.
type Sandbox struct {
	ID           string     `json:"id" db:"id"`
	OrgID        string     `json:"org_id" db:"org_id"`
	ProjectID    string     `json:"project_id" db:"project_id"`
	DevEnvID     string     `json:"dev_env_id" db:"dev_env_id"`
	ProdEnvID    string     `json:"prod_env_id" db:"prod_env_id"`
	APIKeyID     string     `json:"api_key_id" db:"api_key_id"`
	EnvKey       string     `json:"env_key" db:"env_key"`          // Plaintext eval API key (shown once)
	EnvKeyHash   string     `json:"-" db:"env_key_hash"`           // SHA-256 hash of the key
	EnvKeyPrefix string     `json:"env_key_prefix" db:"env_key_prefix"` // First 8 chars for identification
	Status       string     `json:"status" db:"status"`            // "active", "claimed", "expired"
	ClaimedBy    *string    `json:"claimed_by,omitempty" db:"claimed_by"`
	CreatedAt    time.Time  `json:"created_at" db:"created_at"`
	ExpiresAt    time.Time  `json:"expires_at" db:"expires_at"`
	ClaimedAt    *time.Time `json:"claimed_at,omitempty" db:"claimed_at"`
	UpdatedAt    time.Time  `json:"updated_at" db:"updated_at"`
}

// Sandbox status constants.
const (
	SandboxStatusActive  = "active"
	SandboxStatusClaimed = "claimed"
	SandboxStatusExpired = "expired"
)

// SandboxStore defines the persistence interface for sandbox operations.
type SandboxStore interface {
	CreateSandbox(ctx context.Context, sb *Sandbox) error
	GetSandbox(ctx context.Context, id string) (*Sandbox, error)
	ClaimSandbox(ctx context.Context, id string, userID string) error
	ListExpiredSandboxes(ctx context.Context) ([]Sandbox, error)
	ListExpiredClaimedSandboxes(ctx context.Context, olderThan time.Duration) ([]Sandbox, error)
	SoftDeleteSandbox(ctx context.Context, id string) error
	HardDeleteSandbox(ctx context.Context, id string) error
}
