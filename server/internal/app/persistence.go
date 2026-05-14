package app

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"log"
	"time"

	_ "github.com/jackc/pgx/v5/stdlib"
)

const stateKey = "v1"

type persistentState struct {
	Users      map[string]User             `json:"users"`
	Tokens     map[string]string           `json:"tokens"`
	Devices    map[string]string           `json:"devices"`
	EmailIndex map[string]string           `json:"emailIndex,omitempty"`
	Passwords  map[string]string           `json:"passwords,omitempty"`
	Partners   map[string]PartnerLink      `json:"partners"`
	Messages   map[string][]PartnerMessage `json:"messages"`
	Records    map[string][]IntimacyRecord `json:"records"`
	Cycles     map[string][]CycleRecord    `json:"cycles"`
	Posts      []SocialPost                `json:"posts"`
	Reports    []Report                    `json:"reports"`
}

type PostgresPersistence struct {
	db *sql.DB
}

func NewPostgresPersistence(databaseURL string) (*PostgresPersistence, error) {
	if databaseURL == "" {
		return nil, nil
	}

	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	if err := pingWithRetry(ctx, db); err != nil {
		_ = db.Close()
		return nil, err
	}

	p := &PostgresPersistence{db: db}
	if err := p.ensureSchema(ctx); err != nil {
		_ = db.Close()
		return nil, err
	}
	return p, nil
}

func (p *PostgresPersistence) ensureSchema(ctx context.Context) error {
	_, err := p.db.ExecContext(ctx, `
		CREATE TABLE IF NOT EXISTS app_state (
			key TEXT PRIMARY KEY,
			value JSONB NOT NULL,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`)
	return err
}

func (p *PostgresPersistence) Load() (*persistentState, error) {
	if p == nil {
		return nil, nil
	}
	var raw []byte
	err := p.db.QueryRow(`SELECT value FROM app_state WHERE key = $1`, stateKey).Scan(&raw)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	var state persistentState
	if err := json.Unmarshal(raw, &state); err != nil {
		return nil, err
	}
	return &state, nil
}

func (p *PostgresPersistence) Save(state persistentState) {
	if p == nil {
		return
	}
	raw, err := json.Marshal(state)
	if err != nil {
		log.Printf("persist marshal failed: %v", err)
		return
	}
	if _, err := p.db.Exec(`
		INSERT INTO app_state (key, value, updated_at)
		VALUES ($1, $2, now())
		ON CONFLICT (key)
		DO UPDATE SET value = EXCLUDED.value, updated_at = now()
	`, stateKey, raw); err != nil {
		log.Printf("persist save failed: %v", err)
	}
}

func pingWithRetry(ctx context.Context, db *sql.DB) error {
	ticker := time.NewTicker(500 * time.Millisecond)
	defer ticker.Stop()
	var lastErr error
	for {
		if err := db.PingContext(ctx); err == nil {
			return nil
		} else {
			lastErr = err
		}
		select {
		case <-ctx.Done():
			if lastErr != nil {
				return lastErr
			}
			return ctx.Err()
		case <-ticker.C:
		}
	}
}
