package postgres

import (
	"context"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// ─── Sandboxes ────────────────────────────────────────────────────────

// CreateSandbox inserts a new sandbox record.
func (s *Store) CreateSandbox(ctx context.Context, sb *domain.Sandbox) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO sandboxes (id, org_id, project_id, dev_env_id, prod_env_id, api_key_id,
			env_key, env_key_hash, env_key_prefix, status, claimed_by, created_at, expires_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
		sb.ID, sb.OrgID, sb.ProjectID, sb.DevEnvID, sb.ProdEnvID, sb.APIKeyID,
		sb.EnvKey, sb.EnvKeyHash, sb.EnvKeyPrefix, sb.Status, sb.ClaimedBy,
		sb.CreatedAt, sb.ExpiresAt, sb.UpdatedAt,
	)
	return wrapConflict(err, "sandbox")
}

// GetSandbox retrieves a sandbox by ID.
func (s *Store) GetSandbox(ctx context.Context, id string) (*domain.Sandbox, error) {
	sb := &domain.Sandbox{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, org_id, project_id, dev_env_id, prod_env_id, api_key_id,
			env_key, env_key_hash, env_key_prefix, status, claimed_by,
			created_at, expires_at, claimed_at, updated_at
		 FROM sandboxes WHERE id = $1`, id,
	).Scan(&sb.ID, &sb.OrgID, &sb.ProjectID, &sb.DevEnvID, &sb.ProdEnvID, &sb.APIKeyID,
		&sb.EnvKey, &sb.EnvKeyHash, &sb.EnvKeyPrefix, &sb.Status, &sb.ClaimedBy,
		&sb.CreatedAt, &sb.ExpiresAt, &sb.ClaimedAt, &sb.UpdatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "sandbox")
	}
	return sb, nil
}

// ClaimSandbox marks a sandbox as claimed by a user.
func (s *Store) ClaimSandbox(ctx context.Context, id string, userID string) error {
	result, err := s.pool.Exec(ctx,
		`UPDATE sandboxes SET status = $2, claimed_by = $3, claimed_at = NOW(), updated_at = NOW()
		 WHERE id = $1 AND status = $4`,
		id, domain.SandboxStatusClaimed, userID, domain.SandboxStatusActive,
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domain.WrapNotFound("sandbox")
	}
	return nil
}

// ListExpiredSandboxes returns all active sandboxes that have passed their
// expiration time and are ready for cleanup.
func (s *Store) ListExpiredSandboxes(ctx context.Context) ([]domain.Sandbox, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, org_id, project_id, dev_env_id, prod_env_id, api_key_id,
			env_key, env_key_hash, env_key_prefix, status, claimed_by,
			created_at, expires_at, claimed_at, updated_at
		 FROM sandboxes
		 WHERE status = $1 AND expires_at < NOW()
		 ORDER BY expires_at ASC`,
		domain.SandboxStatusActive,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sandboxes []domain.Sandbox
	for rows.Next() {
		var sb domain.Sandbox
		if err := rows.Scan(&sb.ID, &sb.OrgID, &sb.ProjectID, &sb.DevEnvID, &sb.ProdEnvID, &sb.APIKeyID,
			&sb.EnvKey, &sb.EnvKeyHash, &sb.EnvKeyPrefix, &sb.Status, &sb.ClaimedBy,
			&sb.CreatedAt, &sb.ExpiresAt, &sb.ClaimedAt, &sb.UpdatedAt); err != nil {
			return nil, err
		}
		sandboxes = append(sandboxes, sb)
	}
	return sandboxes, rows.Err()
}

// SoftDeleteSandbox marks a sandbox as expired (soft delete).
func (s *Store) SoftDeleteSandbox(ctx context.Context, id string) error {
	result, err := s.pool.Exec(ctx,
		`UPDATE sandboxes SET status = $2, updated_at = NOW() WHERE id = $1`,
		id, domain.SandboxStatusExpired,
	)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return domain.WrapNotFound("sandbox")
	}
	return nil
}

// HardDeleteSandbox permanently removes a sandbox record. The caller is
// responsible for also cleaning up the associated org, project, envs,
// flags, segments, and API key.
func (s *Store) HardDeleteSandbox(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx,
		`DELETE FROM sandboxes WHERE id = $1`, id,
	)
	return err
}

// ListExpiredClaimedSandboxes returns claimed sandboxes that have been
// expired for more than the specified duration. Used for hard-delete
// cleanup of old sandbox data.
func (s *Store) ListExpiredClaimedSandboxes(ctx context.Context, olderThan time.Duration) ([]domain.Sandbox, error) {
	// Convert duration to seconds for PostgreSQL make_interval.
	secs := int64(olderThan.Seconds())
	rows, err := s.pool.Query(ctx,
		`SELECT id, org_id, project_id, dev_env_id, prod_env_id, api_key_id,
			env_key, env_key_hash, env_key_prefix, status, claimed_by,
			created_at, expires_at, claimed_at, updated_at
		 FROM sandboxes
		 WHERE status = $1 AND expires_at < NOW() - make_interval(secs => $2)
		 ORDER BY expires_at ASC`,
		domain.SandboxStatusExpired, secs,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var sandboxes []domain.Sandbox
	for rows.Next() {
		var sb domain.Sandbox
		if err := rows.Scan(&sb.ID, &sb.OrgID, &sb.ProjectID, &sb.DevEnvID, &sb.ProdEnvID, &sb.APIKeyID,
			&sb.EnvKey, &sb.EnvKeyHash, &sb.EnvKeyPrefix, &sb.Status, &sb.ClaimedBy,
			&sb.CreatedAt, &sb.ExpiresAt, &sb.ClaimedAt, &sb.UpdatedAt); err != nil {
			return nil, err
		}
		sandboxes = append(sandboxes, sb)
	}
	return sandboxes, rows.Err()
}
