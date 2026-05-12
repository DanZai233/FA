package app

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

func (s *Server) getMe(c *gin.Context) {
	var user User
	if err := s.db.First(&user, "id = ?", currentUserID(c)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user_not_found"})
		return
	}
	c.JSON(http.StatusOK, user)
}

type updateMeRequest struct {
	DisplayName  *string `json:"displayName"`
	Bio          *string `json:"bio"`
	Role         *string `json:"role"`
	Gender       *string `json:"gender"`
	Preference   *string `json:"preference"`
	Mood         *string `json:"mood"`
	AvatarURL    *string `json:"avatarUrl"`
	AgeConfirmed *bool   `json:"ageConfirmed"`
}

func (s *Server) updateMe(c *gin.Context) {
	var req updateMeRequest
	if !bindJSON(c, &req) {
		return
	}
	updates := map[string]any{}
	if req.DisplayName != nil { updates["display_name"] = cleanText(*req.DisplayName, 80) }
	if req.Bio != nil { updates["bio"] = cleanText(*req.Bio, 240) }
	if req.Role != nil { updates["role"] = cleanText(*req.Role, 24) }
	if req.Gender != nil { updates["gender"] = cleanText(*req.Gender, 32) }
	if req.Preference != nil { updates["preference"] = cleanText(*req.Preference, 32) }
	if req.Mood != nil { updates["mood"] = cleanText(*req.Mood, 40) }
	if req.AvatarURL != nil { updates["avatar_url"] = cleanText(*req.AvatarURL, 512) }
	if req.AgeConfirmed != nil { updates["age_confirmed"] = *req.AgeConfirmed }
	if len(updates) == 0 { s.getMe(c); return }
	if err := s.db.Model(&User{}).Where("id = ?", currentUserID(c)).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "update_user_failed"})
		return
	}
	s.getMe(c)
}

func (s *Server) listRecords(c *gin.Context) {
	var records []PrivateRecord
	query := s.db.Where("user_id = ?", currentUserID(c)).Order("occurred_at desc")
	if from := c.Query("from"); from != "" { query = query.Where("date >= ?", from) }
	if to := c.Query("to"); to != "" { query = query.Where("date <= ?", to) }
	if err := query.Limit(limitParam(c, 100)).Find(&records).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "list_records_failed"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"items": records})
}

type createRecordRequest struct {
	OccurredAt  *time.Time `json:"occurredAt"`
	Role        string     `json:"role"`
	Method      string     `json:"method" binding:"required"`
	Ejaculation string     `json:"ejaculation"`
	Rating      int        `json:"rating" binding:"min=1,max=5"`
	Visibility  string     `json:"visibility"`
	Notes       string     `json:"notes"`
}

func (s *Server) createRecord(c *gin.Context) {
	var req createRecordRequest
	if !bindJSON(c, &req) { return }
	occurredAt := time.Now()
	if req.OccurredAt != nil { occurredAt = *req.OccurredAt }
	visibility := req.Visibility
	if visibility == "" { visibility = "private" }
	record := PrivateRecord{UserID: currentUserID(c), Date: occurredAt.Format("2006-01-02"), OccurredAt: occurredAt, Role: cleanText(req.Role, 24), Method: cleanText(req.Method, 80), Ejaculation: cleanText(req.Ejaculation, 80), Rating: req.Rating, Visibility: cleanText(visibility, 24), Notes: cleanText(req.Notes, 1000)}
	if err := s.db.Create(&record).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "create_record_failed"})
		return
	}
	c.JSON(http.StatusCreated, record)
}

func (s *Server) recordStats(c *gin.Context) {
	userID := currentUserID(c)
	month := c.DefaultQuery("month", time.Now().Format("2006-01"))
	var total int64
	var monthTotal int64
	s.db.Model(&PrivateRecord{}).Where("user_id = ?", userID).Count(&total)
	s.db.Model(&PrivateRecord{}).Where("user_id = ? AND date LIKE ?", userID, month+"%").Count(&monthTotal)
	c.JSON(http.StatusOK, gin.H{"total": total, "month": month, "monthTotal": monthTotal})
}

func (s *Server) createPartnerInvite(c *gin.Context) {
	userID := currentUserID(c)
	var relation PartnerRelation
	err := s.db.Where("user_id = ?", userID).First(&relation).Error
	if isNotFound(err) {
		relation = PartnerRelation{UserID: userID, InviteCode: randomCode(), Status: "pending"}
		err = s.db.Create(&relation).Error
	}
	if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "invite_failed"}); return }
	c.JSON(http.StatusOK, relation)
}

