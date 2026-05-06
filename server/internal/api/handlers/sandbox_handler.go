package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// sandboxStore defines the narrow interface the sandbox handler needs.
// It composes multiple focused store interfaces — the handler orchestrates
// creation across orgs, projects, environments, flags, segments, and API keys.
type sandboxStore interface {
	domain.SandboxStore
	domain.OrgWriter
	domain.ProjectWriter
	domain.EnvironmentWriter
	domain.FlagWriter
	domain.SegmentStore
	domain.APIKeyStore
	domain.UserWriter
	domain.UserReader
	domain.OrgLifecycleStore
}

// SandboxHandler manages the public sandbox API for ephemeral demo orgs.
type SandboxHandler struct {
	store      sandboxStore
	logger     *slog.Logger
	sandboxTTL time.Duration
}

// NewSandboxHandler creates a SandboxHandler.
func NewSandboxHandler(store sandboxStore, sandboxTTL time.Duration, logger *slog.Logger) *SandboxHandler {
	return &SandboxHandler{
		store:      store,
		logger:     logger,
		sandboxTTL: sandboxTTL,
	}
}

// l returns a request-scoped logger with the handler name attached.
func (h *SandboxHandler) l(r *http.Request) *slog.Logger {
	return httputil.LoggerFromContext(r.Context()).With("handler", "sandbox")
}

// ─── Sandbox creation ────────────────────────────────────────────────

