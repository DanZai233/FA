package app

import (
	"crypto/rand"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"
	"unicode/utf8"

	"golang.org/x/crypto/bcrypt"
)

var errNotFound = errors.New("not found")

func clampRunes(s string, maxRunes int) string {
	if maxRunes <= 0 {
		return ""
	}
	n := 0
	for i := range s {
		n++
		if n > maxRunes {
			return s[:i]
		}
	}
	return s
}

func defaultSquareAlias(userID string) string {
	suffix := userID
	if len(suffix) > 4 {
		suffix = suffix[len(suffix)-4:]
	}
	return "匿名" + suffix
}

var (
	errEmailTaken                 = errors.New("email already registered")
	errBadLogin                   = errors.New("invalid email or password")
	errPartnerLinked              = errors.New("already linked, unlink first")
	errInvalidInvite              = errors.New("invalid or expired invite code")
	errSelfPartner                = errors.New("cannot accept own invite")
	errWeakPassword               = errors.New("password must be at least 8 characters")
	errInvalidCaptcha             = errors.New("invalid captcha")
	errPartnerNotLinked           = errors.New("partner not linked")
	errPartnerShareNotFound       = errors.New("share request not found")
	errPartnerShareForbidden      = errors.New("cannot modify this share request")
	errPartnerShareNotPending     = errors.New("share request is not pending")
	errPartnerSharePhraseRequired = errors.New("phrase required")
	errPartnerSharePhraseTooLong  = errors.New("phrase too long")
)

type MemoryStore struct {
	mu            sync.RWMutex
	persist       *PostgresPersistence
	users         map[string]User
	tokens        map[string]string
	devices       map[string]string
	emailIndex    map[string]string
	passwords     map[string]string
	partners      map[string]PartnerLink
	messages      map[string][]PartnerMessage
	records       map[string][]IntimacyRecord
	cycles        map[string][]CycleRecord
	posts         []SocialPost
	reports       []Report
	shareRequests []PartnerShareRequest
}

func NewMemoryStore() *MemoryStore {
	return NewMemoryStoreWithPersistence(nil)
}

func NewMemoryStoreWithPersistence(persist *PostgresPersistence) *MemoryStore {
	now := time.Now()
	store := &MemoryStore{
		persist:    persist,
		users:      map[string]User{},
		tokens:     map[string]string{},
		devices:    map[string]string{},
		emailIndex: map[string]string{},
		passwords:  map[string]string{},
		partners:   map[string]PartnerLink{},
		messages:   map[string][]PartnerMessage{},
		records:    map[string][]IntimacyRecord{},
		cycles:     map[string][]CycleRecord{},
		posts: []SocialPost{
			{ID: "post-1", AuthorAlias: "匿名安全员", Phrase: "安全员已上线 / 今日小火苗 / 提醒戴好装备 / 尊重同意最性感", ResonanceCount: 128, CreatedAt: now.Add(-24 * time.Hour)},
			{ID: "post-2", AuthorAlias: "匿名嘴硬人", Phrase: "嘴硬但诚实 / 我的荷尔蒙 / 建议冷静三分钟 / 先喝水再说", ResonanceCount: 64, CreatedAt: now.Add(-72 * time.Hour)},
		},
		shareRequests: []PartnerShareRequest{},
	}
	user := User{ID: "u-demo", Nickname: "嘴硬但健康的成年人", SquareAlias: "匿名DEMO", Role: RoleSwitch, AdultConfirmed: true, CreatedAt: now}
	store.users[user.ID] = user
	store.tokens["demo-token"] = user.ID
	store.records[user.ID] = []IntimacyRecord{
		{ID: "rec-1", UserID: user.ID, OccurredAt: formatDate(now.AddDate(0, 0, -2)), Type: IntimacyPenetrative, Protection: ProtectionCondom, ConsentChecked: true, SharedWithPartner: true, Rating: 5, RiskLevel: RiskLow, NoteTags: []string{"尊重同意", "安全套上岗"}, CreatedAt: now.AddDate(0, 0, -2)},
		{ID: "rec-2", UserID: user.ID, OccurredAt: formatDate(now.AddDate(0, 0, -8)), Type: IntimacySolo, Protection: ProtectionNotSure, ConsentChecked: true, SharedWithPartner: false, Rating: 4, RiskLevel: RiskLow, NoteTags: []string{"单人排解", "睡前放松"}, CreatedAt: now.AddDate(0, 0, -8)},
	}
	store.cycles[user.ID] = []CycleRecord{{ID: "cycle-1", UserID: user.ID, PeriodStart: formatDate(now.AddDate(0, 0, -20)), PeriodEnd: formatDate(now.AddDate(0, 0, -16)), CycleLength: 29, CreatedAt: now.AddDate(0, 0, -20)}}
	store.partners[user.ID] = PartnerLink{ID: "partner-1", UserID: user.ID, PartnerID: "u-partner", InviteCode: "DEMO01", Status: "linked", CanShare: true, CreatedAt: now.AddDate(0, 0, -5), ConfirmedAt: now.AddDate(0, 0, -5)}
	if state, err := persist.Load(); err == nil && state != nil {
		store.applyState(*state)
	} else if err == nil {
		store.normalizeUsersLocked()
		store.persistLocked()
	} else {
		fmt.Printf("load persisted state failed: %v\n", err)
	}
	store.normalizeUsersLocked()
	return store
}

