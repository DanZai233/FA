package app

import (
	"context"
	"net/http"
	"strings"
)

type contextKey string

const userContextKey contextKey = "user"

func (s *Server) withAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		deviceID := strings.TrimSpace(r.Header.Get("X-Faleme-Device-ID"))
		if deviceID != "" {
			user := s.store.UserByDeviceID(deviceID)
			ctx := context.WithValue(r.Context(), userContextKey, user)
			next(w, r.WithContext(ctx))
			return
		}
		if token == "" {
			token = "demo-token"
		}
		user, ok := s.store.UserByToken(token)
		if !ok {
			writeError(w, http.StatusUnauthorized, "invalid token")
			return
		}
		if s.cfg.RequireAdultAck && !user.AdultConfirmed {
			writeError(w, http.StatusForbidden, "adult confirmation required")
			return
		}
		ctx := context.WithValue(r.Context(), userContextKey, user)
		next(w, r.WithContext(ctx))
	}
}

func currentUser(r *http.Request) User {
	user, _ := r.Context().Value(userContextKey).(User)
	return user
}
