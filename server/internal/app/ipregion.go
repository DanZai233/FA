package app

import (
	"log"
	"net"
	"os"
	"strings"

	"github.com/lionsoul2014/ip2region/binding/golang/service"
)

// GeoLookup 离线 IP 库查询（实现为 *service.Ip2Region）。
type GeoLookup interface {
	Search(ip any) (string, error)
}

func fileExists(path string) bool {
	_, err := os.Stat(path)
	return err == nil
}

// OpenIP2Region 从环境配置或默认 Docker 路径加载 ip2region；失败或未配置时返回 nil。
func OpenIP2Region(v4Path, v6Path string) GeoLookup {
	v4 := strings.TrimSpace(v4Path)
	v6 := strings.TrimSpace(v6Path)
	if v4 == "" && fileExists("/app/data/ip2region_v4.xdb") {
		v4 = "/app/data/ip2region_v4.xdb"
	}
	if v6 == "" && fileExists("/app/data/ip2region_v6.xdb") {
		v6 = "/app/data/ip2region_v6.xdb"
	}
	if v4 == "" && v6 == "" {
		return nil
	}
	r, err := service.NewIp2RegionWithPath(v4, v6)
	if err != nil {
		log.Printf("ip2region: 初始化失败（广场将不展示 ipRegion）：%v", err)
		return nil
	}
	log.Printf("ip2region: 已加载 v4=%q v6=%q", v4, v6)
	return r
}

// PostIPRegionLabel 将请求 IP 转为短文案，供 SocialPost.ipRegion 展示。
func PostIPRegionLabel(geo GeoLookup, ip string) string {
	ip = strings.TrimSpace(ip)
	if ip == "" {
		return ""
	}
	if parsed := net.ParseIP(ip); parsed != nil {
		if parsed.IsLoopback() {
			return "本地"
		}
		if parsed.IsPrivate() || parsed.IsLinkLocalUnicast() {
			return "内网"
		}
	}
	if geo == nil {
		return ""
	}
	raw, err := geo.Search(ip)
	if err != nil || strings.TrimSpace(raw) == "" {
		return ""
	}
	return formatIPRegionPipe(raw)
}

func formatIPRegionPipe(raw string) string {
	parts := strings.Split(raw, "|")
	out := make([]string, 0, len(parts))
	seen := map[string]struct{}{}
	for i, p := range parts {
		p = strings.TrimSpace(p)
		if p == "" || p == "0" {
			continue
		}
		if i == len(parts)-1 && len(p) == 2 && p == strings.ToUpper(p) {
			continue
		}
		if _, ok := seen[p]; ok {
			continue
		}
		seen[p] = struct{}{}
		out = append(out, p)
	}
	if len(out) == 0 {
		return ""
	}
	return strings.Join(out, " · ")
}
