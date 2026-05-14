package app

import "os"

type Config struct {
	Addr            string
	AllowedOrigin   string
	MarketingURL    string
	SupportEmail    string
	DatabaseURL     string
	RequireAdultAck bool
	// IP2Region v4/v6 xdb 路径；留空且镜像内存在 /app/data/ip2region_v{4,6}.xdb 时会自动使用。
	IP2RegionV4DB string
	IP2RegionV6DB string
}

func LoadConfig() Config {
	return Config{
		Addr:            env("FALEME_ADDR", ":8083"),
		AllowedOrigin:   env("FALEME_ALLOWED_ORIGIN", "http://localhost:3003"),
		MarketingURL:    env("FALEME_MARKETING_URL", "http://localhost:3003"),
		SupportEmail:    env("FALEME_SUPPORT_EMAIL", "support@example.com"),
		DatabaseURL:     env("DATABASE_URL", ""),
		RequireAdultAck: env("FALEME_REQUIRE_ADULT_ACK", "true") != "false",
		IP2RegionV4DB:   env("IP2REGION_V4_DB", ""),
		IP2RegionV6DB:   env("IP2REGION_V6_DB", ""),
	}
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