func (s *MemoryStore) CreateUser(req AuthRequest) (string, User) {
	s.mu.Lock()
	defer s.mu.Unlock()
	id := fmt.Sprintf("u-%d", time.Now().UnixNano())
	token := fmt.Sprintf("tok-%d", time.Now().UnixNano())
	if req.Role == "" {
		req.Role = RoleSwitch
	}
	nick := clampRunes(strings.TrimSpace(fallback(req.Nickname, "匿名成年人")), 32)
	sq := strings.TrimSpace(req.SquareAlias)
	if sq == "" {
		sq = defaultSquareAlias(id)
	} else {
		sq = clampRunes(sq, 24)
	}
	user := User{ID: id, Nickname: nick, SquareAlias: sq, Role: req.Role, AdultConfirmed: req.AdultConfirmed, CreatedAt: time.Now()}
	s.users[id] = user
	s.tokens[token] = id
	s.persistLocked()
	return token, user
}

func (s *MemoryStore) RegisterWithEmail(email, password, nickname, squareAlias string, role UserRole, adult bool) (string, User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	email = strings.ToLower(strings.TrimSpace(email))
	if email == "" || len(password) < 8 {
		return "", User{}, errWeakPassword
	}
	if _, exists := s.emailIndex[email]; exists {
		return "", User{}, errEmailTaken
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", User{}, err
	}
	id := fmt.Sprintf("u-%d", time.Now().UnixNano())
	token := fmt.Sprintf("tok-%d", time.Now().UnixNano())
	if role == "" {
		role = RoleSwitch
	}
	nick := clampRunes(strings.TrimSpace(fallback(nickname, "匿名成年人")), 32)
	sq := strings.TrimSpace(squareAlias)
	if sq == "" {
		sq = defaultSquareAlias(id)
	} else {
		sq = clampRunes(sq, 24)
	}
	user := User{
		ID:             id,
		Email:          email,
		Nickname:       nick,
		SquareAlias:    sq,
		Role:           role,
		AdultConfirmed: adult,
		PrivacyLock:    true,
		CreatedAt:      time.Now(),
	}
	s.users[id] = user
	s.tokens[token] = id
	s.emailIndex[email] = id
	s.passwords[id] = string(hash)
	s.records[id] = []IntimacyRecord{}
	s.cycles[id] = []CycleRecord{}
	s.persistLocked()
	return token, user, nil
}

