const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const origin = 'https://cbt-stg.ctx.ae';
const template = fs.readFileSync(path.join(__dirname, '../src/teams/osiab-teams.js'), 'utf8');
function page(ios = false, location = origin, iframe = false) {
  const calls = []; const listeners = []; let now = 5000;
  const receiver = { postMessage: x => calls.push(JSON.parse(x)) };
  const window = { location:{origin:location}, addEventListener:(name, fn)=>listeners.push(fn) };
  window.top = iframe ? {} : window;
  if (ios) window.webkit = {messageHandlers:{mappTeamsNative:receiver}};
  else window.mappTeamsNative = receiver;
  const context = {window, Date:{now:()=>now}};
  const script = template.replace('__MAPP_TEAMS_ORIGINS__',JSON.stringify([origin]));
  const install = () => vm.runInNewContext(script, context);
  install();
  return {calls,window,listeners,install,advance:()=>now+=2000,
    send:(data,extra={})=>listeners.forEach(fn=>fn({data,source:window,origin,...extra}))};
}
for (const ios of [false,true]) test(`agreed parent/self event forwards chat once on ${ios?'iOS':'Android'}`,()=>{
  const p=page(ios); p.send({type:'cbt:open-teams',email:'employee+travel@company.com',notificationType:'ignored'});
  assert.deepEqual(p.calls,[{type:'cbt:open-teams',email:'employee+travel@company.com'}]);
  p.send({type:'cbt:open-teams',email:'employee+travel@company.com'}); assert.equal(p.calls.length,1);
  p.advance();p.send({type:'cbt:open-teams',email:'employee+travel@company.com'});assert.equal(p.calls.length,2);
});
test('foreign origin, iframe source and malformed requests cannot launch',()=>{
  const p=page(); const valid={type:'cbt:open-teams',email:'employee@company.com'};
  p.send(valid,{origin:'https://evil.example'}); p.send(valid,{source:{}});
  for(const data of [null,[],JSON.stringify(valid),{...valid,email:'bad'}, {...valid,email:['e@c.com']},
    {...valid,email:'a@b.com\nc@d.com'}, {...valid,type:'download'}, {...valid,email:'a'.repeat(255)+'@b.com'}]) p.send(data);
  assert.equal(p.calls.length,0);
  p.send(valid);assert.equal(p.calls.length,1);
});
test('script not installed on auth pages or inside iframes',()=>{
  assert.equal(page(false,'https://login.example.com').listeners.length,0);
  assert.equal(page(false,origin,true).listeners.length,0);
});
test('repeated page-finished injection leaves one listener',()=>{
  const p=page();p.install();p.install();assert.equal(p.listeners.length,1);
});
function host() {
  const calls=[];const cordova={require:()=> (...args)=>calls.push(args)};
  const context={exports:{},module:{exports:{}},require:()=>cordova,URL};
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../dist/plugin.js'),'utf8'),context);
  return {plugin:context.module.exports,calls};
}
test('runtime origin config reaches native options without mutating caller',()=>{
  const {plugin,calls}=host();const options={showToolbar:false};
  plugin.setTeamsMessageOrigins([origin]);
  plugin.openInWebView(origin+'/?mobile=1',options,()=>{},()=>{});
  assert.equal(calls[0][4][0].options.teamsMessageOrigins[0],origin);
  assert.equal(options.teamsMessageOrigins,undefined);
  plugin.setTeamsMessageOrigins(['https://travel.example.com']);
  plugin.openInWebView('https://travel.example.com/?mobile=1',null,()=>{},()=>{});
  assert.equal(calls[1][4][0].options.teamsMessageOrigins[0],'https://travel.example.com');
  assert.equal(calls[0][4][0].options.teamsMessageOrigins[0],origin);
});
test('origin config rejects broad or non-origin input; empty list disables',()=>{
  const {plugin,calls}=host();
  for(const origins of [['*'],['http://cbt-stg.ctx.ae'],[origin+'/?mobile=1'],['https://*.ctx.ae'],['https://user:pass@host.example'],[null]]) {
    assert.throws(()=>plugin.setTeamsMessageOrigins(origins));
  }
  plugin.setTeamsMessageOrigins([]);plugin.openInWebView(origin,null,()=>{},()=>{});
  assert.equal(calls[0][4][0].options.teamsMessageOrigins.length,0);
});
