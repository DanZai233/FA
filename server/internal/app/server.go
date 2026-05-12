package app

import (
	"encoding/json"
	"net/http"
	"strings"
	"time"
)

type Server struct {
	cfg   Config
	store *MemoryStore
}

func NewServer(cfg Config, store *MemoryStore) *Server {
	return &Server{cfg: cfg, store: store}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", s.handleHealth)
	mux.HandleFunc("POST /api/v1/auth/login", s.handleLogin)
	mux.HandleFunc("GET /api/v1/me", s.withAuth(s.handleMe))
	mux.HandleFunc("PUT /api/v1/me", s.withAuth(s.handleUpdateMe))
	mux.HandleFunc("GET /api/v1/me/export", s.withAuth(s.handleDataExport))
	mux.HandleFunc("DELETE /api/v1/me", s.withAuth(s.handleDeleteMe))
	mux.HandleFunc("GET /api/v1/records", s.withAuth(s.handleGetRecords))
	mux.HandleFunc("POST /api/v1/records", s.withAuth(s.handleCreateRecord))
	mux.HandleFunc("PUT /api/v1/records/{id}", s.withAuth(s.handleUpdateRecord))
	mux.HandleFunc("DELETE /api/v1/records/{id}", s.withAuth(s.handleDeleteRecord))
	mux.HandleFunc("GET /api/v1/cycles", s.withAuth(s.handleGetCycles))
	mux.HandleFunc("POST /api/v1/cycles", s.withAuth(s.handleCreateCycle))
	mux.HandleFunc("GET /api/v1/cycles/prediction", s.withAuth(s.handleCyclePrediction))
	mux.HandleFunc("GET /api/v1/reminders/summary", s.withAuth(s.handleReminderSummary))
	mux.HandleFunc("GET /api/v1/partners", s.withAuth(s.handleGetPartner))
	mux.HandleFunc("POST /api/v1/partners/invite", s.withAuth(s.handleCreatePartnerInvite))
	mux.HandleFunc("POST /api/v1/partners/accept", s.withAuth(s.handleAcceptPartnerInvite))
	mux.HandleFunc("DELETE /api/v1/partners", s.withAuth(s.handleUnlinkPartner))
	mux.HandleFunc("GET /api/v1/partners/messages", s.withAuth(s.handlePartnerMessages))
	mux.HandleFunc("POST /api/v1/partners/messages", s.withAuth(s.handleCreatePartnerMessage))
	mux.HandleFunc("GET /api/v1/knowledge/cards", s.withAuth(s.handleKnowledgeCards))
	mux.HandleFunc("GET /api/v1/phrases", s.withAuth(s.handlePhrases))
	mux.HandleFunc("POST /api/v1/messages/compose", s.withAuth(s.handleCompose))
	mux.HandleFunc("GET /api/v1/social/posts", s.withAuth(s.handleGetPosts))
	mux.HandleFunc("POST /api/v1/social/posts", s.withAuth(s.handleCreatePost))
	mux.HandleFunc("POST /api/v1/social/posts/{id}/resonate", s.withAuth(s.handleResonatePost))
	mux.HandleFunc("POST /api/v1/social/posts/{id}/block", s.withAuth(s.handleBlockPost))
	mux.HandleFunc("POST /api/v1/matches/shake", s.withAuth(s.handleShake))
	mux.HandleFunc("POST /api/v1/reports", s.withAuth(s.handleReport))
	mux.HandleFunc("GET /privacy", s.handleLegal("privacy"))
	mux.HandleFunc("GET /terms", s.handleLegal("terms"))
	mux.HandleFunc("GET /support", s.handleLegal("support"))
	mux.HandleFunc("GET /delete-account", s.handleLegal("delete-account"))
	return s.withCORS(mux)
}

func (s *Server) withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", s.cfg.AllowedOrigin)
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func (s *Server) handleHealth(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]string{"status": "ok", "service": "faleme-api"})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if s.cfg.RequireAdultAck && !req.AdultConfirmed {
		writeError(w, http.StatusForbidden, "adult confirmation required")
		return
	}
	token, user := s.store.CreateUser(req)
	writeJSON(w, http.StatusOK, AuthResponse{Token: token, User: user})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, currentUser(r))
}

func (s *Server) handleUpdateMe(w http.ResponseWriter, r *http.Request) {
	var req UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	user, err := s.store.UpdateUser(currentUser(r).ID, req)
	if err != nil {
		writeError(w, http.StatusNotFound, "user not found")
		return
	}
	writeJSON(w, http.StatusOK, user)
}

func (s *Server) handleDataExport(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.store.Export(currentUser(r)))
}

func (s *Server) handleDeleteMe(w http.ResponseWriter, r *http.Request) {
	s.store.DeleteUser(currentUser(r).ID)
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (s *Server) handleGetRecords(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.store.Records(currentUser(r).ID))
}

func (s *Server) handleCreateRecord(w http.ResponseWriter, r *http.Request) {
	var record IntimacyRecord
	if err := json.NewDecoder(r.Body).Decode(&record); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if record.OccurredAt == "" {
		record.OccurredAt = time.Now().Format("2006-01-02")
	}
	writeJSON(w, http.StatusCreated, s.store.AddRecord(currentUser(r).ID, record))
}

func (s *Server) handleUpdateRecord(w http.ResponseWriter, r *http.Request) {
	var record IntimacyRecord
	if err := json.NewDecoder(r.Body).Decode(&record); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	if record.OccurredAt == "" {
		record.OccurredAt = time.Now().Format("2006-01-02")
	}
	updated, err := s.store.UpdateRecord(currentUser(r).ID, r.PathValue("id"), record)
	if err != nil {
		writeError(w, http.StatusNotFound, "record not found")
		return
	}
	writeJSON(w, http.StatusOK, updated)
}

