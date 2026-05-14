import Foundation

struct APIService {
    var baseURL = URL(string: "http://localhost:8083")!
    var deviceID = DeviceIdentity.current

    func me() async throws -> UserProfile {
        try await request("/api/v1/me")
    }

    func updateMe(
        nickname: String? = nil,
        squareAlias: String? = nil,
        role: UserRole? = nil,
        privacyLock: Bool? = nil,
        relationshipMode: String? = nil,
        polyOath: String? = nil
    ) async throws -> UserProfile {
        try await request(
            "/api/v1/me",
            method: "PUT",
            body: UpdateProfilePayload(
                nickname: nickname,
                squareAlias: squareAlias,
                role: role,
                privacyLock: privacyLock,
                relationshipMode: relationshipMode,
                polyOath: polyOath
            )
        )
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

    func partner() async throws -> PartnerHub {
        try await request("/api/v1/partners")
    }

    func createPartnerInvite() async throws -> PartnerWire {
        try await request("/api/v1/partners/invite", method: "POST", body: [String: String]())
    }

    func acceptPartnerInvite(inviteCode: String) async throws -> PartnerWire {
        try await request("/api/v1/partners/accept", method: "POST", body: ["inviteCode": inviteCode])
    }

    func unlinkPartner(peerId: String? = nil) async throws -> PartnerHub {
        var comp = URLComponents(url: baseURL.appending(path: "/api/v1/partners"), resolvingAgainstBaseURL: false)!
        if let peerId, !peerId.isEmpty {
            comp.queryItems = [URLQueryItem(name: "peerId", value: peerId)]
        }
        guard let url = comp.url else {
            throw URLError(.badURL)
        }
        var req = URLRequest(url: url)
        req.httpMethod = "DELETE"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        applyCommonHeaders(to: &req)
        let (data, response) = try await URLSession.shared.data(for: req)
        guard let http = response as? HTTPURLResponse, (200 ..< 300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return try JSONDecoder().decode(PartnerHub.self, from: data)
    }

    func createPartnerMessage(phrase: String, targetPartnerId: String? = nil) async throws -> PartnerMessage {
        try await request("/api/v1/partners/messages", method: "POST", body: PartnerMessagePayload(phrase: phrase, scene: "partner", targetPartnerId: targetPartnerId))
    }

    func partnerShareRequests() async throws -> PartnerShareWire {
        try await request("/api/v1/partners/share-requests")
    }

    func createPartnerShareRequest(_ body: CreatePartnerShareBody) async throws -> PartnerShareRequest {
        try await request("/api/v1/partners/share-requests", method: "POST", body: body)
    }

    func acceptPartnerShareRequest(id: String, receiverRating: Int) async throws -> AcceptPartnerShareResponse {
        try await request("/api/v1/partners/share-requests/\(id)/accept", method: "POST", body: AcceptPartnerSharePayload(receiverRating: receiverRating))
    }

    func rejectPartnerShareRequest(id: String, phrase: String) async throws -> PartnerShareRequest {
        try await request("/api/v1/partners/share-requests/\(id)/reject", method: "POST", body: RejectPartnerSharePayload(phrase: phrase))
    }

    func partnerShareRejectPhrases() async throws -> [ShareRejectPhrase] {
        let payload: PartnerSharePhrasesPayload = try await request("/api/v1/partners/share-reject-phrases")
        return payload.phrases
    }

    func resonatePost(id: String, chip: String? = nil) async throws -> SocialPost {
        let trimmed = chip?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if trimmed.isEmpty {
            return try await request("/api/v1/social/posts/\(id)/resonate", method: "POST", body: [String: String]())
        }
        return try await request("/api/v1/social/posts/\(id)/resonate", method: "POST", body: ["chip": trimmed])
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
        applyCommonHeaders(to: &request)
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
        applyCommonHeaders(to: &request)
        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse, (200..<300).contains(http.statusCode) else {
            throw URLError(.badServerResponse)
        }
        return data
    }

    private func applyCommonHeaders(to request: inout URLRequest) {
        request.setValue(deviceID, forHTTPHeaderField: "X-Faleme-Device-ID")
        request.setValue(FalemeAPIHeaders.requestID(), forHTTPHeaderField: "X-Request-ID")
        if let token = UserDefaults.standard.string(forKey: FalemeAPIHeaders.authTokenKey), !token.isEmpty {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
    }
}

private struct EmptyBody: Encodable {}
private struct EmptyResponse: Decodable {}

private struct UpdateProfilePayload: Encodable {
    var nickname: String?
    var squareAlias: String?
    var role: UserRole?
    var privacyLock: Bool?
    var relationshipMode: String?
    var polyOath: String?

    enum CodingKeys: String, CodingKey {
        case nickname, squareAlias, role, privacyLock, relationshipMode, polyOath
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encodeIfPresent(nickname, forKey: .nickname)
        try c.encodeIfPresent(squareAlias, forKey: .squareAlias)
        try c.encodeIfPresent(role, forKey: .role)
        try c.encodeIfPresent(privacyLock, forKey: .privacyLock)
        try c.encodeIfPresent(relationshipMode, forKey: .relationshipMode)
        try c.encodeIfPresent(polyOath, forKey: .polyOath)
    }
}

private struct PartnerMessagePayload: Encodable {
    var phrase: String
    var scene: String
    var targetPartnerId: String?

    enum CodingKeys: String, CodingKey {
        case phrase, scene, targetPartnerId
    }

    func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(phrase, forKey: .phrase)
        try c.encode(scene, forKey: .scene)
        if let targetPartnerId, !targetPartnerId.isEmpty {
            try c.encode(targetPartnerId, forKey: .targetPartnerId)
        }
    }
}
