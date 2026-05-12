package app

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

type outboundMessage struct {
	UserID  string `json:"userId"`
	Payload any    `json:"payload"`
}

type Hub struct {
	register   chan *Client
	unregister chan *Client
	broadcast  chan outboundMessage
	clients    map[string]map[*Client]bool
}

type Client struct {
	UserID string
	Conn   *websocket.Conn
	Send   chan any
	Hub    *Hub
}

func NewHub() *Hub {
	return &Hub{
		register:   make(chan *Client),
		unregister: make(chan *Client),
		broadcast:  make(chan outboundMessage, 64),
		clients:    map[string]map[*Client]bool{},
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.register:
			if h.clients[client.UserID] == nil {
				h.clients[client.UserID] = map[*Client]bool{}
			}
			h.clients[client.UserID][client] = true
		case client := <-h.unregister:
			if bucket := h.clients[client.UserID]; bucket != nil {
				delete(bucket, client)
				close(client.Send)
				if len(bucket) == 0 {
					delete(h.clients, client.UserID)
				}
			}
		case msg := <-h.broadcast:
			for client := range h.clients[msg.UserID] {
				select {
				case client.Send <- msg.Payload:
				default:
					close(client.Send)
					delete(h.clients[msg.UserID], client)
				}
			}
		}
	}
}

func (h *Hub) Push(userID string, payload any) {
	h.broadcast <- outboundMessage{UserID: userID, Payload: payload}
}

func (s *Server) serveWebSocket(c *gin.Context) {
	upgrader := websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}
	conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	client := &Client{UserID: currentUserID(c), Conn: conn, Send: make(chan any, 16), Hub: s.hub}
	s.hub.register <- client
	go client.writePump()
	client.readPump()
}

func (c *Client) readPump() {
	defer func() {
		c.Hub.unregister <- c
		_ = c.Conn.Close()
	}()
	c.Conn.SetReadLimit(8192)
	for {
		if _, _, err := c.Conn.ReadMessage(); err != nil {
			return
		}
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(30 * time.Second)
	defer func() {
		ticker.Stop()
		_ = c.Conn.Close()
	}()
	for {
		select {
		case payload, ok := <-c.Send:
			if !ok {
				_ = c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}
			if err := c.Conn.WriteJSON(payload); err != nil {
				return
			}
		case <-ticker.C:
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

type joinMatchRequest struct { Preference string  }