func (s *MemoryStore) LoginWithEmail(email, password string) (string, User, error) {
	s.mu.RLock()
	email = strings.ToLower(strings.TrimSpace(email))
	userID, ok := s.emailIndex[email]
	hash := ""
	if ok {
		hash = s.passwords[userID]
	}
	s.mu.RUnlock()
	if !ok || hash == "" {
		return "", User{}, errBadLogin
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)); err != nil {
		return "", User{}, errBadLogin
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	user, ok := s.users[userID]
	if !ok || !user.DeletedAt.IsZero() {
		return "", User{}, errBadLogin
	}
	token := fmt.Sprintf("tok-%d", time.Now().UnixNano())
	s.tokens[token] = userID
	s.persistLocked()
	return token, user, nil
}

func (s *MemoryStore) UserByToken(token string) (User, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	userID, ok := s.tokens[token]
	if !ok {
		return User{}, false
	}
	user, ok := s.users[userID]
	if ok && !user.DeletedAt.IsZero() {
		return User{}, false
	}
	return user, ok
}

func (s *MemoryStore) UserByDeviceID(deviceID string) User {
	s.mu.Lock()
	defer s.mu.Unlock()
	if userID, ok := s.devices[deviceID]; ok {
		user := s.users[userID]
		if user.DeletedAt.IsZero() {
			return user
		}
	}
	now := time.Now()
	id := fmt.Sprintf("u-device-%d", now.UnixNano())
	user := User{
		ID:             id,
		DeviceID:       deviceID,
		Nickname:       "免登录成年人",
		SquareAlias:    defaultSquareAlias(id),
		Role:           RoleSwitch,
		AdultConfirmed: true,
		PrivacyLock:    true,
		CreatedAt:      now,
	}
	s.users[user.ID] = user
	s.devices[deviceID] = user.ID
	s.records[user.ID] = []IntimacyRecord{}
	s.cycles[user.ID] = []CycleRecord{{ID: fmt.Sprintf("cycle-%d", now.UnixNano()), UserID: user.ID, PeriodStart: formatDate(now.AddDate(0, 0, -20)), PeriodEnd: formatDate(now.AddDate(0, 0, -16)), CycleLength: 29, CreatedAt: now}}
	s.persistLocked()
	return user
}

func (s *MemoryStore) UpdateUser(userID string, req UpdateProfileRequest) (User, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	user, ok := s.users[userID]
	if !ok {
		return User{}, errNotFound
	}
	if req.Nickname != nil {
		user.Nickname = clampRunes(strings.TrimSpace(*req.Nickname), 32)
	}
	if req.SquareAlias != nil {
		t := strings.TrimSpace(*req.SquareAlias)
		if t == "" {
			user.SquareAlias = defaultSquareAlias(userID)
		} else {
			user.SquareAlias = clampRunes(t, 24)
		}
	}
	if req.Role != "" {
		user.Role = req.Role
	}
	if req.PrivacyLock != nil {
		user.PrivacyLock = *req.PrivacyLock
	}
	s.users[userID] = user
	s.persistLocked()
	return user, nil
}

func (s *MemoryStore) Records(userID string) []IntimacyRecord {
	s.mu.RLock()
	defer s.mu.RUnlock()
	// Use non-nil base slice so JSON encodes [] not null (empty client arrays).
	return append([]IntimacyRecord{}, s.records[userID]...)
}

func (s *MemoryStore) addRecordLocked(userID string, record IntimacyRecord) IntimacyRecord {
	record.ID = fmt.Sprintf("rec-%d", time.Now().UnixNano())
	record.UserID = userID
	record.RiskLevel = calculateRecordRisk(record)
	record.NoteTags = buildRecordTags(record)
	record.CreatedAt = time.Now()
	s.records[userID] = append([]IntimacyRecord{record}, s.records[userID]...)
	return record
}

func (s *MemoryStore) AddRecord(userID string, record IntimacyRecord) IntimacyRecord {
	s.mu.Lock()
	defer s.mu.Unlock()
	out := s.addRecordLocked(userID, record)
	s.persistLocked()
	return out
}

