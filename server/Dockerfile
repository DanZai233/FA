FROM golang:1.25-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY cmd ./cmd
COPY internal ./internal
RUN go build -o /out/faleme-api ./cmd/api

FROM alpine:3.20
WORKDIR /app
COPY --from=build /out/faleme-api /app/faleme-api
EXPOSE 8083
ENV FALEME_ADDR=:8083
CMD ["/app/faleme-api"]
