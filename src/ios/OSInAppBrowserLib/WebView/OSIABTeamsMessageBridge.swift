import Foundation
import WebKit

/// Scoped receiver for M-Travel's window.parent.postMessage event.
final class OSIABTeamsMessageBridge: NSObject, WKScriptMessageHandler {
    private weak var webView: WKWebView?
    private let allowed: Set<String>
    private let openChat: (URL) -> Void
    private var lastLaunch: TimeInterval = -1.5

    private static func origin(_ url: URL?) -> String? {
        guard let url, url.scheme?.lowercased() == "https", let host = url.host?.lowercased(),
              url.user == nil, url.password == nil else { return nil }
        let port = url.port ?? 443
        guard port > 0 && port <= 65535 else { return nil }
        return "https://\(host)" + (port == 443 ? "" : ":\(port)")
    }

    init(webView: WKWebView, origins: [String], openChat: @escaping (URL) -> Void) {
        self.webView = webView
        self.openChat = openChat
        self.allowed = Set(origins.prefix(10).compactMap { raw in
            guard let normalized = Self.origin(URL(string: raw)), raw == normalized || raw == normalized + "/" else { return nil }
            return normalized
        })
        super.init()
        guard !allowed.isEmpty,
              let resource = Bundle.main.url(forResource: "osiab-teams", withExtension: "js"),
              let template = try? String(contentsOf: resource, encoding: .utf8),
              let data = try? JSONSerialization.data(withJSONObject: Array(allowed)),
              let json = String(data: data, encoding: .utf8) else { return }
        let controller = webView.configuration.userContentController
        controller.add(self, name: "mappTeamsNative")
        controller.addUserScript(WKUserScript(source: template.replacingOccurrences(of: "__MAPP_TEAMS_ORIGINS__", with: json),
                                               injectionTime: .atDocumentStart, forMainFrameOnly: true))
    }

    func invalidate() {
        webView?.configuration.userContentController.removeScriptMessageHandler(forName: "mappTeamsNative")
        webView = nil
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard let view = webView, message.webView === view, view.window != nil,
              message.name == "mappTeamsNative", message.frameInfo.isMainFrame,
              let currentOrigin = Self.origin(view.url), allowed.contains(currentOrigin),
              let frameOrigin = Self.origin(message.frameInfo.request.url), frameOrigin == currentOrigin else { return }
        let security = message.frameInfo.securityOrigin
        let port = security.port == 0 ? 443 : security.port
        let securityOrigin = "https://" + security.host.lowercased() + (port == 443 ? "" : ":\(port)")
        guard security.protocol.lowercased() == "https", securityOrigin == currentOrigin,
              let text = message.body as? String, text.utf8.count <= 4096,
              let data = text.data(using: .utf8),
              let payload = (try? JSONSerialization.jsonObject(with: data)) as? [String: Any],
              payload["type"] as? String == "cbt:open-teams",
              let raw = payload["email"] as? String else { return }
        let email = raw.trimmingCharacters(in: .whitespacesAndNewlines)
        guard email.count <= 254, email.range(of: #"^[^\s@,;]+@[^\s@,;]+\.[^\s@,;]+$"#, options: .regularExpression) != nil else { return }
        let now = ProcessInfo.processInfo.systemUptime
        guard now - lastLaunch >= 1.5 else { return }
        let unreserved = CharacterSet(charactersIn: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~")
        guard let encoded = email.addingPercentEncoding(withAllowedCharacters: unreserved),
              let url = URL(string: "msteams://teams.microsoft.com/l/chat/0/0?users=" + encoded) else { return }
        lastLaunch = now
        openChat(url)
    }
}