func (s *MemoryStore) UpdateRecord(userID, recordID string, next IntimacyRecord) (IntimacyRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	records := s.records[userID]
	for i := range records {
		if records[i].ID == recordID {
			next.ID = recordID
			next.UserID = userID
			next.CreatedAt = records[i].CreatedAt
			next.RiskLevel = calculateRecordRisk(next)
			next.NoteTags = buildRecordTags(next)
			s.records[userID][i] = next
			s.persistLocked()
			return next, nil
		}
	}
	return IntimacyRecord{}, errNotFound
}

func (s *MemoryStore) DeleteRecord(userID, recordID string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	records := s.records[userID]
	for i := range records {
		if records[i].ID == recordID {
			s.records[userID] = append(records[:i], records[i+1:]...)
			s.persistLocked()
			return nil
		}
	}
	return errNotFound
}

func (s *MemoryStore) Cycles(userID string) []CycleRecord {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return append([]CycleRecord{}, s.cycles[userID]...)
}

func (s *MemoryStore) AddCycle(userID string, cycle CycleRecord) CycleRecord {
	s.mu.Lock()
	defer s.mu.Unlock()
	cycle.ID = fmt.Sprintf("cycle-%d", time.Now().UnixNano())
	cycle.UserID = userID
	cycle.CreatedAt = time.Now()
	if cycle.CycleLength == 0 {
		cycle.CycleLength = 28
	}
	s.cycles[userID] = append([]CycleRecord{cycle}, s.cycles[userID]...)
	s.persistLocked()
	return cycle
}

func (s *MemoryStore) Partner(userID string) (PartnerLink, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	if link, ok := s.partners[userID]; ok {
		return link, nil
	}
	return PartnerLink{Status: "none"}, nil
}

func (s *MemoryStore) UnlinkPartner(userID string) PartnerLink {
	s.mu.Lock()
	defer s.mu.Unlock()
	link := s.partners[userID]
	partnerID := link.PartnerID
	if partnerID != "" {
		if pl, ok := s.partners[partnerID]; ok {
			pl.Status = "none"
			pl.PartnerID = ""
			pl.InviteCode = ""
			pl.CanShare = false
			pl.ConfirmedAt = time.Time{}
			s.partners[partnerID] = pl
		}
	}
	link.Status = "none"
	link.PartnerID = ""
	link.InviteCode = ""
	link.CanShare = false
	link.ConfirmedAt = time.Time{}
	s.partners[userID] = link
	s.persistLocked()
	return link
}

func (s *MemoryStore) CreateInvite(userID string) (PartnerLink, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if link, ok := s.partners[userID]; ok && link.Status == "linked" {
		return PartnerLink{}, errPartnerLinked
	}
	var code string
	for i := 0; i < 48; i++ {
		code = randomPartnerCode()
		if !s.partnerInviteTakenLocked(code) {
			break
		}
	}
	link := PartnerLink{
		ID:         fmt.Sprintf("partner-%d", time.Now().UnixNano()),
		UserID:     userID,
		InviteCode: code,
		Status:     "pending",
		CanShare:   false,
		CreatedAt:  time.Now(),
	}
	s.partners[userID] = link
	s.persistLocked()
	return link, nil
}

func (s *MemoryStore) partnerInviteTakenLocked(code string) bool {
	for _, v := range s.partners {
		if strings.EqualFold(v.InviteCode, code) && (v.Status == "pending" || v.Status == "linked") {
			return true
		}
	}
	return false
}

func randomPartnerCode() string {
	const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
	b := make([]byte, 6)
	_, _ = rand.Read(b)
	for i := range b {
		b[i] = chars[int(b[i])%len(chars)]
	}
	return string(b)
}

