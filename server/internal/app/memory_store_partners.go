package app

import (
	"fmt"
	"strings"
	"time"
)

func migrateLegacyPartnersMap(old map[string]PartnerLink, slots map[string][]PartnerLink) map[string][]PartnerLink {
	if len(slots) > 0 {
		return slots
	}
	out := make(map[string][]PartnerLink)
	for uid, pl := range old {
		if pl.Status == "none" && strings.TrimSpace(pl.InviteCode) == "" {
			continue
		}
		out[uid] = []PartnerLink{pl}
	}
	return out
}

func countLinkedSlots(slots []PartnerLink) int {
	n := 0
	for _, pl := range slots {
		if pl.Status == "linked" && strings.TrimSpace(pl.PartnerID) != "" {
			n++
		}
	}
	return n
}

func stripPendingFromSlots(slots []PartnerLink) []PartnerLink {
	var out []PartnerLink
	for _, pl := range slots {
		if pl.Status == "pending" {
			continue
		}
		out = append(out, pl)
	}
	return out
}

func (s *MemoryStore) partnerInviteTakenLocked(code string) bool {
	for _, slots := range s.partnerSlots {
		for _, pl := range slots {
			if strings.EqualFold(strings.TrimSpace(pl.InviteCode), code) && (pl.Status == "pending" || pl.Status == "linked") {
				return true
			}
		}
	}
	return false
}

func (s *MemoryStore) findInviterByPendingCodeLocked(code string) (inviterID string, slotIdx int) {
	for uid, slots := range s.partnerSlots {
		for i, pl := range slots {
			if pl.Status == "pending" && strings.EqualFold(strings.TrimSpace(pl.InviteCode), code) {
				return uid, i
			}
		}
	}
	return "", -1
}

func (s *MemoryStore) removePeerFromSlotsLocked(peerUserID, removeID string) {
	slots := s.partnerSlots[peerUserID]
	if len(slots) == 0 {
		return
	}
	var next []PartnerLink
	for _, pl := range slots {
		if pl.Status == "linked" && pl.PartnerID == removeID {
			continue
		}
		next = append(next, pl)
	}
	if len(next) == 0 {
		delete(s.partnerSlots, peerUserID)
	} else {
		s.partnerSlots[peerUserID] = next
	}
}

// PartnerHub 返回当前用户的伴侣总览（含 relationshipMode）。
func (s *MemoryStore) PartnerHub(userID string) PartnerHubResponse {
	s.mu.RLock()
	defer s.mu.RUnlock()
	u := s.users[userID]
	mode := effectiveRelationshipMode(u)
	slots := append([]PartnerLink{}, s.partnerSlots[userID]...)
	wires := make([]PartnerWire, 0, len(slots))
	for _, pl := range slots {
		w := PartnerWire{PartnerLink: pl}
		if pid := strings.TrimSpace(pl.PartnerID); pid != "" {
			if peer, ok := s.users[pid]; ok {
				w.PeerNickname = strings.TrimSpace(peer.Nickname)
			}
		}
		wires = append(wires, w)
	}
	return PartnerHubResponse{RelationshipMode: mode, Partners: wires}
}

// Partner 兼容：返回第一条连线（首条 linked，否则首条 pending，否则 none）。
func (s *MemoryStore) Partner(userID string) (PartnerLink, error) {
	h := s.PartnerHub(userID)
	if len(h.Partners) == 0 {
		return PartnerLink{Status: "none"}, nil
	}
	for _, w := range h.Partners {
		if w.Status == "linked" {
			return w.PartnerLink, nil
		}
	}
	return h.Partners[0].PartnerLink, nil
}

func (s *MemoryStore) UnlinkPartner(userID, peerID string) PartnerHubResponse {
	s.mu.Lock()
	defer s.mu.Unlock()
	slots := append([]PartnerLink{}, s.partnerSlots[userID]...)
	if len(slots) == 0 {
		s.persistLocked()
		return s.partnerHubLocked(userID)
	}
	u := s.users[userID]
	if effectiveRelationshipMode(u) != RelationshipPoly || strings.TrimSpace(peerID) == "" {
		for _, pl := range slots {
			if pid := strings.TrimSpace(pl.PartnerID); pid != "" {
				s.removePeerFromSlotsLocked(pid, userID)
			}
		}
		delete(s.partnerSlots, userID)
		s.persistLocked()
		return s.partnerHubLocked(userID)
	}
	for _, pl := range slots {
		if pl.Status == "linked" && pl.PartnerID == peerID {
			s.removePeerFromSlotsLocked(peerID, userID)
		}
	}
	s.removePeerFromSlotsLocked(userID, peerID)
	s.persistLocked()
	return s.partnerHubLocked(userID)
}

func (s *MemoryStore) partnerHubLocked(userID string) PartnerHubResponse {
	u := s.users[userID]
	mode := effectiveRelationshipMode(u)
	slots := append([]PartnerLink{}, s.partnerSlots[userID]...)
	wires := make([]PartnerWire, 0, len(slots))
	for _, pl := range slots {
		w := PartnerWire{PartnerLink: pl}
		if pid := strings.TrimSpace(pl.PartnerID); pid != "" {
			if peer, ok := s.users[pid]; ok {
				w.PeerNickname = strings.TrimSpace(peer.Nickname)
			}
		}
		wires = append(wires, w)
	}
	return PartnerHubResponse{RelationshipMode: mode, Partners: wires}
}

