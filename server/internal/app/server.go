package app

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
	"time"
	"unicode/utf8"
)

type Server struct {
	cfg      Config
	store    *MemoryStore
	captchas *captchaStore
	geo      GeoLookup
}

func NewServer(cfg Config, store *MemoryStore, geo GeoLookup) *Server {
	return &Server{cfg: cfg, store: store, captchas: newCaptchaStore(), geo: geo}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", s.handleHealth)
	mux.HandleFunc("GET /api/v1/auth/captcha", s.handleCaptcha)
	mux.HandleFunc("POST /api/v1/auth/register", s.handleRegister)
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
	mux.HandleFunc("GET /api/v1/partners/share-requests", s.withAuth(s.handlePartnerShareRequests))
	mux.HandleFunc("POST /api/v1/partners/share-requests", s.withAuth(s.handleCreatePartnerShareRequest))
	mux.HandleFunc("POST /api/v1/partners/share-requests/{id}/accept", s.withAuth(s.handleAcceptPartnerShareRequest))
	mux.HandleFunc("POST /api/v1/partners/share-requests/{id}/reject", s.withAuth(s.handleRejectPartnerShareRequest))
	mux.HandleFunc("GET /api/v1/partners/share-reject-phrases", s.withAuth(s.handlePartnerShareRejectPhrases))
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
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Faleme-Device-ID")
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

func (s *Server) handleRegister(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	email := strings.TrimSpace(strings.ToLower(req.Email))
	if !strings.Contains(email, "@") || len(email) < 5 {
		writeError(w, http.StatusBadRequest, "invalid email")
		return
	}
	req.Email = email
	if !s.captchas.verify(req.CaptchaID, req.Captcha) {
		writeError(w, http.StatusBadRequest, errInvalidCaptcha.Error())
		return
	}
	if s.cfg.RequireAdultAck && !req.AdultConfirmed {
		writeError(w, http.StatusForbidden, "adult confirmation required")
		return
	}
	token, user, err := s.store.RegisterWithEmail(req.Email, req.Password, req.Nickname, req.SquareAlias, req.Role, req.AdultConfirmed)
	if err != nil {
		writeError(w, storeErrStatus(err), err.Error())
		return
	}
	writeJSON(w, http.StatusOK, AuthResponse{Token: token, User: user})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	raw, err := io.ReadAll(r.Body)
	if err != nil || len(raw) == 0 {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	var probe struct {
		Email string `json:"email"`
	}
	_ = json.Unmarshal(raw, &probe)
	if strings.TrimSpace(probe.Email) != "" {
		var req EmailLoginRequest
		if err := json.Unmarshal(raw, &req); err != nil {
			writeError(w, http.StatusBadRequest, "invalid json")
			return
		}
		token, user, err := s.store.LoginWithEmail(req.Email, req.Password)
		if err != nil {
			writeError(w, http.StatusUnauthorized, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, AuthResponse{Token: token, User: user})
		return
	}
	var req AuthRequest
	if err := json.Unmarshal(raw, &req); err != nil {
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

func storeErrStatus(err error) int {
	switch {
	case errors.Is(err, errEmailTaken):
		return http.StatusConflict
	case errors.Is(err, errWeakPassword):
		return http.StatusBadRequest
	case errors.Is(err, errPartnerNotLinked):
		return http.StatusForbidden
	case errors.Is(err, errPartnerShareNotFound):
		return http.StatusNotFound
	case errors.Is(err, errPartnerShareForbidden):
		return http.StatusForbidden
	case errors.Is(err, errPartnerShareNotPending):
		return http.StatusConflict
	case errors.Is(err, errPartnerSharePhraseRequired) || errors.Is(err, errPartnerSharePhraseTooLong):
		return http.StatusBadRequest
	case errors.Is(err, ErrPolyOathInvalid):
		return http.StatusForbidden
	case errors.Is(err, ErrExclusiveTooManyPartners):
		return http.StatusConflict
	case errors.Is(err, ErrTargetPartnerRequired), errors.Is(err, ErrTargetPartnerNotLinked), errors.Is(err, ErrInvalidRelationshipModeValue):
		return http.StatusBadRequest
	case errors.Is(err, errNotFound):
		return http.StatusNotFound
	default:
		return http.StatusBadRequest
	}
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
		writeError(w, storeErrStatus(err), err.Error())
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
		record.OccurredAt = formatDate(time.Now())
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
		record.OccurredAt = formatDate(time.Now())
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
	writeJSON(w, http.StatusOK, s.store.PartnerHub(currentUser(r).ID))
}

func (s *Server) handleCreatePartnerInvite(w http.ResponseWriter, r *http.Request) {
	link, err := s.store.CreateInvite(currentUser(r).ID)
	if err != nil {
		writeError(w, http.StatusConflict, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, link)
}

func (s *Server) handleAcceptPartnerInvite(w http.ResponseWriter, r *http.Request) {
	var req struct {
		InviteCode string `json:"inviteCode"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || strings.TrimSpace(req.InviteCode) == "" {
		writeError(w, http.StatusBadRequest, "inviteCode required")
		return
	}
	link, err := s.store.AcceptInvite(currentUser(r).ID, req.InviteCode)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, link)
}

func (s *Server) handleUnlinkPartner(w http.ResponseWriter, r *http.Request) {
	peer := strings.TrimSpace(r.URL.Query().Get("peerId"))
	writeJSON(w, http.StatusOK, s.store.UnlinkPartner(currentUser(r).ID, peer))
}

func (s *Server) handlePartnerMessages(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.store.PartnerMessages(currentUser(r).ID))
}

func (s *Server) handleCreatePartnerMessage(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Phrase          string `json:"phrase"`
		Scene           string `json:"scene"`
		TargetPartnerID string `json:"targetPartnerId"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	writeJSON(w, http.StatusCreated, s.store.AddPartnerMessage(currentUser(r).ID, req.Phrase, req.Scene, req.TargetPartnerID))
}

func (s *Server) handlePartnerShareRequests(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.store.PartnerShareRequests(currentUser(r).ID))
}

func (s *Server) handleCreatePartnerShareRequest(w http.ResponseWriter, r *http.Request) {
	var body CreatePartnerShareBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	req, err := s.store.CreatePartnerShareRequest(currentUser(r).ID, body)
	if err != nil {
		writeError(w, storeErrStatus(err), err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, req)
}

func (s *Server) handleAcceptPartnerShareRequest(w http.ResponseWriter, r *http.Request) {
	var body AcceptPartnerShareBody
	_ = json.NewDecoder(r.Body).Decode(&body)
	uid := currentUser(r).ID
	share, recs, err := s.store.AcceptPartnerShareRequest(uid, r.PathValue("id"), body.ReceiverRating)
	if err != nil {
		writeError(w, storeErrStatus(err), err.Error())
		return
	}
	var mine *IntimacyRecord
	for i := range recs {
		if recs[i].UserID == uid {
			mine = &recs[i]
			break
		}
	}
	writeJSON(w, http.StatusOK, map[string]any{"shareRequest": share, "record": mine})
}

func (s *Server) handleRejectPartnerShareRequest(w http.ResponseWriter, r *http.Request) {
	var body RejectPartnerShareBody
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	share, err := s.store.RejectPartnerShareRequest(currentUser(r).ID, r.PathValue("id"), body.Phrase)
	if err != nil {
		writeError(w, storeErrStatus(err), err.Error())
		return
	}
	writeJSON(w, http.StatusOK, share)
}

// partnerShareRejectPhrase 供拒绝同步时选用（可与自由输入拼接）。
type partnerShareRejectPhrase struct {
	ID    string `json:"id"`
	Text  string `json:"text"`
	Emoji string `json:"emoji,omitempty"`
}

var partnerShareRejectPhrases = []partnerShareRejectPhrase{
	{ID: "r1", Text: "今天不太想同步这条，先记在各自这边吧", Emoji: "🙏"},
	{ID: "r2", Text: "想先缓缓，下次再一起记", Emoji: "🫧"},
	{ID: "r3", Text: "细节对不上，这次先不同步啦", Emoji: "🤔"},
	{ID: "r4", Text: "更想当面聊清楚再记", Emoji: "💬"},
	{ID: "r5", Text: "状态一般，不想留下这条共同记录", Emoji: "🌙"},
	{ID: "r6", Text: "谢谢你愿意同步，这次我先婉拒", Emoji: "✨"},
}

func (s *Server) handlePartnerShareRejectPhrases(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{"phrases": partnerShareRejectPhrases})
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
	phrase := strings.TrimSpace(req.Phrase)
	if utf8.RuneCountInString(phrase) > 320 {
		writeError(w, http.StatusBadRequest, "phrase too long")
		return
	}
	ip := ClientIP(r)
	label := PostIPRegionLabel(s.geo, ip)
	writeJSON(w, http.StatusCreated, s.store.AddPost(currentUser(r).ID, phrase, label))
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
		Phrase:    randomComposedPhrase(),
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