func (s *MemoryStore) AcceptInvite(accepterID, inviteCode string) (PartnerLink, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	code := strings.TrimSpace(strings.ToUpper(inviteCode))
	if code == "" {
		return PartnerLink{}, errInvalidInvite
	}
	var inviterID string
	for uid, link := range s.partners {
		if link.Status == "pending" && strings.EqualFold(strings.TrimSpace(link.InviteCode), code) {
			inviterID = uid
			break
		}
	}
	if inviterID == "" {
		return PartnerLink{}, errInvalidInvite
	}
	if inviterID == accepterID {
		return PartnerLink{}, errSelfPartner
	}
	now := time.Now()
	inv := s.partners[inviterID]
	inv.Status = "linked"
	inv.PartnerID = accepterID
	inv.CanShare = true
	inv.ConfirmedAt = now
	s.partners[inviterID] = inv

	ac := PartnerLink{
		ID:          fmt.Sprintf("partner-%d", time.Now().UnixNano()),
		UserID:      accepterID,
		PartnerID:   inviterID,
		InviteCode:  inv.InviteCode,
		Status:      "linked",
		CanShare:    true,
		CreatedAt:   now,
		ConfirmedAt: now,
	}
	s.partners[accepterID] = ac
	s.persistLocked()
	return ac, nil
}

func (s *MemoryStore) PartnerMessages(userID string) []PartnerMessage {
	s.mu.RLock()
	list := append([]PartnerMessage{}, s.messages[userID]...)
	usersCopy := make(map[string]User, len(s.users))
	for k, v := range s.users {
		usersCopy[k] = v
	}
	s.mu.RUnlock()
	for i := range list {
		if strings.TrimSpace(list[i].AuthorNickname) == "" {
			nick := "未设置"
			if u, ok := usersCopy[list[i].UserID]; ok {
				if t := strings.TrimSpace(u.Nickname); t != "" {
					nick = t
				}
			}
			list[i].AuthorNickname = nick
		}
	}
	return list
}

func (s *MemoryStore) AddPartnerMessage(userID, phrase, scene string) PartnerMessage {
	s.mu.Lock()
	defer s.mu.Unlock()
	message := PartnerMessage{
		ID:        fmt.Sprintf("msg-%d", time.Now().UnixNano()),
		UserID:    userID,
		Phrase:    fallback(phrase, "安全员已上线 / 今日小火苗 / 提醒戴好装备 / 尊重同意最性感"),
		Scene:     fallback(scene, "partner"),
		CreatedAt: time.Now(),
	}
	if u, ok := s.users[userID]; ok {
		nick := strings.TrimSpace(u.Nickname)
		if nick == "" {
			nick = "未设置"
		}
		message.AuthorNickname = nick
	} else {
		message.AuthorNickname = "未设置"
	}
	s.messages[userID] = append([]PartnerMessage{message}, s.messages[userID]...)
	if link, ok := s.partners[userID]; ok && link.Status == "linked" && link.PartnerID != "" {
		s.messages[link.PartnerID] = append([]PartnerMessage{message}, s.messages[link.PartnerID]...)
	}
	s.persistLocked()
	return message
}

func (s *MemoryStore) prependPartnerInboxOnlyLocked(targetUserID string, msg PartnerMessage) {
	if s.messages[targetUserID] == nil {
		s.messages[targetUserID] = []PartnerMessage{}
	}
	s.messages[targetUserID] = append([]PartnerMessage{msg}, s.messages[targetUserID]...)
}

func clampRating(n int) int {
	if n < 1 {
		return 1
	}
	if n > 5 {
		return 5
	}
	return n
}

func (s *MemoryStore) lockedPartnerNick(uid string) string {
	if u, ok := s.users[uid]; ok {
		if t := strings.TrimSpace(u.Nickname); t != "" {
			return t
		}
	}
	return "未设置"
}

