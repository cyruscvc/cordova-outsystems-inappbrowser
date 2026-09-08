# Teams links inside OpenInWebView (iOS)

Version: `1.6.3-mixedmime.2-teams.1`.

This build retains the Android mixedmime.2 library and bundles the iOS
OSInAppBrowserLib 2.3.1 source with a Teams navigation patch. The source is
compiled in the Cordova application target; the old prebuilt CocoaPod is removed.
The upstream iOS minimum is 13.0. See the bundled UPSTREAM.md and MIT license.

## Install in OutSystems 11

1. In the existing InAppBrowser plugin module, replace the Git URL in its
   Extensibility Configurations with this repository and the supplied new commit
   SHA. Keep the other configuration entries.
2. Publish the plugin, refresh the consuming application's dependencies, and
   publish the application.
3. Generate a new iOS package with MABS and install it on an iPhone. An ordinary
   application update cannot replace installed native plugin code.

Use the Git distribution; this repository retains the existing dotted plugin
identity. It is not a renamed local Resource ZIP.

## Trigger from the external page

Use a main-page link or a button that navigates the main page:

```html
<a href="msteams://teams.microsoft.com/l/chat/0/0?users=employee%40company.com">
  Open Teams chat
</a>
```

```javascript
// Run in the page inside OpenInWebView, on a user button click.
const upn = "employee@company.com";
window.location.href =
  "msteams://teams.microsoft.com/l/chat/0/0?users=" + encodeURIComponent(upn);
```

For a meeting, use the actual Teams deep link, preserving its entire path and
query and replacing only its leading `https://` with `msteams://` when generating
the iOS app link. Do not fabricate meeting IDs or strip the tenant/context query.

The plugin cancels the WebView navigation and passes the original URL to iOS.
The WebView is not closed and its event callback is retained. If Teams cannot
open the link, a native alert appears. This does not guarantee that Teams will
accept the destination or that enterprise policies will permit the handoff.

The patch does not rewrite HTTPS links, handle iframe-originated app launches,
or provide an Android `msteams://` handler. Android retains its existing
`intent://` route. Main-page `target="_blank"` links are also accepted by the
iOS navigation delegate when WebKit delivers them without a target frame.

## Validation and device acceptance

The `Validate iOS Teams plugin` workflow installs into a clean Cordova iOS 7.1.1
app and compiles for the simulator without signing. This is an upstream Cordova
compatibility check, not a MABS build or proof that Teams launched on a device.

On a physical iPhone, verify:

- A chat link launches installed Teams and reaches the intended chat.
- A real meeting link retains its query and reaches the intended meeting.
- Returning to the application keeps the external page and signed-in session.
- When Teams is unavailable, dismissing the alert leaves navigation and Close working.
- Main-page button navigation and a normal anchor both work.
- Existing web navigation, mailto/tel links, uploads and Close still work.

The plugin declares `msteams` in `LSApplicationQueriesSchemes`. Do not register
it under `CFBundleURLTypes`: this app launches Teams; it does not own its scheme.
