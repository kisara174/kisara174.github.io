import test from 'node:test';
import assert from 'node:assert/strict';
const reporter=await import('../tools/report-health.mjs').catch(e=>{if(e.code==='ERR_MODULE_NOT_FOUND')return {};throw e;});
const report=(checks)=>({schemaVersion:1,checkedAt:'2026-10-03T00:00:00Z',checks});
const bad={id:'page:/missing/',url:'https://site.example/missing/',status:'fail',code:'HTTP_404'};
const pass={...bad,status:'pass',code:'OK'};
function fake(){const issues=[],writes=[],comments=[];return {issues,writes,comments,api:async(method,path,body)=>{
 if(method==='GET'&&path.includes('/comments'))return comments;
 if(method==='GET'){const page=Number(new URL('https://api.github.com'+path).searchParams.get('page'));return issues.slice((page-1)*100,page*100);}
 writes.push({method,path,body});if(method==='POST'&&path.endsWith('/comments')){comments.push(body);return body;}if(method==='POST'){const issue={number:issues.length+1,state:'open',...body};issues.push(issue);return issue;}
 const issue=issues.find(i=>path.endsWith('/'+i.number));Object.assign(issue,body);return issue;
 }};}
test('new outages create one managed issue and identical errors stay quiet',async()=>{
 assert.equal(typeof reporter.reportHealth,'function');const f=fake();
 await reporter.reportHealth(report([bad]),{api:f.api,repository:'me/site',runUrl:'https://github.com/me/site/actions/runs/1'});
 assert.equal(f.writes.length,1);assert.equal(f.issues[0].title,'网站健康检查异常');assert.match(f.issues[0].body,/website-health:v1/);
 await reporter.reportHealth({...report([bad]),checkedAt:'2026-10-04T00:00:00Z'},{api:f.api,repository:'me/site',runUrl:'https://github.com/me/site/actions/runs/2'});
 assert.equal(f.writes.length,1);
});
test('changed failures update, full recovery closes once and relapse reopens',async()=>{
 assert.equal(typeof reporter.reportHealth,'function');const f=fake(),opts={api:f.api,repository:'me/site'};
 await reporter.reportHealth(report([bad]),opts);await reporter.reportHealth(report([{...bad,code:'TIMEOUT'}]),opts);assert.equal(f.writes.length,3);assert.equal(f.comments.length,1);
 await reporter.reportHealth(report([pass]),opts);assert.equal(f.issues[0].state,'closed');assert.equal(f.writes.length,5);assert.equal(f.comments.length,2);
 await reporter.reportHealth(report([pass]),opts);assert.equal(f.writes.length,5);
 await reporter.reportHealth(report([bad]),opts);assert.equal(f.issues.length,1);assert.equal(f.issues[0].state,'open');assert.equal(f.writes.length,7);assert.equal(f.comments.length,3);
});
test('manual closure of a continuing outage reopens rather than duplicating it',async()=>{
 assert.equal(typeof reporter.reportHealth,'function');const f=fake(),opts={api:f.api,repository:'me/site'};
 await reporter.reportHealth(report([bad]),opts);f.issues[0].state='closed';await reporter.reportHealth(report([bad]),opts);
 assert.equal(f.issues.length,1);assert.equal(f.issues[0].state,'open');assert.equal(f.writes.length,3);
});
test('no issue is created for healthy sites and day-to-day expiry drift is quiet',async()=>{
 assert.equal(typeof reporter.reportHealth,'function');const f=fake(),opts={api:f.api,repository:'me/site'};
 await reporter.reportHealth(report([pass]),opts);assert.equal(f.writes.length,0);
 await reporter.reportHealth(report([{...bad,status:'warn',code:'CERT_EXPIRING',expiresAt:'2026-10-20T00:00:00Z'}]),opts);
 await reporter.reportHealth(report([{...bad,status:'warn',code:'CERT_EXPIRING',expiresAt:'2026-10-21T00:00:00Z'}]),opts);assert.equal(f.writes.length,1);
});
test('paginates existing issues and ignores similarly titled user issues',async()=>{
 assert.equal(typeof reporter.reportHealth,'function');const f=fake(),opts={api:f.api,repository:'me/site'};
 f.issues.push(...Array.from({length:100},(_,i)=>({number:i+1,title:'网站健康检查异常',body:'User note',state:'open'})));
 await reporter.reportHealth(report([bad]),opts);assert.equal(f.issues.length,101);
 await reporter.reportHealth(report([bad]),opts);assert.equal(f.writes.length,1);
});
test('invalid reports and API errors remain visible without publishing data',async()=>{
 assert.equal(typeof reporter.reportHealth,'function');const f=fake(),opts={api:f.api,repository:'me/site'};
 await assert.rejects(reporter.reportHealth(report([]),opts),/report|报告/);assert.equal(f.writes.length,0);
 await assert.rejects(reporter.reportHealth(report([{...bad,url:'https://user:secret@example.com/'}]),opts),/report|报告/);assert.equal(f.writes.length,0);
 await assert.rejects(reporter.reportHealth(report([bad]),{repository:'me/site',api:async()=>{throw new Error('API unavailable');}}),/API unavailable/);
});

test('a retry after comment succeeds but issue update fails does not repeat the comment',async()=>{
 const f=fake(),opts={api:f.api,repository:'me/site'};
 await reporter.reportHealth(report([bad]),opts);
 let fail=true;
 const api=async(method,path,body)=>{if(method==='PATCH'&&fail){fail=false;throw new Error('temporary write failure');}return f.api(method,path,body);};
 const changed=report([{...bad,code:'TIMEOUT'}]);
 await assert.rejects(reporter.reportHealth(changed,{...opts,api}),/temporary write failure/);
 assert.equal(f.comments.length,1);
 await reporter.reportHealth(changed,{...opts,api});assert.equal(f.comments.length,1);
 assert.match(f.issues[0].body,/TIMEOUT/);
});
