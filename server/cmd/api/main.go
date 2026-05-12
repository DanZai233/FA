package main

import (
	"log"

	"fa/server/internal/app"
)

func main() {
	cfg := app.LoadConfig()
	server, err := app.New(cfg)
	if err != nil {
		log.Fatalf("start api: %v", err)
	}

	if err := server.Run(); err != nil {
		log.Fatalf("run api: %v", err)
	}
}
