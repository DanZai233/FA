package app

// RealtimeEvent is the wire shape reserved for partner nudges and square updates.
// V1 keeps delivery on polling endpoints; this type keeps Web, iOS, and backend
// aligned if Server-Sent Events or WebSockets are enabled later.
type RealtimeEvent struct {
	Type    string `json:"type"`
	Payload any    `json:"payload"`
}

const (
	EventPartnerLinked = "partner.linked"
	EventRecordShared  = "record.shared"
	EventPostReported  = "post.reported"
	EventMatchCreated  = "match.created"
)
