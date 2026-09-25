# 2.1.1-mapp.2 — initial Teams destinations

This follow-up to 2.1.1-mapp.1 fixes Teams URLs passed directly to
OpenInWebView, OpenInSystemBrowser or OpenInExternalBrowser. Previously the
WebView/SystemBrowser routes constructed a browser for the app URL before
navigation interception. That could leave an empty browser behind.

iOS msteams URLs are now handed to UIApplication before creating a browser.
Android Teams intent URLs are parsed with Intent.parseUri and launched with
ACTION_VIEW, restricted to com.microsoft.teams and teams.microsoft.com. The
embedded HTTPS URL, including its encoded query, is preserved; untrusted intent
components, flags, selectors and extras are not forwarded. Android msteams URLs
are also handled directly. Other URLs keep their previous routing behavior.

Direct Teams calls produce exactly one success/error callback. Success means the
OS accepted the handoff, not that the call connected or chat opened successfully.
No artificial PageLoaded/PageClosed events are emitted because no browser is
created. Existing browser instances and their callbacks remain open.

Links clicked inside a WebView retain the existing 2.1.1-mapp.1 handlers. This
release does not rewrite ordinary HTTPS Teams links. Do not double-encode %40
as %2540. The provided call and chat URL formats are passed unchanged on iOS.

## Installation

Replace the wrapper's plugin URL with:

`https://github.com/cyruscvc/cordova-outsystems-inappbrowser#2.1.1-mapp.2`

Keep the current Forge 4.0.3 wrapper actions and other metadata. Publish,
refresh dependencies, regenerate Android/iOS native packages and install them.
Old tags are unchanged.

## Scope and validation

The official upload implementation and existing download code/AAR are unchanged.
The reported iOS preview-only download issue remains under investigation; this
release must not be described as a verified correction for that issue.

CI validates package paths/metadata, tests preservation of the four supplied URLs
through the JavaScript bridge and its success/error callback contract, and builds
clean Android and iOS Cordova apps. Teams itself is not installed in CI. On real
devices, test call/chat, Teams missing, return to an existing WebView, and the direct
OpenInWebView action. If a link clicked inside an existing page still fails, capture
the action/URL, frame context and installed native version; the initial-URL fix
does not prove the cause of a separate in-page failure.
