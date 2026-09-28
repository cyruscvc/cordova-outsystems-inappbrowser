# M-Travel Teams chat messages — 2.1.1-mapp.3

Based on the official Cordova 2.1.1 baseline, including its upload fix and the existing M App fork changes. This addition handles Teams chat messages on iOS and Android. It does not add a download event handler or claim to fix the reported download issues.

## M-Travel sender

```javascript
window.parent.postMessage({
  type: "cbt:open-teams",
  email: "employee@company.com"
}, "*");
```

The email is unencoded. Additional fields are ignored. The payload must be an object, not a JSON string. Disable the existing Teams URL navigation for the same click.

M-Travel must be the top-level document opened by `OpenInWebView`; in that context `parent` equals `window`. Messages from iframes are deliberately rejected. If an iframe deployment is needed, agree its parent/source origins before extending the bridge.

## OutSystems wiring

Add a synchronous JavaScript node immediately before the existing `OpenInWebView` action. Add a Text input named `MTravelUrl`, containing the same URL passed to that action:

```javascript
var plugin = cordova.plugins.OSInAppBrowser;
if (typeof plugin.setTeamsMessageOrigins !== "function") {
  throw new Error("Install the M App native build containing 2.1.1-mapp.3.");
}
plugin.setTeamsMessageOrigins([new URL($parameters.MTravelUrl).origin]);
```

Staging URL: `https://cbt-stg.ctx.ae/?mobile=1`

Allowed staging origin: `https://cbt-stg.ctx.ae`

Use an environment-specific Site Property / configuration value for `MTravelUrl`. The production hostname is not guessed or hardcoded; supplying the production URL sets its exact origin. Read this value from trusted M App configuration, not a message from the embedded page. If a login flow redirects to a different application origin, explicitly configure the final trusted origin as well; do not add wildcard or login-provider origins.

`setTeamsMessageOrigins` affects subsequent `OpenInWebView` calls, not a browser already open. The default list is empty (disabled). To disable for subsequent opens, call `setTeamsMessageOrigins([])`. A direct JavaScript caller may instead pass `options.teamsMessageOrigins` to one `openInWebView` call. Existing options, user agent and lifecycle callbacks remain intact.

No separate OutSystems Teams event handler is needed for this scoped version: the native plugin validates the message and opens Teams chat itself. It preserves the M-Travel WebView and uses the existing iOS Teams launcher or an explicit Android Teams Intent. Teams launch failure shows an alert/toast; `postMessage` is fire-and-forget and has no completion reply in this version. Normal lifecycle events do not claim that a Teams conversation was created.

## Extensibility

Use this only after the tag exists and native validation passes:

```json
{
  "plugin": {
    "url": "https://github.com/cyruscvc/cordova-outsystems-inappbrowser#2.1.1-mapp.3"
  },
  "metadata": {
    "mabs-min": "10.0.0",
    "name": "InAppBrowser Plugin (M App fork)",
    "version": "4.0.3"
  }
}
```

Refresh dependencies and generate/install new native Android and iOS binaries. Publishing the OutSystems module alone cannot add the native listener. Do not install the official and forked plugin together: they intentionally retain the same Cordova identity. This remains a custom fork.

## Scope and validation

### Screenshot-blocker compatibility

The custom `cyruscvc/outsystem-prevent-screenshot` plugin registers Android activity lifecycle callbacks in the main app process. The current InAppBrowser uses a separate process by default, so those callbacks cannot protect its window. This release carries the launching Activity's current `FLAG_SECURE` state to the new WebView Activity and applies it before content is created, preserving isolation.

Await the screenshot blocker's `disable` success before `OpenInWebView`; keep protection active until the browser closes, then call `enable` only if screenshots should be allowed again. In this plugin's naming, `disable` means disable screenshots. The protection value is captured at open time, not continuously synchronized while the isolated browser is open. Teams and external save/viewer apps remain outside M App's protection.

This corrects the identified Android process-boundary gap. No iOS screenshot fix is claimed: the existing blocker already targets the application window using a secure-text-entry workaround, and any iOS regression needs device/version and blocker-build verification. Test screenshots and recording on physical devices.

### Teams receiver

- Exact HTTPS origin allowlist; native source-origin, current-page and main-frame checks.
- Page receiver checks source window, origin, event type and email. No wildcard native bridge or arbitrary URL/action execution.
- 4 KiB native message limit and a 1.5-second launch throttle to suppress duplicate taps/events.
- iOS script injected at document start; Android document-start injection when supported, with a page-finished fallback. Android requires WebView `WEB_MESSAGE_LISTENER` support; without it, no Teams event bridge is installed.
- Receiver installed once per document; native handler removed on teardown. Opening Teams does not close or replace M-Travel.
- `download` events and other message types are ignored. Existing download behavior is inherited unchanged.

CI builds the pinned Android library and bundles the AAR, checks the JS receiver/host configuration and existing Teams callback tests, and compiles clean Cordova Android and iOS simulator apps. This does not establish real-device Teams availability or navigation behavior.

Device acceptance: open staging using `?mobile=1`, trigger the real M-Travel chat button, verify the recipient in Teams, return to the same page, repeat once, and test Teams unavailable. Verify events from another origin/frame and malformed payloads do not launch anything. Confirm ordinary uploads still work. Repeat with the approved production origin before rollout.
