#!/usr/bin/env sh
set -eu

docker compose up --build -d

echo "法了么已启动："
echo "  Web: http://localhost:3003"
echo "  API: http://localhost:8083/healthz"
echo ""
echo "查看日志：docker compose logs -f"
echo "停止服务：docker compose down"
