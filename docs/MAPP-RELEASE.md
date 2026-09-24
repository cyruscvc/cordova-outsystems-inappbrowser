# M App InAppBrowser 2.1.1-mapp.1

Custom fork, based on official Cordova InAppBrowser 2.1.1 (Forge 4.0.3),
Android library 2.0.3 and iOS library 2.3.2. The official mixed-upload
implementation is unchanged. This is not an OutSystems-supported release.

## Included

- iOS Teams fix ported from PR #1: main-frame msteams links launch Teams;
  WebView/session/event callback remain alive, including launch failure.
- Android msteams links explicitly launch Microsoft Teams, with a visible
  unavailable-app message; existing intent links are retained. HTTPS links
  are not rewritten. Use actual Teams URLs with their full encoded payload.
- Android HTTP(S) downloads use DownloadManager with URL-scoped cookies and
  user agent, including PDFs. A completion/failure toast is shown while the
  WebView remains open. OS notifications persist after it is closed.
- Android blob/data downloads: bounded, acknowledged 48 KiB chunks, maximum
  50 MiB, one transfer at a time. Handles detached anchors, normal anchors,
  window.open and main-frame navigation. Android Save dialog precedes writes.
- iOS WebKit downloads preserve the original authenticated request and show
  a share sheet, including Save to Files. Document MIME detection applies to
  non-HTTP responses too. PDF responses now offer saving rather than only preview.
- iOS download errors are visible; no insecure cookie-copy/replayed-GET fallback.
- Vendored iOS library used by both legacy Cordova source packaging and SPM.

## Boundaries

The Android blob bridge is write-only, main-frame-only, restricted to the exact
HTTP(S) origin of the URL supplied to OpenInWebView. Cross-origin iframe exports
and redirects ending on a different site are not supported by that bridge. It
does not expose cookies, arbitrary file paths, device files or network APIs.
Cancellation/navigation closes the transfer. A partial or empty destination can
remain after interruption; remove it manually if needed. Large blobs over 50 MiB
require a real HTTP(S) download endpoint. No broad storage permission is added.

Android DownloadManager cannot replay a POST body or JavaScript-only Authorization
header. Zscaler, client-certificate/device authentication, or a redirect to a login
page can still prevent a valid download. Such cases require endpoint-specific
diagnosis; the previously reported external application failure is not proven
resolved until device testing. Error-code logs omit URLs and tokens.

iOS saving requires iOS 14.5+; earlier versions show an explicit message while
normal browsing remains available. WKDownload blob behavior still depends on the
installed iOS/WebKit version and needs physical-device tests. No private JS bridge
is installed on iOS. SPM metadata is corrected, but the CI build validates the
Cordova iOS 7.1.1 source-install route, not future MABS SPM builds.

## OutSystems 11 installation

Use a clone of the current 4.0.3 OutSystems wrapper and its public actions,
structures and events. This repository replaces its native implementation; it
does not replace those Service Studio definitions. Keep only one wrapper dependency
providing com.outsystems.plugins.inappbrowser in each generated mobile app.
Do not delete the official component from the environment until other consumers
have been checked. The separate MIRA handoff plugin is not merged here.

```json
{
  "plugin": {
    "url": "https://github.com/cyruscvc/cordova-outsystems-inappbrowser#2.1.1-mapp.1"
  },
  "metadata": {
    "mabs-min": "10.0.0",
    "name": "InAppBrowser Plugin (M App fork)",
    "version": "4.0.3"
  }
}
```

Publish wrapper, replace/refresh consumer dependencies, publish app, regenerate
Android and iOS binaries through MABS and install them. An OTA update cannot
replace native code. Retain the previous binary/configuration for rollback.

## Acceptance tests

- Official U1 mixed, U2 documents-only and U3 unrestricted upload.
- E1 blob XLSX, E2 data XLS, E3 blob navigation, E4 authenticated HTTPS export.
- Compare saved file bytes and open the actual Excel/PDF file, not just a toast.
- Cancel Save; repeat download; navigate during transfer; close/reopen browser.
- Test over Zscaler and with expired authentication. Check visible errors.
- Teams chat, meeting, target=_blank, app missing, return to existing web session.
- Confirm normal HTTPS/mailto/tel, navigation, close and browser events still work.

CI compiles a clean Cordova Android 14.0.1 debug app and an unsigned iOS 7.1.1
simulator app, builds/tests the native Android library and validates the packaged
AAR/Swift paths. MABS signing and real-device acceptance are separate requirements.