func (s *MemoryStore) CreatePartnerShareRequest(fromID string, body CreatePartnerShareBody) (PartnerShareRequest, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	link, ok := s.partners[fromID]
	if !ok || link.Status != "linked" || strings.TrimSpace(link.PartnerID) == "" {
		return PartnerShareRequest{}, errPartnerNotLinked
	}
	toID := link.PartnerID
	occ := strings.TrimSpace(body.OccurredAt)
	if occ == "" {
		occ = formatDate(time.Now())
	}
	req := PartnerShareRequest{
		ID:             fmt.Sprintf("shr-%d", time.Now().UnixNano()),
		FromUserID:     fromID,
		ToUserID:       toID,
		Status:         "pending",
		SenderRole:     body.SenderRole,
		OccurredAt:     occ,
		Type:           body.Type,
		Protection:     body.Protection,
		ConsentChecked: body.ConsentChecked,
		SenderRating:   clampRating(body.SenderRating),
		CreatedAt:      time.Now(),
	}
	s.shareRequests = append([]PartnerShareRequest{req}, s.shareRequests...)
	s.persistLocked()
	return req, nil
}

func (s *MemoryStore) PartnerShareRequests(userID string) PartnerShareRequestsWire {
	s.mu.RLock()
	defer s.mu.RUnlock()
	var inbox, outbox []PartnerShareRequest
	for _, r := range s.shareRequests {
		if r.ToUserID == userID && r.Status == "pending" {
			inbox = append(inbox, r)
		}
		if r.FromUserID == userID {
			outbox = append(outbox, r)
		}
	}
	return PartnerShareRequestsWire{Inbox: inbox, Outbox: outbox}
}

func (s *MemoryStore) AcceptPartnerShareRequest(userID, reqID string, receiverRating int) (PartnerShareRequest, []IntimacyRecord, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	idx := -1
	for i := range s.shareRequests {
		if s.shareRequests[i].ID == reqID {
			idx = i
			break
		}
	}
	if idx < 0 {
		return PartnerShareRequest{}, nil, errPartnerShareNotFound
	}
	r := s.shareRequests[idx]
	if r.Status != "pending" {
		return PartnerShareRequest{}, nil, errPartnerShareNotPending
	}
	if r.ToUserID != userID {
		return PartnerShareRequest{}, nil, errPartnerShareForbidden
	}
	r.Status = "accepted"
	r.ReceiverRating = clampRating(receiverRating)
	r.AcceptedAt = time.Now()
	s.shareRequests[idx] = r

	recFrom := IntimacyRecord{
		OccurredAt:        r.OccurredAt,
		Type:              r.Type,
		Protection:        r.Protection,
		ConsentChecked:    r.ConsentChecked,
		SharedWithPartner: true,
		PartnerID:         r.ToUserID,
		Rating:            r.SenderRating,
	}
	recTo := IntimacyRecord{
		OccurredAt:        r.OccurredAt,
		Type:              r.Type,
		Protection:        r.Protection,
		ConsentChecked:    r.ConsentChecked,
		SharedWithPartner: true,
		PartnerID:         r.FromUserID,
		Rating:            r.ReceiverRating,
	}
	a := s.addRecordLocked(r.FromUserID, recFrom)
	b := s.addRecordLocked(r.ToUserID, recTo)
	s.persistLocked()
	return r, []IntimacyRecord{a, b}, nil
}

