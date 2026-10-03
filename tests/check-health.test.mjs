import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const health=await import('../tools/check-health.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
test('health checker exports executable contracts',()=>{assert.equal(typeof health.checkTarget,'function');assert.equal(typeof health.runChecks,'function');});
async function fixture(t,handler){const server=http.createServer(handler);await new Promise(r=>server.listen(0,'127.0.0.1',r));t.after(()=>new Promise(r=>server.close(r)));return `http://127.0.0.1:${server.address().port}`;}
test('real HTTP checks distinguish actual HTML, incorrect content type and missing routes',async t=>{
 assert.equal(typeof health.checkTarget,'function');
 const base=await fixture(t,(req,res)=>{if(req.url==='/missing'){res.writeHead(404);res.end('Not Found');}else if(req.url==='/fake'){res.setHeader('Content-Type','application/json');res.end('{}');}else{res.setHeader('Content-Type','text/html');res.end('<html><head><title>Kisara</title></head><body>Kisara</body></html>');}});
 assert.equal((await health.checkTarget({id:'html',url:base+'/',kind:'html'})).status,'pass');
 assert.equal((await health.checkTarget({id:'fake',url:base+'/fake',kind:'html'})).code,'CONTENT_INVALID');
 assert.equal((await health.checkTarget({id:'missing',url:base+'/missing',kind:'html'})).code,'HTTP_404');
});
test('redirects retain query, stop loops and retry transient failures once',async t=>{
 assert.equal(typeof health.checkTarget,'function');let attempts=0;
 const base=await fixture(t,(req,res)=>{
  if(req.url.startsWith('/redirect')){res.writeHead(301,{Location:'/done?x=1'});res.end();}
  else if(req.url==='/loop'){res.writeHead(302,{Location:'/loop'});res.end();}
  else if(req.url==='/retry'&&attempts++===0){res.writeHead(503);res.end();}
  else{res.setHeader('Content-Type','text/html');res.end('<title>Kisara</title>Kisara');}
 });
 assert.equal((await health.checkTarget({id:'redirect',url:base+'/redirect?x=1',kind:'redirect',expectedUrl:base+'/done?x=1'})).status,'pass');
 assert.equal((await health.checkTarget({id:'loop',url:base+'/loop',kind:'html'})).code,'REDIRECT_LIMIT');
 assert.equal((await health.checkTarget({id:'retry',url:base+'/retry',kind:'html'})).status,'pass');assert.equal(attempts,2);
});
test('timeout cancels a real stalled response',async t=>{
 assert.equal(typeof health.checkTarget,'function');
 const base=await fixture(t,()=>{});
 assert.equal((await health.checkTarget({id:'timeout',url:base+'/',kind:'html'},{timeoutMs:15})).code,'TIMEOUT');
});
test('origin TLS checks retain verification and classify expiry and certificate errors',async()=>{
 assert.equal(typeof health.checkTarget,'function');
 const target={id:'origin',url:'https://www.kisara.com.cn/',kind:'tls',address:'185.199.108.153'};
 const result=await health.checkTarget(target,{now:new Date('2026-10-03T00:00:00Z'),transport:async(url,options)=>{
  assert.equal(url,target.url);assert.equal(options.address,'185.199.108.153');
  return {statusCode:200,headers:{},body:'',url,certificate:{valid_to:'Oct 20 00:00:00 2026 GMT'}};
 }});assert.equal(result.status,'warn');assert.equal(result.code,'CERT_EXPIRING');
 for(const [error,expected] of [['ERR_TLS_CERT_ALTNAME_INVALID','CERT_HOSTNAME'],['CERT_HAS_EXPIRED','CERT_EXPIRED']]){
  const r=await health.checkTarget(target,{transport:async()=>{throw Object.assign(new Error('secret diagnostic'),{code:error});}});assert.equal(r.code,expected);assert.equal(JSON.stringify(r).includes('secret'),false);
 }
});
test('response bodies are never included in the stored report',async()=>{
 assert.equal(typeof health.runChecks,'function');const content='PRIVATE-looking page content';
 const report=await health.runChecks([{id:'page',url:'https://site.example/',kind:'html'}],{transport:async url=>({statusCode:200,url,headers:{'content-type':'text/html'},body:'<title>Kisara</title><p>'+content+'</p>'})});
 assert.equal(report.checks[0].status,'pass');assert.equal(JSON.stringify(report).includes(content),false);
});
test('bounded concurrency protects remote endpoints',async()=>{
 assert.equal(typeof health.runChecks,'function');let active=0,max=0;
 const targets=Array.from({length:9},(_,i)=>({id:String(i),url:'https://example.com/',kind:'html'}));
 const report=await health.runChecks(targets,{transport:async url=>{active++;max=Math.max(max,active);await new Promise(r=>setTimeout(r,5));active--;return {url,statusCode:200,headers:{'content-type':'text/html'},body:'<title>Kisara</title>Kisara'};}});
 assert.equal(report.checks.length,9);assert.ok(max<=4);
});

test('an HTTP 200 fallback cannot masquerade as the requested article',async()=>{
 const r=await health.checkTarget({id:'article',url:'https://site.example/article/',kind:'html',canonical:'https://site.example/article/'},{transport:async url=>({statusCode:200,url,headers:{'content-type':'text/html'},body:'<title>Kisara</title><link rel="canonical" href="https://site.example/">Kisara'})});
 assert.equal(r.code,'CONTENT_INVALID');
});

test('Fluid og:url identifies directory pages and rejects fallback home pages',async()=>{
 const target={id:'article',url:'https://site.example/article/',kind:'html',canonical:'https://site.example/article/'};
 const transport=content=>async url=>({statusCode:200,url,headers:{'content-type':'text/html'},body:`<title>Kisara</title><meta property="og:url" content="${content}">Kisara`});
 assert.equal((await health.checkTarget(target,{transport:transport('https://site.example/article/index.html')})).status,'pass');
 assert.equal((await health.checkTarget(target,{transport:transport('https://site.example/index.html')})).code,'CONTENT_INVALID');
});

test('search and personal assets reject HTML or incomplete responses',async()=>{
 for(const [kind,type,valid,invalid] of [
  ['xml','application/xml','<?xml version="1.0"?><search><entry><title>数学</title></entry></search>','<search><entry>'],
  ['css','text/css','.card { color: red; }','<html>error</html>']
 ]){
  const target={id:kind,url:'https://site.example/resource',kind};
  const transport=body=>async url=>({url,statusCode:200,headers:{'content-type':type},body});
  assert.equal((await health.checkTarget(target,{transport:transport(valid)})).status,'pass');
  assert.equal((await health.checkTarget(target,{transport:transport(invalid)})).code,'CONTENT_INVALID');
 }
});

test('website targets need only the baseline and no retired service configuration',async t=>{
 const root=await mkdtemp(join(tmpdir(),'kisara-health-targets-'));
 t.after(()=>rm(root,{recursive:true,force:true}));
 const baseline=JSON.parse(await readFile(new URL('../docs/maintenance/baseline.json',import.meta.url),'utf8'));
 await mkdir(join(root,'docs/maintenance'),{recursive:true});
 await writeFile(join(root,'docs/maintenance/baseline.json'),JSON.stringify(baseline));
 const targets=await health.siteTargets(root);
 assert.equal(targets.length,22);
 assert.ok(targets.every(target=>!target.id.includes('memos')&&!target.url.includes('memos')));
 for(const path of baseline.articlePaths)assert.ok(targets.some(target=>target.url===new URL(path,baseline.siteUrl).href));
 assert.ok(targets.some(target=>target.id==='tls:origin'&&target.address==='185.199.108.153'));
});
