package app

import (
	"errors"
	"fmt"
	"sync"
	"time"
)

var errNotFound = errors.New("not found")

type MemoryStore struct {
	mu       sync.RWMutex
	persist  *PostgresPersistence
	users    map[string]User
	tokens   map[string]string
	devices  map[string]string
	partners map[string]PartnerLink
	messages map[string][]PartnerMessage
	records  map[string][]IntimacyRecord
	cycles   map[string][]CycleRecord
	posts    []SocialPost
	reports  []Report
}

func NewMemoryStore() *MemoryStore {
	return NewMemoryStoreWithPersistence(nil)
}

func NewMemoryStoreWithPersistence(persist *PostgresPersistence) *MemoryStore {
	now := time.Now()
	store := &MemoryStore{
		persist:  persist,
		users:    map[string]User{},
		tokens:   map[string]string{},
		devices:  map[string]string{},
		partners: map[string]PartnerLink{},
		messages: map[string][]PartnerMessage{},
		records:  map[string][]IntimacyRecord{},
		cycles:   map[string][]CycleRecord{},
		posts: []SocialPost{
			{ID: "post-1", AuthorAlias: "匿名安全员", Phrase: "安全员已上线 / 今日小火苗 / 提醒戴好装备 / 尊重同意最性感", ResonanceCount: 128, CreatedAt: now.Add(-24 * time.Hour)},
			{ID: "post-2", AuthorAlias: "匿名嘴硬人", Phrase: "嘴硬但诚实 / 我的荷尔蒙 / 建议冷静三分钟 / 先喝水再说", ResonanceCount: 64, CreatedAt: now.Add(-72 * time.Hour)},
		},
	}
	user := User{ID: "u-demo", Nickname: "嘴硬但健康的成年人", Role: RoleSwitch, AdultConfirmed: true, CreatedAt: now}
	store.users[user.ID] = user
	store.tokens["demo-token"] = user.ID
	store.records[user.ID] = []IntimacyRecord{
		{ID: "rec-1", UserID: user.ID, OccurredAt: formatDate(now.AddDate(0, 0, -2)), Type: IntimacyPenetrative, Protection: ProtectionCondom, ConsentChecked: true, SharedWithPartner: true, Rating: 5, RiskLevel: RiskLow, NoteTags: []string{"尊重同意", "安全套上岗"}, CreatedAt: now.AddDate(0, 0, -2)},
		{ID: "rec-2", UserID: user.ID, OccurredAt: formatDate(now.AddDate(0, 0, -8)), Type: IntimacySolo, Protection: ProtectionNotSure, ConsentChecked: true, SharedWithPartner: false, Rating: 4, RiskLevel: RiskLow, NoteTags: []string{"单人排解", "睡前放松"}, CreatedAt: now.AddDate(0, 0, -8)},
	}
	store.cycles[user.ID] = []CycleRecord{{ID: "cycle-1", UserID: user.ID, PeriodStart: formatDate(now.AddDate(0, 0, -20)), PeriodEnd: formatDate(now.AddDate(0, 0, -16)), CycleLength: 29, CreatedAt: now.AddDate(0, 0, -20)}}
	store.partners[user.ID] = PartnerLink{ID: "partner-1", UserID: user.ID, PartnerID: "u-partner", InviteCode: "FALV1", Status: "linked", CanShare: true, CreatedAt: now.AddDate(0, 0, -5), ConfirmedAt: now.AddDate(0, 0, -5)}
	if state, err := persist.Load(); err == nil && state != nil {
		store.applyState(*state)
	} else if err == nil {
		store.persistLocked()
	} else {
		fmt.Printf("load persisted state failed: %v\n", err)
	}
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
	user := User{ID: id, Nickname: fallback(req.Nickname, "匿名成年人"), Role: req.Role, AdultConfirmed: req.AdultConfirmed, CreatedAt: time.Now()}
	s.users[id] = user
	s.tokens[token] = id
	s.persistLocked()
	return token, user
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
	user := User{
		ID:             fmt.Sprintf("u-device-%d", now.UnixNano()),
		DeviceID:       deviceID,
		Nickname:       "免登录成年人",
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
	if req.Nickname != "" {
		user.Nickname = req.Nickname
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
	return append([]IntimacyRecord(nil), s.records[userID]...)
}

func (s *MemoryStore) AddRecord(userID string, record IntimacyRecord) IntimacyRecord {
	s.mu.Lock()
	defer s.mu.Unlock()
	record.ID = fmt.Sprintf("rec-%d", time.Now().UnixNano())
	record.UserID = userID
	record.RiskLevel = calculateRecordRisk(record)
	record.NoteTags = buildRecordTags(record)
	record.CreatedAt = time.Now()
	s.records[userID] = append([]IntimacyRecord{record}, s.records[userID]...)
	s.persistLocked()
	return record
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
	return append([]CycleRecord(nil), s.cycles[userID]...)
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
	link, ok := s.partners[userID]
	if !ok {
		return PartnerLink{}, errNotFound
	}
	return link, nil
}

func (s *MemoryStore) UnlinkPartner(userID string) PartnerLink {
	s.mu.Lock()
	defer s.mu.Unlock()
	link := s.partners[userID]
	link.Status = "none"
	link.CanShare = false
	link.PartnerID = ""
	link.ConfirmedAt = time.Time{}
	s.partners[userID] = link
	s.persistLocked()
	return link
}

func (s *MemoryStore) CreateInvite(userID string) PartnerLink {
	s.mu.Lock()
	defer s.mu.Unlock()
	link := PartnerLink{ID: fmt.Sprintf("partner-%d", time.Now().UnixNano()), UserID: userID, InviteCode: "FALV1", Status: "pending", CanShare: false, CreatedAt: time.Now()}
	s.partners[userID] = link
	s.persistLocked()
	return link
}

func (s *MemoryStore) AcceptInvite(userID, inviteCode string) PartnerLink {
	s.mu.Lock()
	defer s.mu.Unlock()
	link := PartnerLink{ID: fmt.Sprintf("partner-%d", time.Now().UnixNano()), UserID: userID, PartnerID: "partner-by-" + inviteCode, InviteCode: inviteCode, Status: "linked", CanShare: true, CreatedAt: time.Now(), ConfirmedAt: time.Now()}
	s.partners[userID] = link
	s.persistLocked()
	return link
}

func (s *MemoryStore) PartnerMessages(userID string) []PartnerMessage {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return append([]PartnerMessage(nil), s.messages[userID]...)
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
	s.messages[userID] = append([]PartnerMessage{message}, s.messages[userID]...)
	s.persistLocked()
	return message
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
	post := SocialPost{ID: fmt.Sprintf("post-%d", time.Now().UnixNano()), UserID: userID, AuthorAlias: "匿名成年人", Phrase: phrase, CreatedAt: time.Now()}
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
	return DataExport{
		User:     user,
		Partner:  link,
		Messages: append([]PartnerMessage(nil), s.messages[user.ID]...),
		Records:  append([]IntimacyRecord(nil), s.records[user.ID]...),
		Cycles:   append([]CycleRecord(nil), s.cycles[user.ID]...),
		Posts:    posts,
		Reports:  reports,
		Exported: time.Now(),
	}
}

func (s *MemoryStore) DeleteUser(userID string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	user := s.users[userID]
	user.DeletedAt = time.Now()
	user.Nickname = "已删除用户"
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
	for i := range s.posts {
		if s.posts[i].UserID == userID {
			s.posts[i].Blocked = true
			s.posts[i].AuthorAlias = "已删除用户"
		}
	}
	s.persistLocked()
}

func (s *MemoryStore) applyState(state persistentState) {
	s.users = state.Users
	s.tokens = state.Tokens
	s.devices = state.Devices
	s.partners = state.Partners
	s.messages = state.Messages
	s.records = state.Records
	s.cycles = state.Cycles
	s.posts = state.Posts
	s.reports = state.Reports
	if s.users == nil {
		s.users = map[string]User{}
	}
	if s.tokens == nil {
		s.tokens = map[string]string{}
	}
	if s.devices == nil {
		s.devices = map[string]string{}
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
}

func (s *MemoryStore) persistLocked() {
	if s.persist == nil {
		return
	}
	s.persist.Save(persistentState{
		Users:    s.users,
		Tokens:   s.tokens,
		Devices:  s.devices,
		Partners: s.partners,
		Messages: s.messages,
		Records:  s.records,
		Cycles:   s.cycles,
		Posts:    s.posts,
		Reports:  s.reports,
	})
}

func fallback(value, replacement string) string {
	if value == "" {
		return replacement
	}
	return value
}