func (s *MemoryStore) RejectPartnerShareRequest(userID, reqID, phrase string) (PartnerShareRequest, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	idx := -1
	for i := range s.shareRequests {
		if s.shareRequests[i].ID == reqID {
			idx = i
			break
		}
	}
	if idx < 0 {
		return PartnerShareRequest{}, errPartnerShareNotFound
	}
	r := s.shareRequests[idx]
	if r.Status != "pending" {
		return PartnerShareRequest{}, errPartnerShareNotPending
	}
	if r.ToUserID != userID {
		return PartnerShareRequest{}, errPartnerShareForbidden
	}
	p := strings.TrimSpace(phrase)
	if p == "" {
		return PartnerShareRequest{}, errPartnerSharePhraseRequired
	}
	if utf8.RuneCountInString(p) > 240 {
		return PartnerShareRequest{}, errPartnerSharePhraseTooLong
	}
	r.Status = "rejected"
	r.RejectionPhrase = p
	r.RejectedAt = time.Now()
	s.shareRequests[idx] = r

	msg := PartnerMessage{
		ID:             fmt.Sprintf("msg-%d", time.Now().UnixNano()),
		UserID:         userID,
		AuthorNickname: s.lockedPartnerNick(userID),
		Phrase:         "婉拒了这次法法同步：" + p,
		Scene:          "share_reject",
		CreatedAt:      time.Now(),
	}
	s.prependPartnerInboxOnlyLocked(r.FromUserID, msg)
	s.persistLocked()
	return r, nil
}

func (s *MemoryStore) Posts() []SocialPost {
	s.mu.RLock()
	defer s.mu.RUnlock()
	posts := make([]SocialPost, 0, len(s.posts))
	for _, post := range s.posts {
		if !post.Blocked {
			posts = append(posts, post)
		}
	}
	return posts
}

func (s *MemoryStore) AddPost(userID, phrase string) SocialPost {
	s.mu.Lock()
	defer s.mu.Unlock()
	author := "匿名成年人"
	if u, ok := s.users[userID]; ok {
		if a := strings.TrimSpace(u.SquareAlias); a != "" {
			author = a
		} else {
			author = defaultSquareAlias(userID)
		}
	}
	post := SocialPost{ID: fmt.Sprintf("post-%d", time.Now().UnixNano()), UserID: userID, AuthorAlias: author, Phrase: phrase, CreatedAt: time.Now()}
	s.posts = append([]SocialPost{post}, s.posts...)
	s.persistLocked()
	return post
}

func (s *MemoryStore) ResonatePost(postID string) (SocialPost, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.posts {
		if s.posts[i].ID == postID {
			s.posts[i].ResonanceCount++
			s.persistLocked()
			return s.posts[i], nil
		}
	}
	return SocialPost{}, errNotFound
}

func (s *MemoryStore) BlockPost(postID string) (SocialPost, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	for i := range s.posts {
		if s.posts[i].ID == postID {
			s.posts[i].Blocked = true
			s.persistLocked()
			return s.posts[i], nil
		}
	}
	return SocialPost{}, errNotFound
}

func (s *MemoryStore) Report(userID string, req CreateReportRequest) Report {
	s.mu.Lock()
	defer s.mu.Unlock()
	report := Report{ID: fmt.Sprintf("report-%d", time.Now().UnixNano()), UserID: userID, TargetID: req.TargetID, Reason: fallback(req.Reason, "不适内容"), Status: "open", CreatedAt: time.Now()}
	s.reports = append([]Report{report}, s.reports...)
	for i := range s.posts {
		if s.posts[i].ID == req.TargetID {
			s.posts[i].Reported = true
		}
	}
	s.persistLocked()
	return report
}

func (s *MemoryStore) Export(user User) DataExport {
	s.mu.RLock()
	defer s.mu.RUnlock()
	link := s.partners[user.ID]
	reports := make([]Report, 0, len(s.reports))
	for _, report := range s.reports {
		if report.UserID == user.ID {
			reports = append(reports, report)
		}
	}
	posts := make([]SocialPost, 0, len(s.posts))
	for _, post := range s.posts {
		if post.UserID == user.ID {
			posts = append(posts, post)
		}
	}
	shares := make([]PartnerShareRequest, 0, len(s.shareRequests))
	for _, sh := range s.shareRequests {
		if sh.FromUserID == user.ID || sh.ToUserID == user.ID {
			shares = append(shares, sh)
		}
	}
	return DataExport{
		User:          user,
		Partner:       link,
		Messages:      append([]PartnerMessage{}, s.messages[user.ID]...),
		Records:       append([]IntimacyRecord{}, s.records[user.ID]...),
		Cycles:        append([]CycleRecord{}, s.cycles[user.ID]...),
		Posts:         posts,
		Reports:       reports,
		ShareRequests: shares,
		Exported:      time.Now(),
	}
}

