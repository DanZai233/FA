import Foundation

/// 与 Web 端 `faleQuips.ts` 对齐的幽默安全员文案（iOS）。
enum FalemeQuips {
    private static let fabKeyPrefix = "faleme.fabClicks.v1:"

    private static func todayISO() -> String {
        FalemeDateFormatting.shanghaiCalendarToday()
    }

    static func bumpTodayFabClick(deviceKey: String) -> Int {
        let key = "\(fabKeyPrefix)\(deviceKey):\(todayISO())"
        let prev = UserDefaults.standard.integer(forKey: key)
        let next = prev + 1
        UserDefaults.standard.set(next, forKey: key)
        return next
    }

    static func heroFabBanter(role: UserRole, clickCountToday: Int, latestRating: Int?) -> String {
        let c = clickCountToday
        let isR = role == .receiver
        let isS = role == .switch

        if c >= 18 {
            return isR
                ? "十八次？你这「被法」考勤表是国际邀请赛吗——别装了，我害怕，咱诚实点。"
                : "十八次打卡？兄弟你这根手指是电动圆珠笔吗——你赢了，别法了，我害怕。"
        }
        if c >= 10 {
            return isR
                ? "十次？「被法全勤奖」颁给你——奖杯没有，只有一句：这频率地球物理学不支持，但我敬你是条汉子（夸张版）。"
                : "十次？今日法了么 MVP 非你莫属——再点下去系统要怀疑你在刷成就：别装了，根本没可能那么多。"
        }
        if c >= 7 {
            return isR
                ? "第七次了…被温柔照顾也要睡觉的，注意恢复；对方也要喘口气，爱是互相充电不是互相放电。"
                : "第七次点开？再爱也要讲基本法：脱水、睡眠、情绪过载都是真风险，对伴侣多点呵护，别当永动机。"
        }
        if c >= 4 {
            return isR
                ? "第四次了——记录很勤快，但身体不是无限流量包：记得补水、休息，也和对方确认彼此状态，别硬卷。"
                : "第四次了——热情我懂，频繁亲密会增加摩擦与疲劳风险，温柔点、慢点，记得事后拥抱说人话。"
        }
        if c == 3 {
            return isR
                ? "今天第三回点「被法了」——被照顾很爽，也要睡觉喝水；记得呵护对方，爱是双向续航。"
                : "今天第三回点「法了」——身体不是打卡机，注意节奏；对伴侣多点体贴，别只顾自己上头。"
        }
        if c == 2 {
            let base = isR ? "又来？被法记录员今天很勤奋。" : "又来？法了么驻场代表今天很敬业。"
            let tail = ratingTail(role: role, rating: latestRating)
            return base + tail
        }

        if isR {
            return "好被姐妹/兄弟，敢点「被法了」就很勇——享受被爱也值得被记录。" + ratingTail(role: .receiver, rating: latestRating)
        }
        if isS {
            return "好法…也可能是好被，反正先记账——今日剧本自选，但安全与同意不外包。" + ratingTail(role: .switch, rating: latestRating)
        }
        return "好法兄弟，成年人敢记敢当。" + ratingTail(role: .initiator, rating: latestRating)
    }

    static func afterSaveBanter(role: UserRole, rating: Int) -> String {
        switch role {
        case .receiver:
            if rating <= 2 { return "分不高也没事：被法也可以喊停，你的感受一样珍贵。" }
            if rating == 3 { return "三分平淡局——下次想要多一点温柔，就写进记录里，别全靠对方猜。" }
            return "高分！被照顾得很开心就大声…写在评分里，这也是一种双向夸奖。"
        case .switch:
            if rating <= 2 { return "这次一般般？没关系，身体会诚实，下次把节奏和保护再调一调。" }
            if rating == 3 { return "三分像温吞泡面：能饱但不香，下次试试把「想要」说清楚。" }
            return "体验拉满！记得把温柔也留给对方——法了么鼓励会夸人的成年人。"
        case .initiator:
            if rating <= 2 { return "这次不太爽？先抱抱你。下次慢一点、多问一句，别把面子看得比舒服重。" }
            if rating == 3 { return "三分说明还有上升空间：沟通、保护、节奏，随便升级一样都能涨分。" }
            return "高分现场！记得事后抱抱、说人话——别拔枪无情，拥抱彼此才是完整剧情。"
        }
    }

