package app

import (
	"net"
	"net/http"
	"strings"
)

// ClientIP 取用于归属地解析的客户端地址（不做鉴权依据）。
// 优先 X-Forwarded-For 链首、其次 X-Real-IP，最后 RemoteAddr。
func ClientIP(r *http.Request) string {
	if r == nil {
		return ""
	}
	if xff := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); xff != "" {
		parts := strings.Split(xff, ",")
		if len(parts) > 0 {
			if host := stripIPHost(strings.TrimSpace(parts[0])); host != "" {
				return host
			}
		}
	}
	if xr := strings.TrimSpace(r.Header.Get("X-Real-IP")); xr != "" {
		if host := stripIPHost(xr); host != "" {
			return host
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		return host
	}
	addr := strings.TrimSpace(r.RemoteAddr)
	if strings.HasPrefix(addr, "[") {
		if i := strings.LastIndex(addr, "]"); i > 1 {
			return addr[1:i]
		}
	}
	return addr
}

func stripIPHost(s string) string {
	s = strings.TrimSpace(s)
	if s == "" {
		return ""
	}
	if strings.HasPrefix(s, "[") {
		if i := strings.LastIndex(s, "]"); i > 1 {
			return s[1:i]
		}
	}
	if host, _, err := net.SplitHostPort(s); err == nil {
		return host
	}
	return s
}
