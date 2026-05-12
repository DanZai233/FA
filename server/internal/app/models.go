package app

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID           string    `gorm:"column:id;primaryKey;size:36" json:"id"`
	DeviceID     string    `gorm:"column:device_id;uniqueIndex;size:128" json:"deviceId"`
	DisplayName  string    `gorm:"column:display_name;size:80" json:"displayName"`
	Bio          string    `gorm:"column:bio;size:240" json:"bio"`
	Role         string    `gorm:"column:role;size:24;default:active" json:"role"`
	Gender       string    `gorm:"column:gender;size:32" json:"gender"`
	Preference   string    `gorm:"column:preference;size:32" json:"preference"`
	Mood         string    `gorm:"column:mood;size:40" json:"mood"`
	AvatarURL    string    `gorm:"column:avatar_url;size:512" json:"avatarUrl"`
	AgeConfirmed bool      `gorm:"column:age_confirmed;default:false" json:"ageConfirmed"`
	CreatedAt    time.Time `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt    time.Time `gorm:"column:updated_at" json:"updatedAt"`
}

func (User) TableName() string { return "users" }

func (m *User) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

type PrivateRecord struct {
	ID          string    `gorm:"column:id;primaryKey;size:36" json:"id"`
	UserID      string    `gorm:"column:user_id;index;size:36" json:"userId"`
	Date        string    `gorm:"column:date;index;size:10" json:"date"`
	OccurredAt  time.Time `gorm:"column:occurred_at;index" json:"occurredAt"`
	Role        string    `gorm:"column:role;size:24" json:"role"`
	Method      string    `gorm:"column:method;size:80" json:"method"`
	Ejaculation string    `gorm:"column:ejaculation;size:80" json:"ejaculation"`
	Rating      int       `gorm:"column:rating" json:"rating"`
	Visibility  string    `gorm:"column:visibility;size:24;default:private" json:"visibility"`
	Notes       string    `gorm:"column:notes;size:1000" json:"notes"`
	CreatedAt   time.Time `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt   time.Time `gorm:"column:updated_at" json:"updatedAt"`
}

func (PrivateRecord) TableName() string { return "private_records" }

func (m *PrivateRecord) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

