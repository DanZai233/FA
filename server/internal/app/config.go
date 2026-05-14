package app

import "os"

type Config struct {
	Addr            string
	AllowedOrigin   string
	MarketingURL    string
	SupportEmail    string
	DatabaseURL     string
	RequireAdultAck bool
}

func LoadConfig() Config {
	return Config{
		Addr:            env("FALEME_ADDR", ":8083"),
		AllowedOrigin:   env("FALEME_ALLOWED_ORIGIN", "http://localhost:3003"),
		MarketingURL:    env("FALEME_MARKETING_URL", "http://localhost:3003"),
		SupportEmail:    env("FALEME_SUPPORT_EMAIL", "support@example.com"),
		DatabaseURL:     env("DATABASE_URL", ""),
		RequireAdultAck: env("FALEME_REQUIRE_ADULT_ACK", "true") != "false",
	}
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