// Create handles POST /api/sandbox. It creates a complete ephemeral demo
// organization with pre-seeded flags, segments, environments, and an
// evaluation API key. No authentication required.
func (h *SandboxHandler) Create(w http.ResponseWriter, r *http.Request) {
	log := h.l(r)

	// Generate unique IDs for the sandbox and its constituent entities.
	// The sandbox ID is client-generated with a "sbx_" prefix.
	// Org/project/env/flag/segment IDs come from PostgreSQL RETURNING.
	sandboxID := "sbx_" + generateRandomHex(16)

	// Create the Organization (name derived from sandbox ID)
	now := time.Now().UTC()
	org := &domain.Organization{
		Name:       "Demo Org " + sandboxID[4:12],
		Slug:       "demo-" + sandboxID[4:12],
		Plan:       domain.PlanFree,
		DataRegion: domain.RegionUS,
	}
	if err := h.store.CreateOrganization(r.Context(), org); err != nil {
		log.Error("failed to create sandbox org", "error", err, "sandbox_id", sandboxID)
		httputil.Error(w, http.StatusInternalServerError, "failed to create sandbox")
		return
	}
	log.Info("sandbox org created", "sandbox_id", sandboxID, "org_id", org.ID)

	// Create the Project
	project := &domain.Project{
		OrgID: org.ID,
		Name:  "Demo",
		Slug:  "demo",
	}
	if err := h.store.CreateProject(r.Context(), project); err != nil {
		log.Error("failed to create sandbox project", "error", err, "sandbox_id", sandboxID, "org_id", org.ID)
		httputil.Error(w, http.StatusInternalServerError, "failed to create sandbox")
		return
	}
	log.Info("sandbox project created", "sandbox_id", sandboxID, "project_id", project.ID)

	// Create Development environment
	devEnv := &domain.Environment{
		ProjectID: project.ID,
		OrgID:     org.ID,
		Name:      "Development",
		Slug:      "development",
		Color:     "#3b82f6", // blue
	}
	if err := h.store.CreateEnvironment(r.Context(), devEnv); err != nil {
		log.Error("failed to create dev env", "error", err, "sandbox_id", sandboxID)
		httputil.Error(w, http.StatusInternalServerError, "failed to create sandbox")
		return
	}

	// Create Production environment
	prodEnv := &domain.Environment{
		ProjectID: project.ID,
		OrgID:     org.ID,
		Name:      "Production",
		Slug:      "production",
		Color:     "#22c55e", // green
	}
	if err := h.store.CreateEnvironment(r.Context(), prodEnv); err != nil {
		log.Error("failed to create prod env", "error", err, "sandbox_id", sandboxID)
		httputil.Error(w, http.StatusInternalServerError, "failed to create sandbox")
		return
	}
	log.Info("sandbox environments created", "sandbox_id", sandboxID, "dev_env_id", devEnv.ID, "prod_env_id", prodEnv.ID)

	// ── Demo Flags ──────────────────────────────────────────────────
	type demoFlag struct {
		key          string
		name         string
		category     domain.FlagCategory
		flagType     domain.FlagType
		defaultValue json.RawMessage
		description  string
	}

	demoFlags := []demoFlag{
		{key: "dark-mode", name: "Dark Mode", category: domain.CategoryRelease, flagType: domain.FlagTypeBoolean, defaultValue: json.RawMessage("true"), description: "Toggle dark mode across the application"},
		{key: "beta-dashboard", name: "Beta Dashboard", category: domain.CategoryExperiment, flagType: domain.FlagTypeBoolean, defaultValue: json.RawMessage("false"), description: "New analytics dashboard for beta testers"},
		{key: "new-checkout", name: "New Checkout", category: domain.CategoryRelease, flagType: domain.FlagTypeBoolean, defaultValue: json.RawMessage("true"), description: "Redesigned checkout experience"},
		{key: "maintenance-banner", name: "Maintenance Banner", category: domain.CategoryOps, flagType: domain.FlagTypeBoolean, defaultValue: json.RawMessage("false"), description: "Show maintenance banner to all users"},
		{key: "admin-preview", name: "Admin Preview", category: domain.CategoryPermission, flagType: domain.FlagTypeBoolean, defaultValue: json.RawMessage("true"), description: "Enable admin-only preview features"},
	}

	for _, df := range demoFlags {
		flag := &domain.Flag{
			ProjectID:    project.ID,
			OrgID:        org.ID,
			Key:          df.key,
			Name:         df.name,
			Description:  df.description,
			FlagType:     df.flagType,
			Category:     df.category,
			Status:       domain.StatusActive,
			DefaultValue: df.defaultValue,
			Tags:         []string{"demo", "sandbox"},
		}
		if err := h.store.CreateFlag(r.Context(), flag); err != nil {
			log.Error("failed to create demo flag", "error", err, "flag_key", df.key, "sandbox_id", sandboxID)
			httputil.Error(w, http.StatusInternalServerError, "failed to create sandbox")
			return
		}

		// Create flag state entries for both environments.
		// In dev, all flags are enabled. In prod, only some are enabled.
		devEnabled := true
		prodEnabled := df.defaultValue != nil && string(df.defaultValue) == "true"

		for _, env := range []*domain.Environment{devEnv, prodEnv} {
			enabled := devEnabled
			if env.ID == prodEnv.ID {
				enabled = prodEnabled
			}
			fs := &domain.FlagState{
				FlagID:  flag.ID,
				EnvID:   env.ID,
				OrgID:   org.ID,
				Enabled: enabled,
			}
			if err := h.store.UpsertFlagState(r.Context(), fs); err != nil {
				log.Error("failed to upsert flag state", "error", err, "flag_key", df.key, "env_id", env.ID, "sandbox_id", sandboxID)
				httputil.Error(w, http.StatusInternalServerError, "failed to create sandbox")
				return
			}
		}
	}
	log.Info("demo flags created", "sandbox_id", sandboxID, "count", len(demoFlags))

	// ── Demo Segments ────────────────────────────────────────────────

	// Segment 1: Internal Users (email ends with @mycompany.com)
	internalUsers := &domain.Segment{
		ProjectID:   project.ID,
		OrgID:       org.ID,
		Key:         "internal-users",
		Name:        "Internal Users",
		Description: "Users with @mycompany.com email addresses",
		MatchType:   domain.MatchAll,
		Rules: []domain.Condition{
			{
				Attribute: "email",
				Operator:  domain.OpEndsWith,
				Values:    []string{"@mycompany.com"},
			},
		},
	}
	if err := h.store.CreateSegment(r.Context(), internalUsers); err != nil {
		log.Error("failed to create internal-users segment", "error", err, "sandbox_id", sandboxID)
		httputil.Error(w, http.StatusInternalServerError, "failed to create sandbox")
		return
	}

	// Segment 2: Beta Testers (email in list)
	betaTesters := &domain.Segment{
		ProjectID:   project.ID,
		OrgID:       org.ID,
		Key:         "beta-testers",
		Name:        "Beta Testers",
		Description: "Users in the beta program",
		MatchType:   domain.MatchAll,
		Rules: []domain.Condition{
			{
				Attribute: "email",
				Operator:  domain.OpIn,
				Values:    []string{"alpha@example.com", "beta@example.com", "gamma@example.com"},
			},
		},
	}
	if err := h.store.CreateSegment(r.Context(), betaTesters); err != nil {
		log.Error("failed to create beta-testers segment", "error", err, "sandbox_id", sandboxID)
		httputil.Error(w, http.StatusInternalServerError, "failed to create sandbox")
		return
	}
	log.Info("demo segments created", "sandbox_id", sandboxID)

	// ── API Key (evaluation key for the Production environment) ──────
	rawKey, keyHash, keyPrefix := generateSandboxAPIKey()
	apiKey := &domain.APIKey{
		EnvID:     prodEnv.ID,
		OrgID:     org.ID,
		KeyHash:   keyHash,
		KeyPrefix: keyPrefix,
		Name:      "Sandbox Eval Key",
		Type:      domain.APIKeyServer,
	}
	if err := h.store.CreateAPIKey(r.Context(), apiKey); err != nil {
		log.Error("failed to create sandbox API key", "error", err, "sandbox_id", sandboxID)
		httputil.Error(w, http.StatusInternalServerError, "failed to create sandbox")
		return
	}
	log.Info("sandbox API key created", "sandbox_id", sandboxID, "api_key_id", apiKey.ID)

	// ── Persist the Sandbox record ───────────────────────────────────
	expiresAt := now.Add(h.sandboxTTL)
	sb := &domain.Sandbox{
		ID:           sandboxID,
		OrgID:        org.ID,
		ProjectID:    project.ID,
		DevEnvID:     devEnv.ID,
		ProdEnvID:    prodEnv.ID,
		APIKeyID:     apiKey.ID,
		EnvKey:       rawKey,
		EnvKeyHash:   keyHash,
		EnvKeyPrefix: keyPrefix,
		Status:       domain.SandboxStatusActive,
		CreatedAt:    now,
		ExpiresAt:    expiresAt,
		UpdatedAt:    now,
	}
	if err := h.store.CreateSandbox(r.Context(), sb); err != nil {
		log.Error("failed to persist sandbox record", "error", err, "sandbox_id", sandboxID)
		httputil.Error(w, http.StatusInternalServerError, "failed to create sandbox")
		return
	}

	log.Info("sandbox created successfully",
		"sandbox_id", sandboxID,
		"org_id", org.ID,
		"expires_at", expiresAt.Format(time.RFC3339),
	)

	// Return the env_key (plaintext, shown once) along with entity IDs
	httputil.JSON(w, http.StatusCreated, map[string]interface{}{
		"sandbox_id":  sb.ID,
		"env_key":     sb.EnvKey,
		"org_id":      sb.OrgID,
		"project_id":  sb.ProjectID,
		"dev_env_id":  sb.DevEnvID,
		"prod_env_id": sb.ProdEnvID,
		"expires_at":  sb.ExpiresAt,
	})
}

