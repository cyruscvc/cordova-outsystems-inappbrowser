import { require } from "cordova";
import { BrowserCallbacks, PluginError, SystemBrowserOptions, WebViewOptions, CallbackEvent, CallbackEventType } from "./definitions";
import { DefaultSystemBrowserOptions, DefaultWebViewOptions } from "./defaults";
var exec = require('cordova/exec')

function trigger(type: CallbackEventType, success: () => void, data?: any, onbrowserClosed: (() => void) | undefined = undefined, onbrowserPageLoaded: (() => void) | undefined = undefined, onbrowserPageNavigationCompleted: ((data?: string) => void) | undefined = undefined) {
  switch (type) {
  case CallbackEventType.SUCCESS: 
    success();
    break
  case CallbackEventType.PAGE_CLOSED:
    if (onbrowserClosed) {
      onbrowserClosed();
    }
    break;
  case CallbackEventType.PAGE_LOAD_COMPLETED:
    if (onbrowserPageLoaded) {
      onbrowserPageLoaded();
    }
    break;
  case CallbackEventType.PAGE_NAVIGATION_COMPLETED:
    if (onbrowserPageNavigationCompleted) {
      onbrowserPageNavigationCompleted(data);
    }
    break;
  default: break;
  }
}

var teamsMessageOrigins: string[] = [];
  function setTeamsMessageOrigins(origins: string[]) {
    if (!Array.isArray(origins) || origins.length > 10) throw new Error("Supply at most 10 exact HTTPS origins.");
    teamsMessageOrigins = origins.map(function (value) {
      if (typeof value !== "string") throw new Error("Invalid Teams message origin.");
      var url = new URL(value);
      if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash ||
          url.pathname !== "/" || url.hostname.indexOf("*") >= 0) throw new Error("Use exact HTTPS origins, without paths, queries or wildcards.");
      return url.origin;
    });
  }
  function openInWebView(url: string, options: WebViewOptions, success: () => void, error: (error: PluginError) => void, browserCallbacks?: BrowserCallbacks, customHeaders?: { [key: string]: string } | null): void {
  options = Object.assign({}, options || DefaultWebViewOptions);
  options.teamsMessageOrigins = (options.teamsMessageOrigins || teamsMessageOrigins).slice();
  
  let triggerCorrectCallback = function (result: string) {
    const parsedResult: CallbackEvent = JSON.parse(result);
    if (parsedResult) {
      if (browserCallbacks) {
        trigger(parsedResult.eventType, success, parsedResult.data, browserCallbacks.onbrowserClosed, browserCallbacks.onbrowserPageLoaded, browserCallbacks.onbrowserPageNavigationCompleted);
      } else {
        trigger(parsedResult.eventType, success, parsedResult.data);
      }
    }
  };

  exec(triggerCorrectCallback, error, 'OSInAppBrowser', 'openInWebView', [{url, options, customHeaders}]);
}

function openInSystemBrowser(url: string, options: SystemBrowserOptions, success: () => void, error: (error: PluginError) => void, browserCallbacks?: BrowserCallbacks): void {
  options = options || DefaultSystemBrowserOptions;
  
  let triggerCorrectCallback = function (result: string) {
    const parsedResult: CallbackEvent = JSON.parse(result);
    if (parsedResult) {
      if (browserCallbacks) {
        trigger(parsedResult.eventType, success, parsedResult.data, browserCallbacks.onbrowserClosed, browserCallbacks.onbrowserPageLoaded);
      } else {
        trigger(parsedResult.eventType, success);
      }
    }
  };

  exec(triggerCorrectCallback, error, 'OSInAppBrowser', 'openInSystemBrowser', [{url, options}]);
}

function openInExternalBrowser(url: string, success: () => void, error: (error: PluginError) => void): void {
  exec(success, error, 'OSInAppBrowser', 'openInExternalBrowser', [{url}])
}

function close(success: () => void, error: (error: PluginError) => void): void {
  exec(success, error, 'OSInAppBrowser', 'close', [{}])  
}

module.exports = {
  setTeamsMessageOrigins,
  openInWebView,
  openInExternalBrowser,
  openInSystemBrowser,
  close
}

