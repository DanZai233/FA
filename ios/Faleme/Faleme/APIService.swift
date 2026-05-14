import Foundation

struct APIService {
    var baseURL = URL(string: "http://localhost:8083")!
    var deviceID = DeviceIdentity.current

    func me() async throws -> UserProfile {
        try await request("/api/v1/me")
    }

    func updateMe(nickname: String? = nil, squareAlias: String? = nil, role: UserRole? = nil, privacyLock: Bool? = nil) async throws -> UserProfile {
        try await request("/api/v1/me", method: "PUT", body: UpdateProfilePayload(nickname: nickname, squareAlias: squareAlias, role: role, privacyLock: privacyLock))
    }

    func records() async throws -> [IntimacyRecord] {
        try await request("/api/v1/records")
    }

    func createRecord(_ record: IntimacyRecord) async throws -> IntimacyRecord {
        try await request("/api/v1/records", method: "POST", body: record)
    }

    func deleteRecord(id: String) async throws {
        let _: EmptyResponse = try await request("/api/v1/records/\(id)", method: "DELETE", body: [String: String]())
    }

    func cycles() async throws -> [CycleRecord] {
        try await request("/api/v1/cycles")
    }

    func prediction() async throws -> CyclePrediction {
        try await request("/api/v1/cycles/prediction")
    }

    func createCycle(_ cycle: CycleRecord) async throws -> CycleRecord {
        try await request("/api/v1/cycles", method: "POST", body: cycle)
    }

    func reminderSummary() async throws -> ReminderSummary {
        try await request("/api/v1/reminders/summary")
    }

    func knowledgeCards() async throws -> [KnowledgeCard] {
        try await request("/api/v1/knowledge/cards")
    }

    func posts() async throws -> [SocialPost] {
        try await request("/api/v1/social/posts")
    }

    func createPost(phrase: String) async throws -> SocialPost {
        try await request("/api/v1/social/posts", method: "POST", body: ["phrase": phrase])
    }

    func partnerMessages() async throws -> [PartnerMessage] {
        try await request("/api/v1/partners/messages")
    }

    func partner() async throws -> PartnerLink {
        try await request("/api/v1/partners")
    }

    func createPartnerInvite() async throws -> PartnerLink {
        try await request("/api/v1/partners/invite", method: "POST", body: [String: String]())
    }

    func acceptPartnerInvite(inviteCode: String) async throws -> PartnerLink {
        try await request("/api/v1/partners/accept", method: "POST", body: ["inviteCode": inviteCode])
    }

    func unlinkPartner() async throws -> PartnerLink {
        try await request("/api/v1/partners", method: "DELETE", body: [String: String]())
    }

    func createPartnerMessage(phrase: String) async throws -> PartnerMessage {
        try await request("/api/v1/partners/messages", method: "POST", body: ["phrase": phrase, "scene": "partner"])
    }

    func resonatePost(id: String) async throws -> SocialPost {
        try await request("/api/v1/social/posts/\(id)/resonate", method: "POST", body: [String: String]())
    }

    func blockPost(id: String) async throws -> SocialPost {
        try await request("/api/v1/social/posts/\(id)/block", method: "POST", body: [String: String]())
    }

    func reportPost(id: String, reason: String) async throws {
        let _: EmptyResponse = try await request("/api/v1/reports", method: "POST", body: ["targetId": id, "reason": reason])
    }

    func shake() async throws -> MatchCard {
        try await request("/api/v1/matches/shake", method: "POST", body: [String: String]())
    }

    func exportData() async throws -> Data {
        try await rawRequest("/api/v1/me/export")
    }

    func deleteAccount() async throws {
        let _: EmptyResponse = try await request("/api/v1/me", method: "DELETE", body: [String: String]())
    }

    private func request<T: Decodable>(_ path: String, method: String = "GET") async throws -> T {
        let empty: EmptyBody? = nil
        return try await request(path, method: method, body: empty)
    }

    private func request<T: Decodable, Body: Encodable>(_ path: String, method: String = "GET", body: Body?) async throws -> T {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(deviceID, forHTTPHeaderField: "X-Faleme-Device-ID")
        if let body {
            request.httpBody = try JSONEncoder().encode(body)
        }
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(T.self, from: data)
    }

    private func rawRequest(_ path: String) async throws -> Data {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = "GET"
        request.setValue(deviceID, forHTTPHeaderField: "X-Faleme-Device-ID")
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return data
    }
}

private struct EmptyBody: Encodable {}
private struct EmptyResponse: Decodable {}

private struct UpdateProfilePayload: Encodable {
    var nickname: String?
    var squareAlias: String?
    var role: UserRole?
    var privacyLock: Bool?
}