func (s *MemoryStore) DeleteUser(userID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	user := s.users[userID]
	user.DeletedAt = time.Now()
	user.Nickname = "已删除用户"
	user.SquareAlias = "已注销"
	s.users[userID] = user
	delete(s.records, userID)
	delete(s.cycles, userID)
	delete(s.partners, userID)
	delete(s.messages, userID)
	for token, tokenUserID := range s.tokens {
		if tokenUserID == userID {
			delete(s.tokens, token)
		}
	}
	for deviceID, deviceUserID := range s.devices {
		if deviceUserID == userID {
			delete(s.devices, deviceID)
		}
	}
	if user.Email != "" {
		delete(s.emailIndex, strings.ToLower(strings.TrimSpace(user.Email)))
	}
	delete(s.passwords, userID)
	for i := range s.posts {
		if s.posts[i].UserID == userID {
			s.posts[i].Blocked = true
			s.posts[i].AuthorAlias = "已删除用户"
		}
	}
	var keptShares []PartnerShareRequest
	for _, sh := range s.shareRequests {
		if sh.FromUserID != userID && sh.ToUserID != userID {
			keptShares = append(keptShares, sh)
		}
	}
	s.shareRequests = keptShares
	s.persistLocked()
}

func (s *MemoryStore) applyState(state persistentState) {
	s.users = state.Users
	s.tokens = state.Tokens
	s.devices = state.Devices
	s.emailIndex = state.EmailIndex
	s.passwords = state.Passwords
	s.partners = state.Partners
	s.messages = state.Messages
	s.records = state.Records
	s.cycles = state.Cycles
	s.posts = state.Posts
	s.reports = state.Reports
	s.shareRequests = state.ShareRequests
	if s.shareRequests == nil {
		s.shareRequests = []PartnerShareRequest{}
	}
	if s.users == nil {
		s.users = map[string]User{}
	}
	if s.tokens == nil {
		s.tokens = map[string]string{}
	}
	if s.devices == nil {
		s.devices = map[string]string{}
	}
	if s.emailIndex == nil {
		s.emailIndex = map[string]string{}
	}
	if s.passwords == nil {
		s.passwords = map[string]string{}
	}
	if len(s.emailIndex) == 0 {
		for id, u := range s.users {
			if e := strings.TrimSpace(u.Email); e != "" {
				s.emailIndex[strings.ToLower(e)] = id
			}
		}
	}
	if s.partners == nil {
		s.partners = map[string]PartnerLink{}
	}
	if s.messages == nil {
		s.messages = map[string][]PartnerMessage{}
	}
	if s.records == nil {
		s.records = map[string][]IntimacyRecord{}
	}
	if s.cycles == nil {
		s.cycles = map[string][]CycleRecord{}
	}
	s.normalizeUsersLocked()
}

func (s *MemoryStore) normalizeUsersLocked() {
	for id, u := range s.users {
		if strings.TrimSpace(u.SquareAlias) == "" {
			u.SquareAlias = defaultSquareAlias(id)
			s.users[id] = u
		}
	}
}

func (s *MemoryStore) persistLocked() {
	if s.persist == nil {
		return
	}
	s.persist.Save(persistentState{
		Users:         s.users,
		Tokens:        s.tokens,
		Devices:       s.devices,
		EmailIndex:    s.emailIndex,
		Passwords:     s.passwords,
		Partners:      s.partners,
		Messages:      s.messages,
		Records:       s.records,
		Cycles:        s.cycles,
		Posts:         s.posts,
		Reports:       s.reports,
		ShareRequests: s.shareRequests,
	})
}

func fallback(value, replacement string) string {
	if value == "" {
		return replacement
	}
	return value
}
