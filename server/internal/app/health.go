package app

import (
	"math/rand"
	"time"
)

var knowledgeCards = []KnowledgeCard{
	{
		ID:       "k-1",
		Category: "保护",
		Title:    "安全套不是气氛杀手，是成年人防沉迷插件",
		Body:     "正确佩戴、全程使用、事后检查，能显著降低意外怀孕和部分性传播感染风险。",
		Action:   "把安全套放在伸手可及但不高温暴晒的位置。",
		Tone:     "别让一时上头变成长期售后。",
	},
	{
		ID:       "k-2",
		Category: "同意",
		Title:    "“可以吗”比任何套路都性感",
		Body:     "同意必须清醒、明确、可撤回。沉默、犹豫、喝醉都不是默认许可。",
		Action:   "过程中也可以问：“这样舒服吗？要不要停一下？”",
		Tone:     "会确认边界的人，才是真正的高手。",
	},
	{
		ID:       "k-3",
		Category: "无伴侣",
		Title:    "单人排解不丢人，别跟身体较劲",
		Body:     "自慰是常见的性释放方式。注意清洁、润滑、力度和频率，不要用危险物品尝试。",
		Action:   "如果影响学习工作或造成疼痛，及时停下并寻求专业帮助。",
		Tone:     "人可以寂寞，操作不能离谱。",
	},
}

var phraseTemplates = []PhraseTemplate{
	{ID: "tone-1", Slot: "tone", Text: "今晚月色不错", Scenario: "square"},
	{ID: "tone-2", Slot: "tone", Text: "理智正在下线", Scenario: "square"},
	{ID: "tone-3", Slot: "tone", Text: "安全员已上线", Scenario: "partner"},
	{ID: "tone-4", Slot: "tone", Text: "嘴硬但诚实", Scenario: "square"},
	{ID: "tone-5", Slot: "tone", Text: "荷尔蒙请求发言", Scenario: "match"},
	{ID: "tone-6", Slot: "tone", Text: "边界感已加载", Scenario: "partner"},
	{ID: "tone-7", Slot: "tone", Text: "温柔正在巡逻", Scenario: "partner"},
	{ID: "subject-1", Slot: "subject", Text: "我的荷尔蒙", Scenario: "square"},
	{ID: "subject-2", Slot: "subject", Text: "这位成年人", Scenario: "match"},
	{ID: "subject-3", Slot: "subject", Text: "今日小火苗", Scenario: "partner"},
	{ID: "subject-4", Slot: "subject", Text: "身体信号", Scenario: "square"},
	{ID: "subject-5", Slot: "subject", Text: "单人玩家", Scenario: "square"},
	{ID: "subject-6", Slot: "subject", Text: "亲密副本", Scenario: "match"},
	{ID: "action-1", Slot: "action", Text: "申请抱抱", Scenario: "partner"},
	{ID: "action-2", Slot: "action", Text: "建议冷静三分钟", Scenario: "square"},
	{ID: "action-3", Slot: "action", Text: "提醒戴好装备", Scenario: "partner"},
	{ID: "action-4", Slot: "action", Text: "请求确认同意", Scenario: "partner"},
	{ID: "action-5", Slot: "action", Text: "先去洗手", Scenario: "square"},
	{ID: "action-6", Slot: "action", Text: "暂停无保护冲锋", Scenario: "square"},
	{ID: "action-7", Slot: "action", Text: "选择单人排解", Scenario: "match"},
	{ID: "ending-1", Slot: "ending", Text: "但安全第一", Scenario: "square"},
	{ID: "ending-2", Slot: "ending", Text: "尊重同意最性感", Scenario: "partner"},
	{ID: "ending-3", Slot: "ending", Text: "不舒服就立刻停", Scenario: "partner"},
	{ID: "ending-4", Slot: "ending", Text: "别拿概率开玩笑", Scenario: "square"},
	{ID: "ending-5", Slot: "ending", Text: "成年人不赌售后", Scenario: "square"},
	{ID: "ending-6", Slot: "ending", Text: "温柔也要有边界", Scenario: "partner"},
	{ID: "ending-7", Slot: "ending", Text: "可以荒唐但别糊涂", Scenario: "match"},
}

