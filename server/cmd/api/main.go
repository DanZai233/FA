package main

import (
	"log"
	"net/http"

	"faleme/server/internal/app"
)

func main() {
	cfg := app.LoadConfig()
	persistence, err := app.NewPostgresPersistence(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("postgres persistence init failed: %v", err)
	}
	store := app.NewMemoryStoreWithPersistence(persistence)
	geo := app.OpenIP2Region(cfg.IP2RegionV4DB, cfg.IP2RegionV6DB)
	server := app.NewServer(cfg, store, geo)

	log.Printf("faleme api listening on %s", cfg.Addr)
	if err := http.ListenAndServe(cfg.Addr, server.Routes()); err != nil {
		log.Fatal(err)
	}
}