// ─── Sandbox retrieval ───────────────────────────────────────────────

// Get handles GET /api/sandbox/{id}. Returns the sandbox status and metadata.
// The env_key is NEVER returned after creation — it is shown only once.
func (h *SandboxHandler) Get(w http.ResponseWriter, r *http.Request) {
	log := h.l(r)
	id := chi.URLParam(r, "id")

	sb, err := h.store.GetSandbox(r.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "sandbox not found")
			return
		}
		log.Error("failed to get sandbox", "error", err, "sandbox_id", id)
		httputil.Error(w, http.StatusInternalServerError, "failed to get sandbox")
		return
	}

	// Never expose the raw env_key after creation.
	// Return status with identifiers and expiry.
	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"id":             sb.ID,
		"status":         sb.Status,
		"org_id":         sb.OrgID,
		"project_id":     sb.ProjectID,
		"dev_env_id":     sb.DevEnvID,
		"prod_env_id":    sb.ProdEnvID,
		"env_key_prefix": sb.EnvKeyPrefix,
		"created_at":     sb.CreatedAt,
		"expires_at":     sb.ExpiresAt,
		"claimed_at":     sb.ClaimedAt,
	})
}

// ─── Sandbox claim ───────────────────────────────────────────────────

type claimSandboxRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name,omitempty"`
}

// Claim handles POST /api/sandbox/{id}/claim. It creates a real user account
// and marks the sandbox as claimed, converting the ephemeral demo into a
// permanent account.
func (h *SandboxHandler) Claim(w http.ResponseWriter, r *http.Request) {
	log := h.l(r)
	id := chi.URLParam(r, "id")

	var req claimSandboxRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Email == "" {
		httputil.Error(w, http.StatusBadRequest, "email is required")
		return
	}
	if req.Password == "" {
		httputil.Error(w, http.StatusBadRequest, "password is required")
		return
	}
	if len(req.Password) < 8 {
		httputil.Error(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}

	sb, err := h.store.GetSandbox(r.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "sandbox not found")
			return
		}
		log.Error("failed to get sandbox for claim", "error", err, "sandbox_id", id)
		httputil.Error(w, http.StatusInternalServerError, "failed to claim sandbox")
		return
	}

	if sb.Status != domain.SandboxStatusActive {
		httputil.Error(w, http.StatusConflict, "sandbox is no longer available for claiming")
		return
	}

	// Check if email is already registered
	if _, err := h.store.GetUserByEmail(r.Context(), req.Email); err == nil {
		httputil.Error(w, http.StatusConflict, "email already registered")
		return
	}

	// Hash the password using bcrypt (same as auth.HashPassword)
	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		log.Error("failed to hash password", "error", err, "sandbox_id", id)
		httputil.Error(w, http.StatusInternalServerError, "failed to claim sandbox")
		return
	}

	// Create the user account
	user := &domain.User{
		Email:        req.Email,
		PasswordHash: passwordHash,
		Name:         req.Name,
	}
	if user.Name == "" {
		user.Name = req.Email
	}

	if err := h.store.CreateUser(r.Context(), user); err != nil {
		log.Error("failed to create user for sandbox claim", "error", err, "sandbox_id", id, "email", req.Email)
		if errors.Is(err, domain.ErrConflict) {
			httputil.Error(w, http.StatusConflict, "email already registered")
			return
		}
		httputil.Error(w, http.StatusInternalServerError, "failed to claim sandbox")
		return
	}

	// Mark the sandbox as claimed
	if err := h.store.ClaimSandbox(r.Context(), id, user.ID); err != nil {
		log.Error("failed to mark sandbox as claimed", "error", err, "sandbox_id", id, "user_id", user.ID)
		httputil.Error(w, http.StatusInternalServerError, "failed to claim sandbox")
		return
	}

	log.Info("sandbox claimed",
		"sandbox_id", id,
		"user_id", user.ID,
		"email", req.Email,
	)

	// Return success — the frontend will redirect to login
	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"claimed": true,
		"message": "Sandbox claimed successfully. Please log in with your new account.",
	})
}