func randomComposedPhrase() string {
	slots := map[string][]string{}
	for _, item := range phraseTemplates {
		slots[item.Slot] = append(slots[item.Slot], item.Text)
	}
	pick := func(slot string) string {
		items := slots[slot]
		if len(items) == 0 {
			return ""
		}
		return items[rand.Intn(len(items))]
	}
	return pick("tone") + " / " + pick("subject") + " / " + pick("action") + " / " + pick("ending")
}

func PredictCycle(cycles []CycleRecord, records []IntimacyRecord) CyclePrediction {
	if len(cycles) == 0 {
		return CyclePrediction{
			TodayAdvice: HealthAdvice{
				Level:  RiskMedium,
				Title:  "先补周期数据",
				Body:   "没有周期记录时，系统不会装大师。先填最近一次经期开始日期。",
				Action: "记录周期后再查看预测。",
			},
		}
	}
	cycle := cycles[0]
	start, err := time.Parse("2006-01-02", cycle.PeriodStart)
	if err != nil {
		start = time.Now()
	}
	if cycle.CycleLength == 0 {
		cycle.CycleLength = 28
	}
	nextStart := start.AddDate(0, 0, cycle.CycleLength)
	nextEnd := nextStart.AddDate(0, 0, 5)
	fertileStart := nextStart.AddDate(0, 0, -15)
	fertileEnd := nextStart.AddDate(0, 0, -10)
	now := truncateDate(time.Now())
	advice := HealthAdvice{
		Level:  RiskMedium,
		Title:  "先确认，再上车",
		Body:   "同意、保护、清醒、舒适，这四样缺一项都别硬演偶像剧。",
		Action: "先问一句“这样可以吗”，再检查保护措施。",
	}
	if between(now, truncateDate(nextStart), truncateDate(nextEnd)) {
		advice = HealthAdvice{Level: RiskHigh, Title: "经期窗口，先别硬闯副本", Body: "经期前后身体更敏感。如果仍要亲密，请充分沟通、注意卫生和保护，疼痛或不适就停止。", Action: "优先选择陪伴、热敷、休息。"}
	} else if between(now, truncateDate(fertileStart), truncateDate(fertileEnd)) {
		advice = HealthAdvice{Level: RiskHigh, Title: "高风险窗口，别拿概率开玩笑", Body: "易孕期附近如果发生无保护性行为，意外怀孕风险更高。请认真使用可靠避孕方式。", Action: "没有保护就暂停；已发生风险行为请及时咨询专业人士。"}
	} else if len(records) > 0 {
		latest, err := time.Parse("2006-01-02", records[0].OccurredAt)
		if err == nil && int(now.Sub(truncateDate(latest)).Hours()/24) <= 1 {
			advice = HealthAdvice{Level: RiskMedium, Title: "记录有点密，别把身体当 KPI", Body: "频率没有统一标准，但疼痛、疲劳、焦虑或影响生活时，就是身体在敲桌子。", Action: "今天可以选择拥抱、聊天、自慰知识卡或早点睡。"}
		}
	}
	return CyclePrediction{
		NextPeriodStart: formatDate(nextStart),
		NextPeriodEnd:   formatDate(nextEnd),
		FertileStart:    formatDate(fertileStart),
		FertileEnd:      formatDate(fertileEnd),
		TodayAdvice:     advice,
	}
}

func calculateRecordRisk(record IntimacyRecord) RiskLevel {
	if record.Type == IntimacySolo || record.Type == IntimacyCuddle || record.Type == IntimacyKiss {
		return RiskLow
	}
	if record.Protection == ProtectionNone {
		return RiskHigh
	}
	if record.Protection == ProtectionNotSure || !record.ConsentChecked {
		return RiskMedium
	}
	return RiskLow
}

func buildRecordTags(record IntimacyRecord) []string {
	tags := []string{string(record.Type), string(record.Protection)}
	if record.ConsentChecked {
		tags = append(tags, "consent_checked")
	} else {
		tags = append(tags, "consent_unclear")
	}
	tags = append(tags, string(record.RiskLevel))
	return tags
}

func formatDate(t time.Time) string {
	return t.Format("2006-01-02")
}

func truncateDate(t time.Time) time.Time {
	y, m, d := t.Date()
	return time.Date(y, m, d, 0, 0, 0, 0, t.Location())
}

func between(value, start, end time.Time) bool {
	return (value.Equal(start) || value.After(start)) && (value.Equal(end) || value.Before(end))
}