func (s *MemoryStore) CreateInvite(userID string) (PartnerLink, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	u := s.users[userID]
	slots := append([]PartnerLink{}, s.partnerSlots[userID]...)
	if !isPolyUser(u) {
		for _, pl := range slots {
			if pl.Status == "linked" {
				return PartnerLink{}, errPartnerLinked
			}
		}
		slots = stripPendingFromSlots(slots)
	} else {
		slots = stripPendingFromSlots(slots)
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
	slots = append(slots, link)
	s.partnerSlots[userID] = slots
	s.persistLocked()
	return link, nil
}

func (s *MemoryStore) AcceptInvite(accepterID, inviteCode string) (PartnerLink, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	code := strings.TrimSpace(strings.ToUpper(inviteCode))
	if code == "" {
		return PartnerLink{}, errInvalidInvite
	}
	inviterID, idx := s.findInviterByPendingCodeLocked(code)
	if inviterID == "" || idx < 0 {
		return PartnerLink{}, errInvalidInvite
	}
	if inviterID == accepterID {
		return PartnerLink{}, errSelfPartner
	}
	if !isPolyUser(s.users[accepterID]) {
		for _, pl := range s.partnerSlots[accepterID] {
			if pl.Status == "linked" && strings.TrimSpace(pl.PartnerID) != "" {
				return PartnerLink{}, errPartnerLinked
			}
		}
	}
	now := time.Now()
	invSlots := append([]PartnerLink{}, s.partnerSlots[inviterID]...)
	if idx >= len(invSlots) {
		return PartnerLink{}, errInvalidInvite
	}
	inv := invSlots[idx]
	inv.Status = "linked"
	inv.PartnerID = accepterID
	inv.CanShare = true
	inv.ConfirmedAt = now
	invSlots[idx] = inv
	s.partnerSlots[inviterID] = invSlots

	acSlots := append([]PartnerLink{}, s.partnerSlots[accepterID]...)
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
	acSlots = append(acSlots, ac)
	s.partnerSlots[accepterID] = acSlots
	s.persistLocked()
	return ac, nil
}

func (s *MemoryStore) AddPartnerMessage(userID, phrase, scene, targetPeer string) PartnerMessage {
	s.mu.Lock()
	defer s.mu.Unlock()
	message := PartnerMessage{
		ID:           fmt.Sprintf("msg-%d", time.Now().UnixNano()),
		UserID:       userID,
		Phrase:       fallback(phrase, "安全员已上线 / 今日小火苗 / 提醒戴好装备 / 尊重同意最性感"),
		Scene:        fallback(scene, "partner"),
		TargetPeerID: strings.TrimSpace(targetPeer),
		CreatedAt:    time.Now(),
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
	slots := s.partnerSlots[userID]
	var peers []string
	for _, pl := range slots {
		if pl.Status == "linked" && pl.PartnerID != "" {
			peers = append(peers, pl.PartnerID)
		}
	}
	if len(peers) == 0 {
		s.persistLocked()
		return message
	}
	tgt := strings.TrimSpace(targetPeer)
	if tgt != "" {
		ok := false
		for _, p := range peers {
			if p == tgt {
				ok = true
				break
			}
		}
		if ok {
			s.messages[tgt] = append([]PartnerMessage{message}, s.messages[tgt]...)
		}
	} else {
		for _, p := range peers {
			s.messages[p] = append([]PartnerMessage{message}, s.messages[p]...)
		}
	}
	s.persistLocked()
	return message
}

func (s *MemoryStore) CreatePartnerShareRequest(fromID string, body CreatePartnerShareBody) (PartnerShareRequest, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	slots := s.partnerSlots[fromID]
	var linkedPeers []string
	for _, pl := range slots {
		if pl.Status == "linked" && strings.TrimSpace(pl.PartnerID) != "" {
			linkedPeers = append(linkedPeers, strings.TrimSpace(pl.PartnerID))
		}
	}
	if len(linkedPeers) == 0 {
		return PartnerShareRequest{}, errPartnerNotLinked
	}
	toID := strings.TrimSpace(body.TargetPartnerID)
	if len(linkedPeers) > 1 && toID == "" {
		return PartnerShareRequest{}, ErrTargetPartnerRequired
	}
	if toID == "" {
		toID = linkedPeers[0]
	}
	ok := false
	for _, p := range linkedPeers {
		if p == toID {
			ok = true
			break
		}
	}
	if !ok {
		return PartnerShareRequest{}, ErrTargetPartnerNotLinked
	}
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

// 供 DeleteUser 等批量清理：移除所有与 uid 相连的伴侣槽。
func (s *MemoryStore) purgePartnerEdgesLocked(uid string) {
	peers := map[string]struct{}{}
	for _, pl := range s.partnerSlots[uid] {
		if pl.PartnerID != "" {
			peers[pl.PartnerID] = struct{}{}
		}
	}
	delete(s.partnerSlots, uid)
	for pid := range peers {
		s.removePeerFromSlotsLocked(pid, uid)
	}
}