type bindPartnerRequest struct { InviteCode string `json:"inviteCode" binding:"required"` }

func (s *Server) bindPartner(c *gin.Context) {
	var req bindPartnerRequest
	if !bindJSON(c, &req) { return }
	userID := currentUserID(c)
	var relation PartnerRelation
	if err := s.db.Where("invite_code = ? AND status = ?", strings.ToUpper(strings.TrimSpace(req.InviteCode)), "pending").First(&relation).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "invite_not_found"}); return
	}
	if relation.UserID == userID { c.JSON(http.StatusBadRequest, gin.H{"error": "cannot_bind_self"}); return }
	now := time.Now()
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Model(&PartnerRelation{}).Where("id = ?", relation.ID).Updates(map[string]any{"partner_id": userID, "status": "connected", "connected_at": now}).Error; err != nil { return err }
		own := PartnerRelation{UserID: userID, PartnerID: &relation.UserID, InviteCode: randomCode(), Status: "connected", ConnectedAt: &now}
		return tx.Clauses(clause.OnConflict{Columns: []clause.Column{{Name: "user_id"}}, DoUpdates: clause.AssignmentColumns([]string{"partner_id", "status", "connected_at"})}).Create(&own).Error
	})
	if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "bind_failed"}); return }
	c.JSON(http.StatusOK, gin.H{"status": "connected"})
}

func (s *Server) unlinkPartner(c *gin.Context) {
	userID := currentUserID(c)
	s.db.Model(&PartnerRelation{}).Where("user_id = ? OR partner_id = ?", userID, userID).Updates(map[string]any{"partner_id": nil, "status": "pending", "connected_at": nil})
	c.Status(http.StatusNoContent)
}

func (s *Server) listPosts(c *gin.Context) {
	var posts []Post
	query := s.db.Where("status = ?", "visible").Order("created_at desc")
	if topic := c.Query("topic"); topic != "" { query = query.Where("topic = ?", cleanText(topic, 60)) }
	if cursor := c.Query("before"); cursor != "" { query = query.Where("created_at < ?", cursor) }
	if err := query.Limit(limitParam(c, 30)).Find(&posts).Error; err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "list_posts_failed"}); return }
	c.JSON(http.StatusOK, gin.H{"items": posts})
}

type createPostRequest struct { Body string `json:"body" binding:"required"`; Mood string `json:"mood"`; Topic string `json:"topic"`; Anonymous bool `json:"anonymous"` }

func (s *Server) createPost(c *gin.Context) {
	var req createPostRequest
	if !bindJSON(c, &req) { return }
	post := Post{AuthorID: currentUserID(c), Body: cleanText(req.Body, 2000), Mood: cleanText(req.Mood, 40), Topic: cleanText(req.Topic, 60), Anonymous: req.Anonymous, Status: initialContentStatus(req.Body)}
	if err := s.db.Create(&post).Error; err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "create_post_failed"}); return }
	c.JSON(http.StatusCreated, post)
}

func (s *Server) listComments(c *gin.Context) {
	var comments []Comment
	if err := s.db.Where("post_id = ? AND status = ?", c.Param("id"), "visible").Order("created_at asc").Limit(limitParam(c, 100)).Find(&comments).Error; err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "list_comments_failed"}); return }
	c.JSON(http.StatusOK, gin.H{"items": comments})
}

type createCommentRequest struct { Body string `json:"body" binding:"required"` }

func (s *Server) createComment(c *gin.Context) {
	var req createCommentRequest
	if !bindJSON(c, &req) { return }
	comment := Comment{PostID: c.Param("id"), AuthorID: currentUserID(c), Body: cleanText(req.Body, 1000), Status: initialContentStatus(req.Body)}
	err := s.db.Transaction(func(tx *gorm.DB) error {
		if err := tx.Create(&comment).Error; err != nil { return err }
		return tx.Model(&Post{}).Where("id = ?", c.Param("id")).UpdateColumn("comment_count", gorm.Expr("comment_count + 1")).Error
	})
	if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "create_comment_failed"}); return }
	c.JSON(http.StatusCreated, comment)
}