type PartnerRelation struct {
	ID          string     `gorm:"column:id;primaryKey;size:36" json:"id"`
	UserID      string     `gorm:"column:user_id;uniqueIndex;size:36" json:"userId"`
	PartnerID   *string    `gorm:"column:partner_id;index;size:36" json:"partnerId,omitempty"`
	InviteCode  string     `gorm:"column:invite_code;uniqueIndex;size:16" json:"inviteCode"`
	Status      string     `gorm:"column:status;size:24;default:pending" json:"status"`
	ConnectedAt *time.Time `gorm:"column:connected_at" json:"connectedAt,omitempty"`
	CreatedAt   time.Time  `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt   time.Time  `gorm:"column:updated_at" json:"updatedAt"`
}

func (PartnerRelation) TableName() string { return "partner_relations" }

func (m *PartnerRelation) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

type Post struct {
	ID           string         `gorm:"column:id;primaryKey;size:36" json:"id"`
	AuthorID     string         `gorm:"column:author_id;index;size:36" json:"authorId"`
	Body         string         `gorm:"column:body;size:2000" json:"body"`
	Mood         string         `gorm:"column:mood;size:40" json:"mood"`
	Topic        string         `gorm:"column:topic;size:60;index" json:"topic"`
	Anonymous    bool           `gorm:"column:anonymous;default:true" json:"anonymous"`
	Status       string         `gorm:"column:status;size:24;index;default:visible" json:"status"`
	LikeCount    int            `gorm:"column:like_count;default:0" json:"likeCount"`
	CommentCount int            `gorm:"column:comment_count;default:0" json:"commentCount"`
	CreatedAt    time.Time      `gorm:"column:created_at;index" json:"createdAt"`
	UpdatedAt    time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt    gorm.DeletedAt `gorm:"column:deleted_at;index" json:"-"`
}

func (Post) TableName() string { return "posts" }

func (m *Post) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

type Comment struct {
	ID        string         `gorm:"column:id;primaryKey;size:36" json:"id"`
	PostID    string         `gorm:"column:post_id;index;size:36" json:"postId"`
	AuthorID  string         `gorm:"column:author_id;index;size:36" json:"authorId"`
	Body      string         `gorm:"column:body;size:1000" json:"body"`
	Status    string         `gorm:"column:status;size:24;default:visible" json:"status"`
	CreatedAt time.Time      `gorm:"column:created_at;index" json:"createdAt"`
	UpdatedAt time.Time      `gorm:"column:updated_at" json:"updatedAt"`
	DeletedAt gorm.DeletedAt `gorm:"column:deleted_at;index" json:"-"`
}

func (Comment) TableName() string { return "comments" }

func (m *Comment) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

type Reaction struct {
	ID         string    `gorm:"column:id;primaryKey;size:36" json:"id"`
	UserID     string    `gorm:"column:user_id;uniqueIndex:idx_reaction;size:36" json:"userId"`
	TargetType string    `gorm:"column:target_type;uniqueIndex:idx_reaction;size:24" json:"targetType"`
	TargetID   string    `gorm:"column:target_id;uniqueIndex:idx_reaction;size:36" json:"targetId"`
	Kind       string    `gorm:"column:kind;size:24" json:"kind"`
	CreatedAt  time.Time `gorm:"column:created_at" json:"createdAt"`
}

func (Reaction) TableName() string { return "reactions" }

func (m *Reaction) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

type Conversation struct {
	ID        string    `gorm:"column:id;primaryKey;size:36" json:"id"`
	Kind      string    `gorm:"column:kind;size:24;index" json:"kind"`
	State     string    `gorm:"column:state;size:24;default:open" json:"state"`
	CreatedAt time.Time `gorm:"column:created_at" json:"createdAt"`
	UpdatedAt time.Time `gorm:"column:updated_at" json:"updatedAt"`
}

func (Conversation) TableName() string { return "conversations" }

func (m *Conversation) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

type ConversationParticipant struct {
	ID             string    `gorm:"column:id;primaryKey;size:36" json:"id"`
	ConversationID string    `gorm:"column:conversation_id;uniqueIndex:idx_participant;size:36" json:"conversationId"`
	UserID         string    `gorm:"column:user_id;uniqueIndex:idx_participant;index;size:36" json:"userId"`
	LastReadAt     time.Time `gorm:"column:last_read_at" json:"lastReadAt"`
	CreatedAt      time.Time `gorm:"column:created_at" json:"createdAt"`
}

func (ConversationParticipant) TableName() string { return "conversation_participants" }

func (m *ConversationParticipant) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

type Message struct {
	ID             string     `gorm:"column:id;primaryKey;size:36" json:"id"`
	ConversationID string     `gorm:"column:conversation_id;index;size:36" json:"conversationId"`
	SenderID       string     `gorm:"column:sender_id;index;size:36" json:"senderId"`
	Kind           string     `gorm:"column:kind;size:24;default:text" json:"kind"`
	Body           string     `gorm:"column:body;size:4000" json:"body"`
	CreatedAt      time.Time  `gorm:"column:created_at;index" json:"createdAt"`
	RevokedAt      *time.Time `gorm:"column:revoked_at" json:"revokedAt,omitempty"`
}

func (Message) TableName() string { return "messages" }

func (m *Message) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

type Report struct {
	ID         string    `gorm:"column:id;primaryKey;size:36" json:"id"`
	ReporterID string    `gorm:"column:reporter_id;index;size:36" json:"reporterId"`
	TargetType string    `gorm:"column:target_type;index;size:24" json:"targetType"`
	TargetID   string    `gorm:"column:target_id;index;size:36" json:"targetId"`
	Reason     string    `gorm:"column:reason;size:80" json:"reason"`
	Detail     string    `gorm:"column:detail;size:1000" json:"detail"`
	Status     string    `gorm:"column:status;size:24;default:open" json:"status"`
	CreatedAt  time.Time `gorm:"column:created_at;index" json:"createdAt"`
	UpdatedAt  time.Time `gorm:"column:updated_at" json:"updatedAt"`
}

func (Report) TableName() string { return "reports" }

func (m *Report) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

type Block struct {
	ID        string    `gorm:"column:id;primaryKey;size:36" json:"id"`
	UserID    string    `gorm:"column:user_id;uniqueIndex:idx_block;size:36" json:"userId"`
	BlockedID string    `gorm:"column:blocked_id;uniqueIndex:idx_block;size:36" json:"blockedId"`
	CreatedAt time.Time `gorm:"column:created_at" json:"createdAt"`
}

func (Block) TableName() string { return "blocks" }

func (m *Block) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}

type MatchTicket struct {
	ID             string    `gorm:"column:id;primaryKey;size:36" json:"id"`
	UserID         string    `gorm:"column:user_id;uniqueIndex;size:36" json:"userId"`
	Status         string    `gorm:"column:status;index;size:24;default:waiting" json:"status"`
	Preference     string    `gorm:"column:preference;size:80" json:"preference"`
	MatchedWith    *string   `gorm:"column:matched_with;size:36" json:"matchedWith,omitempty"`
	ConversationID *string   `gorm:"column:conversation_id;size:36" json:"conversationId,omitempty"`
	ExpiresAt      time.Time `gorm:"column:expires_at;index" json:"expiresAt"`
	CreatedAt      time.Time `gorm:"column:created_at;index" json:"createdAt"`
	UpdatedAt      time.Time `gorm:"column:updated_at" json:"updatedAt"`
}

func (MatchTicket) TableName() string { return "match_tickets" }

func (m *MatchTicket) BeforeCreate(tx *gorm.DB) error {
	if m.ID == "" {
		m.ID = uuid.NewString()
	}
	return nil
}
