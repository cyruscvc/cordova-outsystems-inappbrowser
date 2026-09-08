# Bundled iOS library

Source: https://github.com/OutSystems/OSInAppBrowserLib-iOS
Version: 2.3.1
Commit: 02077543fe499b68dd2e636bb1c2a40521e67d6a
License: MIT (see LICENSE).

Compiled as source in the Cordova application target. Replaces the prebuilt
OSInAppBrowserLib CocoaPod; do not install both copies.

Local change: WebView/OSIABWebViewModel.swift intercepts msteams navigation
from the main page, delegates the original URL, and cancels WebView loading.
All other upstream source files are unchanged.
