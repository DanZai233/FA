package app

import (
	"strings"
	"unicode/utf8"
)

// 与前端 src/design/copy.ts 中 phraseBook 四槽文案保持一致；广场发帖仅允许该组合。
var (
	squarePhraseTones = []string{
		"今晚月色不错",
		"理智正在下线",
		"安全员已上线",
		"嘴硬但诚实",
		"成年人开始自检",
		"荷尔蒙请求发言",
		"气氛有点危险",
		"冷静装作在线",
		"心动但有刹车",
		"荒唐正在排队",
		"边界感已加载",
		"温柔正在巡逻",
	}
	squarePhraseSubjects = []string{
		"我的荷尔蒙",
		"这位成年人",
		"今日小火苗",
		"伴侣雷达",
		"安全小队",
		"今晚的理智",
		"这颗心",
		"暧昧气压",
		"身体信号",
		"单人玩家",
		"亲密副本",
		"边界按钮",
	}
	squarePhraseActions = []string{
		"申请抱抱",
		"建议冷静三分钟",
		"提醒戴好装备",
		"发出心动警报",
		"请求确认同意",
		"先去洗手",
		"检查安全措施",
		"打开温柔模式",
		"暂停无保护冲锋",
		"申请亲亲许可",
		"建议补水休息",
		"选择单人排解",
	}
	squarePhraseEndings = []string{
		"但安全第一",
		"请勿无证驾驶",
		"先喝水再说",
		"尊重同意最性感",
		"不舒服就立刻停",
		"别拿概率开玩笑",
		"成年人不赌售后",
		"温柔也要有边界",
		"今天别硬演偶像剧",
		"保护措施先上岗",
		"可以荒唐但别糊涂",
		"把体面留给明天",
	}
	squareToneSet    map[string]struct{}
	squareSubjectSet map[string]struct{}
	squareActionSet  map[string]struct{}
	squareEndingSet  map[string]struct{}
)

func init() {
	squareToneSet = stringSet(squarePhraseTones)
	squareSubjectSet = stringSet(squarePhraseSubjects)
	squareActionSet = stringSet(squarePhraseActions)
	squareEndingSet = stringSet(squarePhraseEndings)
}

func stringSet(items []string) map[string]struct{} {
	m := make(map[string]struct{}, len(items))
	for _, s := range items {
		m[strings.TrimSpace(s)] = struct{}{}
	}
	return m
}

// IsValidPresetSquarePhrase 判断是否为允许的预设拼句（四段 + 词库命中）。
func IsValidPresetSquarePhrase(phrase string) bool {
	phrase = strings.TrimSpace(phrase)
	if phrase == "" || utf8.RuneCountInString(phrase) > 320 {
		return false
	}
	parts := strings.Split(phrase, " / ")
	if len(parts) != 4 {
		return false
	}
	for i := range parts {
		parts[i] = strings.TrimSpace(parts[i])
		if parts[i] == "" {
			return false
		}
	}
	_, ok0 := squareToneSet[parts[0]]
	_, ok1 := squareSubjectSet[parts[1]]
	_, ok2 := squareActionSet[parts[2]]
	_, ok3 := squareEndingSet[parts[3]]
	return ok0 && ok1 && ok2 && ok3
}
