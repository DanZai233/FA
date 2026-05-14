package main

import (
	"log"
	"log/slog"
	"net/http"
	"os"

	"faleme/server/internal/app"
)

func main() {
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo})))

	cfg := app.LoadConfig()
	persistence, err := app.NewPostgresPersistence(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("postgres persistence init failed: %v", err)
	}
	store := app.NewMemoryStoreWithPersistence(persistence)
	geo := app.OpenIP2Region(cfg.IP2RegionV4DB)
	server := app.NewServer(cfg, store, geo)

	log.Printf("faleme api listening on %s", cfg.Addr)
	if err := http.ListenAndServe(cfg.Addr, server.Routes()); err != nil {
		log.Fatal(err)
	}
}
