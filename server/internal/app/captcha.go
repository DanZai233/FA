package app

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"
)

type captchaEntry struct {
	answer string
	until  time.Time
}

type captchaStore struct {
	mu   sync.Mutex
	data map[string]captchaEntry
}

func newCaptchaStore() *captchaStore {
	return &captchaStore{data: map[string]captchaEntry{}}
}

func (c *captchaStore) issue() (id string, svg string) {
	const letters = "abcdefghjkmnpqrstuvwxyz23456789"
	b := make([]byte, 4)
	if _, err := rand.Read(b); err != nil {
		id = fmt.Sprintf("%d", time.Now().UnixNano())
		answer := "x7k2"
		c.mu.Lock()
		c.data[id] = captchaEntry{answer: answer, until: time.Now().Add(10 * time.Minute)}
		c.mu.Unlock()
		return id, buildCaptchaSVG(answer)
	}
	answer := ""
	for _, x := range b {
		answer += string(letters[int(x)%len(letters)])
	}
	raw := make([]byte, 16)
	_, _ = rand.Read(raw)
	id = hex.EncodeToString(raw)
	c.mu.Lock()
	c.data[id] = captchaEntry{answer: answer, until: time.Now().Add(10 * time.Minute)}
	c.mu.Unlock()
	return id, buildCaptchaSVG(answer)
}

func (c *captchaStore) verify(id, userInput string) bool {
	if id == "" || userInput == "" {
		return false
	}
	c.mu.Lock()
	defer c.mu.Unlock()
	e, ok := c.data[id]
	if !ok || time.Now().After(e.until) {
		return false
	}
	delete(c.data, id)
	return strings.EqualFold(strings.TrimSpace(userInput), e.answer)
}

func buildCaptchaSVG(code string) string {
	// 简单 SVG「图片」验证码，无需额外字体依赖
	var chars strings.Builder
	for i, ch := range code {
		x := 18 + i*36
		rot := (i*11 - 5) % 21
		chars.WriteString(fmt.Sprintf(
			`<text x="%d" y="38" font-size="32" font-weight="800" fill="#1e293b" transform="rotate(%d %d 38)" font-family="ui-monospace, SFMono-Regular, Menlo, monospace">%c</text>`,
			x, rot, x+8, ch,
		))
	}
	return fmt.Sprintf(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="56" viewBox="0 0 200 56">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff1f2"/>
      <stop offset="1" stop-color="#fce7f3"/>
    </linearGradient>
  </defs>
  <rect width="200" height="56" rx="14" fill="url(#bg)" stroke="#fda4af" stroke-width="2"/>
  <g opacity="0.35">%s</g>
  %s
</svg>`, noiseLines(), chars.String())
}

func noiseLines() string {
	var b strings.Builder
	for i := 0; i < 6; i++ {
		x1, y1 := (i*37)%200, (i*13)%56
		x2, y2 := (x1+80)%200, (y1+30)%56
		b.WriteString(fmt.Sprintf(`<line x1="%d" y1="%d" x2="%d" y2="%d" stroke="#fb7185" stroke-width="1.2"/>`, x1, y1, x2, y2))
	}
	return b.String()
}

func (s *Server) handleCaptcha(w http.ResponseWriter, _ *http.Request) {
	id, svg := s.captchas.issue()
	b64 := base64.StdEncoding.EncodeToString([]byte(svg))
	payload := map[string]string{
		"id":          id,
		"imageBase64": b64,
		"mimeType":    "image/svg+xml",
		"dataUrl":     "data:image/svg+xml;base64," + b64,
	}
	writeJSON(w, http.StatusOK, payload)
}