    static func partnerShareAfterSend(senderRole: UserRole) -> String {
        switch senderRole {
        case .receiver:
            return "申请已发出：大胆记录「被法」超酷，对方确认后你们就各有一条同步分——继续享受被爱的底气。"
        case .initiator:
            return "申请已发出：记得对 Ta 多点呵护与善后，别拔枪无情——确认后各记一条，拥抱比战绩重要。"
        case .switch:
            return "申请已发出：不管是法还是被法，记得把「同意」和「体贴」一起打包发给对方。"
        }
    }

    static func partnerSharePipelineNote() -> String {
        "已排队法法同步：对方在收件箱确认后，双方各生成一条带评分的记录。"
    }

    static func isInFertileWindow(cycle: CyclePrediction?, today: String) -> Bool {
        guard let cycle else { return false }
        return today >= cycle.fertileStart && today <= cycle.fertileEnd
    }

    static func postRecordEcho(role: UserRole, rating: Int, type: IntimacyType, protection: ProtectionMethod, cycle: CyclePrediction?) -> String {
        let today = FalemeDateFormatting.shanghaiCalendarToday()
        var chunks: [String] = [afterSaveBanter(role: role, rating: rating)]
        if isInFertileWindow(cycle: cycle, today: today) {
            chunks.append("处在易孕窗口附近：日历已按高风险提醒标亮，这条也会一起算进「身体天气预报」。")
        }
        let risky = (type == .penetrative || type == .oral || type == .manual) && protection == .none
        if risky {
            chunks.append("无可靠保护时，这类记录会拉高整体风险观感，也可能拉低这段周期的「安全员评分」趋势。")
        } else if protection == .condom || protection == .oralContraceptive || protection == .iud {
            chunks.append("有保护记录会给本周安全趋势加分。")
        }
        return chunks.joined(separator: " ")
    }

    static func partnerInboxHint(senderRole: UserRole) -> String {
        switch senderRole {
        case .receiver:
            return "对方以「被法」视角发起——夸夸 Ta 敢记录、敢享受亲密，接受前再对齐感受。"
        case .initiator:
            return "对方以「法」视角发起——提醒 Ta 多照顾你的节奏与情绪，别赢了场面输了体贴。"
        case .switch:
            return "对方是「看气氛发挥」型——读申请时多一句温柔，少一句审判。"
        }
    }

    static func partnerOutboxHint(mySenderRole: UserRole) -> String {
        switch mySenderRole {
        case .receiver:
            return "你以「被法」身份发起：记录被照顾不是示弱，是爱自己。"
        case .initiator:
            return "你以「法」身份发起：记得事后多哄多抱，别让亲密只剩过程没有善后。"
        case .switch:
            return "你以「切换」身份发起：同步是两个人的合写，不是独角戏。"
        }
    }

    private static func ratingTail(role: UserRole, rating: Int?) -> String {
        guard let rating else { return "" }
        switch role {
        case .initiator:
            if rating <= 2 { return " 看你上次打分有点委屈，这次记得：舒服最重要，不行就停。" }
            if rating == 3 { return " 上次三分平淡局——今天开心就往上冲，不开心就诚实写低分。" }
            return " 上次体验不错，继续保持清醒又温柔的成年人打法。"
        case .receiver:
            if rating <= 2 { return " 上次分不高，抱抱你：被照顾也可以喊停，你的感受一样算数。" }
            if rating == 3 { return " 上次三分像温吞水——今天想被多宠一点就大胆记。" }
            return " 上次分挺高，你会享受也会表达，继续。"
        case .switch:
            if rating <= 2 { return " 上次打分有点闷：今天优先问「我舒服吗」。" }
            if rating == 3 { return " 上次三分平平——今天看气氛，同意比演技重要。" }
            return " 上次挺满意？今天继续当会刹车也会加油的成年人。"
        }
    }
}
