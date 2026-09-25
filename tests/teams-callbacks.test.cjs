const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const urls = [
  'msteams://teams.microsoft.com/l/call/0/0?users=employee%40email.com',
  'msteams://teams.microsoft.com/l/chat/0/0?users=employee%40company.com',
  'intent://teams.microsoft.com/l/call/0/0?users=employee%40company.com#Intent;scheme=https;package=com.microsoft.teams;end',
  'intent://teams.microsoft.com/l/chat/0/0?users=employee%40company.com#Intent;scheme=https;package=com.microsoft.teams;end'
];
function load() {
  const calls = [];
  const cordova = { require: () => (...args) => calls.push(args) };
  const context = { exports: {}, module: { exports: {} }, require: () => cordova };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../dist/plugin.js'), 'utf8'), context);
  return { plugin: context.module.exports, calls };
}
for (const method of ['openInWebView', 'openInSystemBrowser']) {
  for (const url of urls) {
    test(`${method} preserves ${url.split('?')[0]} and settles success without browser events`, () => {
      const { plugin, calls } = load();
      let success = 0, failure = 0, closed = 0, loaded = 0;
      plugin[method](url, null, () => success++, () => failure++, {
        onbrowserClosed: () => closed++, onbrowserPageLoaded: () => loaded++
      });
      assert.equal(calls.length, 1);
      assert.equal(calls[0][4][0].url, url);
      calls[0][0](JSON.stringify({ eventType: 1 }));
      assert.deepEqual([success, failure, closed, loaded], [1, 0, 0, 0]);
    });
  }
  test(`${method} propagates native launch failure to the error callback`, () => {
    const { plugin, calls } = load(); let received;
    plugin[method](urls[0], null, () => assert.fail('Unexpected success'), error => { received = error; });
    const error = { code: 'TEST_UNAVAILABLE', message: 'Microsoft Teams is unavailable' };
    calls[0][1](error); assert.equal(received, error);
  });
}
