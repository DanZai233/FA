package app

import "time"

type RiskLevel string

const (
	RiskLow    RiskLevel = "low"
	RiskMedium RiskLevel = "medium"
	RiskHigh   RiskLevel = "high"
)

type UserRole string

const (
	RoleInitiator UserRole = "initiator"
	RoleReceiver  UserRole = "receiver"
	RoleSwitch    UserRole = "switch"
)

type ProtectionMethod string

const (
	ProtectionCondom            ProtectionMethod = "condom"
	ProtectionOralContraceptive ProtectionMethod = "oral_contraceptive"
	ProtectionIUD               ProtectionMethod = "iud"
	ProtectionNone              ProtectionMethod = "none"
	ProtectionNotSure           ProtectionMethod = "not_sure"
)

type IntimacyType string

const (
	IntimacyCuddle      IntimacyType = "cuddle"
	IntimacyKiss        IntimacyType = "kiss"
	IntimacyManual      IntimacyType = "manual"
	IntimacyOral        IntimacyType = "oral"
	IntimacyPenetrative IntimacyType = "penetrative"
	IntimacySolo        IntimacyType = "solo"
	IntimacyOther       IntimacyType = "other"
)

type User struct {
	ID             string    `json:"id"`
	DeviceID       string    `json:"deviceId,omitempty"`
	Email          string    `json:"email,omitempty"`
	Nickname       string    `json:"nickname"` // 用户名：仅自己与伴侣可见（API 字段名保持 nickname 兼容旧客户端）
	SquareAlias    string    `json:"squareAlias"`
	Role           UserRole  `json:"role"`
	AdultConfirmed bool      `json:"adultConfirmed"`
	PrivacyLock    bool      `json:"privacyLock"`
	DeletedAt      time.Time `json:"deletedAt,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
}

type PartnerLink struct {
	ID          string    `json:"id"`
	UserID      string    `json:"userId"`
	PartnerID   string    `json:"partnerId,omitempty"`
	InviteCode  string    `json:"inviteCode"`
	Status      string    `json:"status"`
	CanShare    bool      `json:"canShare"`
	CreatedAt   time.Time `json:"createdAt"`
	ConfirmedAt time.Time `json:"confirmedAt,omitempty"`
}

type PartnerMessage struct {
	ID             string    `json:"id"`
	UserID         string    `json:"userId"`
	AuthorNickname string    `json:"authorNickname,omitempty"` // 发送时的用户名（nickname），仅伴侣可见
	Phrase         string    `json:"phrase"`
	Scene          string    `json:"scene"`
	CreatedAt      time.Time `json:"createdAt"`
}

type IntimacyRecord struct {
	ID                string           `json:"id"`
	UserID            string           `json:"userId"`
	PartnerID         string           `json:"partnerId,omitempty"`
	OccurredAt        string           `json:"occurredAt"`
	Type              IntimacyType     `json:"type"`
	Protection        ProtectionMethod `json:"protection"`
	ConsentChecked    bool             `json:"consentChecked"`
	SharedWithPartner bool             `json:"sharedWithPartner"`
	Rating            int              `json:"rating"`
	RiskLevel         RiskLevel        `json:"riskLevel"`
	NoteTags          []string         `json:"noteTags"`
	CreatedAt         time.Time        `json:"createdAt"`
}

type CycleRecord struct {
	ID          string    `json:"id"`
	UserID      string    `json:"userId"`
	PeriodStart string    `json:"periodStart"`
	PeriodEnd   string    `json:"periodEnd,omitempty"`
	CycleLength int       `json:"cycleLength"`
	CreatedAt   time.Time `json:"createdAt"`
}

type CyclePrediction struct {
	NextPeriodStart string       `json:"nextPeriodStart"`
	NextPeriodEnd   string       `json:"nextPeriodEnd"`
	FertileStart    string       `json:"fertileStart"`
	FertileEnd      string       `json:"fertileEnd"`
	TodayAdvice     HealthAdvice `json:"todayAdvice"`
}

type HealthAdvice struct {
	Level  RiskLevel `json:"level"`
	Title  string    `json:"title"`
	Body   string    `json:"body"`
	Action string    `json:"action"`
}

type KnowledgeCard struct {
	ID       string `json:"id"`
	Category string `json:"category"`
	Title    string `json:"title"`
	Body     string `json:"body"`
	Action   string `json:"action"`
	Tone     string `json:"tone"`
}

type PhraseTemplate struct {
	ID       string `json:"id"`
	Slot     string `json:"slot"`
	Text     string `json:"text"`
	Scenario string `json:"scenario"`
}

type SocialPost struct {
	ID             string    `json:"id"`
	UserID         string    `json:"userId,omitempty"`
	AuthorAlias    string    `json:"authorAlias"`
	Phrase         string    `json:"phrase"`
	ResonanceCount int       `json:"resonanceCount"`
	CreatedAt      time.Time `json:"createdAt"`
	Reported       bool      `json:"reported"`
	Blocked        bool      `json:"blocked"`
}

type MatchCard struct {
	ID        string    `json:"id"`
	Alias     string    `json:"alias"`
	Phrase    string    `json:"phrase"`
	ExpiresAt time.Time `json:"expiresAt"`
}

type ReminderSummary struct {
	Title       string       `json:"title"`
	Body        string       `json:"body"`
	Advice      HealthAdvice `json:"advice"`
	RecordCount int          `json:"recordCount"`
	SafeRate    int          `json:"safeRate"`
}

type Report struct {
	ID        string    `json:"id"`
	UserID    string    `json:"userId"`
	TargetID  string    `json:"targetId"`
	Reason    string    `json:"reason"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
}

type AuthRequest struct {
	Nickname       string   `json:"nickname"`
	SquareAlias    string   `json:"squareAlias"`
	Role           UserRole `json:"role"`
	AdultConfirmed bool     `json:"adultConfirmed"`
}

type EmailLoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RegisterRequest struct {
	Email          string   `json:"email"`
	Password       string   `json:"password"`
	CaptchaID      string   `json:"captchaId"`
	Captcha        string   `json:"captcha"`
	Nickname       string   `json:"nickname"`
	SquareAlias    string   `json:"squareAlias"`
	Role           UserRole `json:"role"`
	AdultConfirmed bool     `json:"adultConfirmed"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type ComposeRequest struct {
	Tone    string `json:"tone"`
	Subject string `json:"subject"`
	Action  string `json:"action"`
	Ending  string `json:"ending"`
}

type CreateReportRequest struct {
	TargetID string `json:"targetId"`
	Reason   string `json:"reason"`
}

type UpdateProfileRequest struct {
	Nickname     *string   `json:"nickname,omitempty"`
	SquareAlias  *string   `json:"squareAlias,omitempty"`
	Role         UserRole  `json:"role,omitempty"`
	PrivacyLock  *bool     `json:"privacyLock,omitempty"`
}

type DataExport struct {
	User     User             `json:"user"`
	Partner  PartnerLink      `json:"partner"`
	Messages []PartnerMessage `json:"messages"`
	Records  []IntimacyRecord `json:"records"`
	Cycles   []CycleRecord    `json:"cycles"`
	Posts    []SocialPost     `json:"posts"`
	Reports  []Report         `json:"reports"`
	Exported time.Time        `json:"exported"`
}