// ─── Sandbox cleanup (called by background goroutine) ────────────────

// CleanupExpired soft-deletes active sandboxes that have passed their TTL,
// and hard-deletes sandboxes that have been expired for more than 7 days.
// This is called by a background goroutine on a configurable interval.
// It accepts a context.Context for cancellation and timeout support.
func (h *SandboxHandler) CleanupExpired(ctx context.Context) {
	log := h.logger.With("component", "sandbox_cleanup")

	// Step 1: Soft-delete active but expired sandboxes
	expired, err := h.store.ListExpiredSandboxes(ctx)
	if err != nil {
		log.Error("failed to list expired sandboxes", "error", err)
		return
	}
	for _, sb := range expired {
		if err := h.store.SoftDeleteSandbox(ctx, sb.ID); err != nil {
			log.Error("failed to soft-delete sandbox", "error", err, "sandbox_id", sb.ID)
			continue
		}
		log.Info("sandbox soft-deleted (expired)",
			"sandbox_id", sb.ID,
			"org_id", sb.OrgID,
			"expired_at", sb.ExpiresAt.Format(time.RFC3339),
		)
	}

	// Step 2: Hard-delete sandboxes expired for more than 7 days
	staleRetention := 7 * 24 * time.Hour
	stale, err := h.store.ListExpiredClaimedSandboxes(ctx, staleRetention)
	if err != nil {
		log.Error("failed to list stale sandboxes for hard delete", "error", err)
		return
	}
	for _, sb := range stale {
		// Soft-delete the org first (cascades to projects, envs, flags, segments)
		if err := h.store.SoftDeleteOrganization(ctx, sb.OrgID); err != nil {
			log.Warn("failed to soft-delete sandbox org", "error", err, "sandbox_id", sb.ID, "org_id", sb.OrgID)
		}
		if err := h.store.HardDeleteSandbox(ctx, sb.ID); err != nil {
			log.Error("failed to hard-delete sandbox", "error", err, "sandbox_id", sb.ID)
			continue
		}
		log.Info("sandbox hard-deleted", "sandbox_id", sb.ID, "org_id", sb.OrgID)
	}

	if len(expired) > 0 || len(stale) > 0 {
		log.Info("sandbox cleanup cycle complete",
			"soft_deleted", len(expired),
			"hard_deleted", len(stale),
		)
	}
}

// ─── Helpers ─────────────────────────────────────────────────────────

// generateRandomHex returns a hex-encoded random string of the given byte length.
func generateRandomHex(byteLen int) string {
	b := make([]byte, byteLen)
	if _, err := rand.Read(b); err != nil {
		// crypto/rand.Read only fails on broken systems.
		panic(fmt.Sprintf("crypto/rand.Read failed: %v", err))
	}
	return hex.EncodeToString(b)
}

// generateSandboxAPIKey creates an evaluation API key for a sandbox.
// The key uses a "fs_sbx_" prefix for identification and is hashed
// using HMAC-SHA-256 with the server-side pepper (same as HashAPIKey).
func generateSandboxAPIKey() (rawKey, keyHash, keyPrefix string) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		panic(fmt.Sprintf("crypto/rand.Read failed: %v", err))
	}
	rawKey = "fs_sbx_" + hex.EncodeToString(b)
	keyHash = HashAPIKey(rawKey)
	keyPrefix = rawKey[:12] // "fs_sbx_" + first 5 hex chars
	return rawKey, keyHash, keyPrefix
}
