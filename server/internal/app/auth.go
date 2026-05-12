package app

import (
	"crypto/rand"
	"encoding/base32"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

type tokenClaims struct {
	UserID string `json:"userId"`
	Kind   string `json:"kind"`
	jwt.RegisteredClaims
}

func (s *Server) signToken(userID string, kind string, ttl time.Duration) (string, error) {
	now := time.Now()
	return jwt.NewWithClaims(jwt.SigningMethodHS256, tokenClaims{
		UserID: userID,
		Kind:   kind,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID,
			Issuer:    "fa-api",
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
		},
	}).SignedString([]byte(s.cfg.JWTSecret))
}

func (s *Server) parseToken(raw string) (*tokenClaims, error) {
	token, err := jwt.ParseWithClaims(raw, &tokenClaims{}, func(token *jwt.Token) (any, error) {
		return []byte(s.cfg.JWTSecret), nil
	})
	if err != nil {
		return nil, err
	}
	claims, ok := token.Claims.(*tokenClaims)
	if !ok || !token.Valid {
		return nil, jwt.ErrTokenInvalidClaims
	}
	return claims, nil
}

func (s *Server) issueTokens(userID string) (gin.H, error) {
	access, err := s.signToken(userID, "access", s.cfg.AccessTokenTTL)
	if err != nil {
		return nil, err
	}
	refresh, err := s.signToken(userID, "refresh", s.cfg.RefreshTokenTTL)
	if err != nil {
		return nil, err
	}
	return gin.H{"accessToken": access, "refreshToken": refresh, "tokenType": "Bearer", "expiresIn": int(s.cfg.AccessTokenTTL.Seconds())}, nil
}

func (s *Server) requireAuth() gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		raw := strings.TrimPrefix(header, "Bearer ")
		if raw == "" || raw == header {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "missing_token"})
			return
		}
		claims, err := s.parseToken(raw)
		if err != nil || claims.Kind != "access" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid_token"})
			return
		}
		c.Set("userID", claims.UserID)
		c.Next()
	}
}

func (s *Server) authFromQuery() gin.HandlerFunc {
	return func(c *gin.Context) {
		claims, err := s.parseToken(c.Query("token"))
		if err != nil || claims.Kind != "access" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid_token"})
			return
		}
		c.Set("userID", claims.UserID)
		c.Next()
	}
}

func (s *Server) requireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		var user User
		if err := s.db.First(&user, "id = ?", currentUserID(c)).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid_user"})
			return
		}
		if !strings.HasPrefix(user.DeviceID, "admin:") {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "admin_required"})
			return
		}
		c.Next()
	}
}

func randomCode() string {
	var b [8]byte
	if _, err := rand.Read(b[:]); err != nil {
		return strings.ToUpper(strings.ReplaceAll(time.Now().Format("150405.000"), ".", ""))
	}
	return strings.TrimRight(base32.StdEncoding.EncodeToString(b[:]), "=")[:10]
}

func txCreateParticipants(tx *gorm.DB, conversationID string, userIDs ...string) error {
	now := time.Now()
	for _, userID := range userIDs {
		if err := tx.Create(&ConversationParticipant{ConversationID: conversationID, UserID: userID, LastReadAt: now}).Error; err != nil {
			return err
		}
	}
	return nil
}
