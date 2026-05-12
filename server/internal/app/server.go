package app

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

type Server struct {
	cfg    Config
	db     *gorm.DB
	redis  *redis.Client
	router *gin.Engine
	hub    *Hub
}

func New(cfg Config) (*Server, error) {
	db, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
	})
	if err != nil {
		return nil, fmt.Errorf("connect database: %w", err)
	}

	if err := migrate(db); err != nil {
		return nil, err
	}

	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.RedisAddr,
		Password: cfg.RedisPassword,
		DB:       cfg.RedisDB,
	})
	if err := rdb.Ping(context.Background()).Err(); err != nil {
		return nil, fmt.Errorf("connect redis: %w", err)
	}

	server := &Server{
		cfg:   cfg,
		db:    db,
		redis: rdb,
		hub:   NewHub(),
	}
	server.router = server.routes()
	go server.hub.Run()
	return server, nil
}

func migrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&User{},
		&PrivateRecord{},
		&PartnerRelation{},
		&Post{},
		&Comment{},
		&Reaction{},
		&Conversation{},
		&ConversationParticipant{},
		&Message{},
		&Report{},
		&Block{},
		&MatchTicket{},
	)
}

func (s *Server) Run() error {
	return s.router.Run(":" + s.cfg.Port)
}

func (s *Server) routes() *gin.Engine {
	if s.cfg.Env == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	r := gin.New()
	r.Use(gin.Logger(), gin.Recovery())
	r.Use(cors.New(cors.Config{
		AllowOrigins:     s.cfg.AllowOrigins,
		AllowMethods:     []string{http.MethodGet, http.MethodPost, http.MethodPatch, http.MethodDelete, http.MethodOptions},
		AllowHeaders:     []string{"Authorization", "Content-Type"},
		ExposeHeaders:    []string{"X-Request-Id"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	r.GET("/healthz", s.health)

	api := r.Group("/api/v1")
	api.POST("/auth/anonymous", s.createAnonymousSession)
	api.POST("/auth/refresh", s.refreshToken)
	api.GET("/ws", s.authFromQuery(), s.serveWebSocket)

	protected := api.Group("")
	protected.Use(s.requireAuth())
	protected.GET("/me", s.getMe)
	protected.PATCH("/me", s.updateMe)
	protected.GET("/records", s.listRecords)
	protected.POST("/records", s.createRecord)
	protected.GET("/records/stats", s.recordStats)
	protected.POST("/partner/invite", s.createPartnerInvite)
	protected.POST("/partner/bind", s.bindPartner)
	protected.DELETE("/partner", s.unlinkPartner)
	protected.GET("/posts", s.listPosts)
	protected.POST("/posts", s.createPost)
	protected.GET("/posts/:id/comments", s.listComments)
	protected.POST("/posts/:id/comments", s.createComment)
	protected.POST("/posts/:id/like", s.likePost)
	protected.DELETE("/posts/:id/like", s.unlikePost)
	protected.POST("/reports", s.createReport)
	protected.POST("/blocks", s.blockUser)
	protected.DELETE("/blocks/:id", s.unblockUser)
	protected.POST("/match/random/join", s.joinRandomMatch)
	protected.POST("/match/random/leave", s.leaveRandomMatch)
	protected.GET("/match/random/status", s.matchStatus)
	protected.GET("/conversations", s.listConversations)
	protected.GET("/conversations/:id/messages", s.listMessages)
	protected.POST("/conversations/:id/messages", s.createMessage)
	protected.POST("/conversations/:id/read", s.markConversationRead)

	admin := api.Group("/admin")
	admin.Use(s.requireAuth(), s.requireAdmin())
	admin.GET("/reports", s.adminListReports)
	admin.PATCH("/reports/:id", s.adminUpdateReport)
	admin.PATCH("/posts/:id/status", s.adminUpdatePostStatus)

	return r
}

func (s *Server) health(c *gin.Context) {
	ctx, cancel := context.WithTimeout(c.Request.Context(), time.Second)
	defer cancel()

	sqlDB, err := s.db.DB()
	if err != nil || sqlDB.PingContext(ctx) != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "degraded", "database": "down"})
		return
	}
	if err := s.redis.Ping(ctx).Err(); err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "degraded", "redis": "down"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}

func bindJSON(c *gin.Context, dst any) bool {
	if err := c.ShouldBindJSON(dst); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid_request", "message": err.Error()})
		return false
	}
	return true
}

func currentUserID(c *gin.Context) string {
	value, _ := c.Get("userID")
	userID, _ := value.(string)
	return userID
}

func cleanText(value string, max int) string {
	value = strings.TrimSpace(value)
	if len([]rune(value)) > max {
		return string([]rune(value)[:max])
	}
	return value
}

func isNotFound(err error) bool {
	return errors.Is(err, gorm.ErrRecordNotFound)
}