func (s *Server) likePost(c *gin.Context) {
	reaction := Reaction{UserID: currentUserID(c), TargetType: "post", TargetID: c.Param("id"), Kind: "like"}
	err := s.db.Transaction(func(tx *gorm.DB) error {
		result := tx.Clauses(clause.OnConflict{DoNothing: true}).Create(&reaction)
		if result.Error != nil { return result.Error }
		if result.RowsAffected > 0 { return tx.Model(&Post{}).Where("id = ?", c.Param("id")).UpdateColumn("like_count", gorm.Expr("like_count + 1")).Error }
		return nil
	})
	if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "like_failed"}); return }
	c.JSON(http.StatusOK, gin.H{"liked": true})
}

func (s *Server) unlikePost(c *gin.Context) {
	err := s.db.Transaction(func(tx *gorm.DB) error {
		result := tx.Where("user_id = ? AND target_type = ? AND target_id = ?", currentUserID(c), "post", c.Param("id")).Delete(&Reaction{})
		if result.Error != nil { return result.Error }
		if result.RowsAffected > 0 { return tx.Model(&Post{}).Where("id = ? AND like_count > 0", c.Param("id")).UpdateColumn("like_count", gorm.Expr("like_count - 1")).Error }
		return nil
	})
	if err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "unlike_failed"}); return }
	c.Status(http.StatusNoContent)
}

type createReportRequest struct { TargetType string `json:"targetType" binding:"required"`; TargetID string `json:"targetId" binding:"required"`; Reason string `json:"reason" binding:"required"`; Detail string `json:"detail"` }

func (s *Server) createReport(c *gin.Context) {
	var req createReportRequest
	if !bindJSON(c, &req) { return }
	report := Report{ReporterID: currentUserID(c), TargetType: cleanText(req.TargetType, 24), TargetID: cleanText(req.TargetID, 36), Reason: cleanText(req.Reason, 80), Detail: cleanText(req.Detail, 1000), Status: "open"}
	if err := s.db.Create(&report).Error; err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "report_failed"}); return }
	c.JSON(http.StatusCreated, report)
}

type blockRequest struct { BlockedID string `json:"blockedId" binding:"required"` }

func (s *Server) blockUser(c *gin.Context) {
	var req blockRequest
	if !bindJSON(c, &req) { return }
	block := Block{UserID: currentUserID(c), BlockedID: cleanText(req.BlockedID, 36)}
	if err := s.db.Clauses(clause.OnConflict{DoNothing: true}).Create(&block).Error; err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "block_failed"}); return }
	c.JSON(http.StatusCreated, block)
}

func (s *Server) unblockUser(c *gin.Context) {
	s.db.Where("user_id = ? AND blocked_id = ?", currentUserID(c), c.Param("id")).Delete(&Block{})
	c.Status(http.StatusNoContent)
}

func (s *Server) adminListReports(c *gin.Context) {
	var reports []Report
	if err := s.db.Order("created_at desc").Limit(limitParam(c, 100)).Find(&reports).Error; err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "list_reports_failed"}); return }
	c.JSON(http.StatusOK, gin.H{"items": reports})
}

type adminUpdateReportRequest struct { Status string `json:"status" binding:"required"` }

func (s *Server) adminUpdateReport(c *gin.Context) {
	var req adminUpdateReportRequest
	if !bindJSON(c, &req) { return }
	if err := s.db.Model(&Report{}).Where("id = ?", c.Param("id")).Update("status", cleanText(req.Status, 24)).Error; err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "update_report_failed"}); return }
	c.Status(http.StatusNoContent)
}

type adminUpdatePostStatusRequest struct { Status string `json:"status" binding:"required"` }

func (s *Server) adminUpdatePostStatus(c *gin.Context) {
	var req adminUpdatePostStatusRequest
	if !bindJSON(c, &req) { return }
	if err := s.db.Model(&Post{}).Where("id = ?", c.Param("id")).Update("status", cleanText(req.Status, 24)).Error; err != nil { c.JSON(http.StatusInternalServerError, gin.H{"error": "update_post_failed"}); return }
	c.Status(http.StatusNoContent)
}

func limitParam(c *gin.Context, fallback int) int {
	limit, err := strconv.Atoi(c.DefaultQuery("limit", strconv.Itoa(fallback)))
	if err != nil || limit < 1 { return fallback }
	if limit > 200 { return 200 }
	return limit
}

func initialContentStatus(body string) string {
	lower := strings.ToLower(body)
	blocked := []string{"违法", "未成年", "暴力交易"}
	for _, word := range blocked { if strings.Contains(lower, word) { return "pending_review" } }
	return "visible"
}
