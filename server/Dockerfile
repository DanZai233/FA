FROM golang:1.25-alpine AS build
WORKDIR /src
# 默认使用国内常见可达的 module 代理，避免 proxy.golang.org 超时；可自行覆盖：
#   docker compose build --build-arg GOPROXY=https://proxy.golang.org,direct
ARG GOPROXY=https://goproxy.cn,https://goproxy.io,direct
ENV GOPROXY=${GOPROXY}
COPY go.mod go.sum ./
RUN go mod download
COPY cmd ./cmd
COPY internal ./internal
RUN go build -o /out/faleme-api ./cmd/api

FROM alpine:3.20
WORKDIR /app
RUN mkdir -p /app/data
# 广场留言 IP 归属地（仅 IPv4）；xdb 随仓库 server/data 一并 COPY，避免远端构建访问 GitHub。
COPY data/ip2region_v4.xdb /app/data/ip2region_v4.xdb
COPY --from=build /out/faleme-api /app/faleme-api
EXPOSE 8083
ENV FALEME_ADDR=:8083
CMD ["/app/faleme-api"]