func (s *Server) handleDeleteRecord(w http.ResponseWriter, r *http.Request) {
	if err := s.store.DeleteRecord(currentUser(r).ID, r.PathValue("id")); err != nil {
		writeError(w, http.StatusNotFound, "record not found")
		return
	}
	writeJSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}

func (s *Server) handleGetCycles(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.store.Cycles(currentUser(r).ID))
}

func (s *Server) handleCreateCycle(w http.ResponseWriter, r *http.Request) {
	var cycle CycleRecord
	if err := json.NewDecoder(r.Body).Decode(&cycle); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	writeJSON(w, http.StatusCreated, s.store.AddCycle(currentUser(r).ID, cycle))
}

func (s *Server) handleCyclePrediction(w http.ResponseWriter, r *http.Request) {
	userID := currentUser(r).ID
	writeJSON(w, http.StatusOK, PredictCycle(s.store.Cycles(userID), s.store.Records(userID)))
}

func (s *Server) handleReminderSummary(w http.ResponseWriter, r *http.Request) {
	userID := currentUser(r).ID
	records := s.store.Records(userID)
	prediction := PredictCycle(s.store.Cycles(userID), records)
	safe := 0
	for _, record := range records {
		if record.Protection != ProtectionNone {
			safe++
		}
	}
	safeRate := 0
	if len(records) > 0 {
		safeRate = safe * 100 / len(records)
	}
	writeJSON(w, http.StatusOK, ReminderSummary{
		Title:       "今日安全员巡逻完毕",
		Body:        "同意、保护、清醒、舒适。成年人可以嘴硬，流程不能省。",
		Advice:      prediction.TodayAdvice,
		RecordCount: len(records),
		SafeRate:    safeRate,
	})
}

func (s *Server) handleGetPartner(w http.ResponseWriter, r *http.Request) {
	link, err := s.store.Partner(currentUser(r).ID)
	if err != nil {
		writeJSON(w, http.StatusOK, PartnerLink{Status: "none"})
		return
	}
	writeJSON(w, http.StatusOK, link)
}

func (s *Server) handleCreatePartnerInvite(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusCreated, s.store.CreateInvite(currentUser(r).ID))
}

func (s *Server) handleAcceptPartnerInvite(w http.ResponseWriter, r *http.Request) {
	var req struct {
		InviteCode string `json:"inviteCode"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.InviteCode) == "" {
		writeError(w, http.StatusBadRequest, "inviteCode required")
		return
	}
	writeJSON(w, http.StatusOK, s.store.AcceptInvite(currentUser(r).ID, req.InviteCode))
}

func (s *Server) handleUnlinkPartner(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.store.UnlinkPartner(currentUser(r).ID))
}

func (s *Server) handlePartnerMessages(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.store.PartnerMessages(currentUser(r).ID))
}

func (s *Server) handleCreatePartnerMessage(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Phrase string `json:"phrase"`
		Scene  string `json:"scene"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	writeJSON(w, http.StatusCreated, s.store.AddPartnerMessage(currentUser(r).ID, req.Phrase, req.Scene))
}

func (s *Server) handleKnowledgeCards(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, knowledgeCards)
}

func (s *Server) handlePhrases(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, phraseTemplates)
}

func (s *Server) handleCompose(w http.ResponseWriter, r *http.Request) {
	var req ComposeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	phrase := strings.Join([]string{req.Tone, req.Subject, req.Action, req.Ending}, " / ")
	writeJSON(w, http.StatusOK, map[string]string{"phrase": phrase})
}

func (s *Server) handleGetPosts(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, s.store.Posts())
}

func (s *Server) handleCreatePost(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Phrase string `json:"phrase"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.Phrase) == "" {
		writeError(w, http.StatusBadRequest, "phrase required")
		return
	}
	writeJSON(w, http.StatusCreated, s.store.AddPost(currentUser(r).ID, req.Phrase))
}

func (s *Server) handleResonatePost(w http.ResponseWriter, r *http.Request) {
	post, err := s.store.ResonatePost(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusNotFound, "post not found")
		return
	}
	writeJSON(w, http.StatusOK, post)
}

func (s *Server) handleBlockPost(w http.ResponseWriter, r *http.Request) {
	post, err := s.store.BlockPost(r.PathValue("id"))
	if err != nil {
		writeError(w, http.StatusNotFound, "post not found")
		return
	}
	writeJSON(w, http.StatusOK, post)
}

func (s *Server) handleShake(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, MatchCard{
		ID:        "match-demo",
		Alias:     "附近不存在的人",
		Phrase:    "今晚月色不错 / 这位成年人 / 申请抱抱 / 但安全第一",
		ExpiresAt: time.Now().Add(24 * time.Hour),
	})
}

func (s *Server) handleReport(w http.ResponseWriter, r *http.Request) {
	var req CreateReportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.TargetID) == "" {
		writeError(w, http.StatusBadRequest, "targetId required")
		return
	}
	writeJSON(w, http.StatusCreated, s.store.Report(currentUser(r).ID, req))
}

func (s *Server) handleLegal(kind string) http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{
			"kind":         kind,
			"marketingUrl": s.cfg.MarketingURL,
			"supportEmail": s.cfg.SupportEmail,
			"notice":       "法了么仅面向成年人，提供亲密记录、伴侣沟通和性健康教育，不构成医疗建议。",
		})
	}
}

func writeJSON(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
