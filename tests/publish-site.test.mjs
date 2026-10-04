import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
const exec = promisify(execFile);
const mod = await import('../tools/publish-site.mjs').catch(() => ({}));
const repo = 'https://github.com/kisara174/kisara174.github.io.git';
const result = (stdout='', code=0, stderr='') => ({stdout,code,stderr});
async function fixture(t) {
  assert.equal(typeof mod.publishSite, 'function', 'publication API exists');
  const base = await mkdtemp(join(tmpdir(),'site-publication-'));
  t.after(() => rm(base,{recursive:true,force:true}));
  const root=join(base,'checkout'), origin=join(base,'origin.git');
  await mkdir(root);
  const git=async (...args) => (await exec('git',args,{cwd:root})).stdout;
  await exec('git',['init','--bare',origin]);
  await git('init','-b','source');
  await git('config','user.name','Website test');
  await git('config','user.email','website-test@example.invalid');
  await writeFile(join(root,'.nvmrc'),process.versions.node+'\n');
  await writeFile(join(root,'.gitignore'),'.cache/\npublic/\nnode_modules/\n');
  await mkdir(join(root,'source'));
  await writeFile(join(root,'source','existing.md'),'original\n');
  await git('add','.');
  await git('commit','-m','baseline');
  await git('remote','add','origin',origin);
  await git('push','-u','origin','source');
  const before=(await git('rev-parse','HEAD')).trim();
  const file='source/中文 笔记\n第二行.md';
  await writeFile(join(root,file),'staged\n');
  await git('add','--',file);
  const calls=[];
  const f={root,git,before,file,calls,remote:repo,verify:null,gh:true,fail:null};
  f.run=async (command,args,options={}) => {
    calls.push([command,...args]);
    if (command==='git' && args.join(' ')==='remote get-url origin') return result(f.remote);
    if (f.fail && command==='git' && args[0]===f.fail) return result('',1,'simulated failure');
    if (command==='npm') {
      if (args[0]==='--version') return result('11.6.0');
      if (args.join(' ')==='run verify') return f.verify ? await f.verify() : result();
      throw new Error('unexpected npm command');
    }
    if (command==='gh') {
      if (!f.gh) return result('',1,'not authenticated');
      if (args[0]==='auth') return result();
      const sha=(await git('rev-parse','HEAD')).trim();
      if (args[1]==='list') return result(JSON.stringify([{databaseId:42,headSha:sha,status:'completed',conclusion:'success',url:'https://github.com/run/42'}]));
      if (args[1]==='view') return result(JSON.stringify({headSha:sha,status:'completed',conclusion:'success',url:'https://github.com/run/42',jobs:[{name:'build',conclusion:'success'},{name:'deploy',conclusion:'success'}]}));
      throw new Error('unexpected gh command');
    }
    try { const r=await exec(command,args,{cwd:options.cwd||root}); return result(r.stdout); }
    catch(e) { return result(e.stdout||'',e.code||1,e.stderr||e.message); }
  };
  return f;
}
const publish=f=>mod.publishSite({root:f.root},{run:f.run});
const apply=f=>mod.publishSite({root:f.root,apply:true,message:'更新 中文笔记'},{run:f.run});

test('preflight validates the staged tree without changing HEAD or remote, preserving unusual paths',async t=>{
  const f=await fixture(t);
  const out=await publish(f);
  assert.equal(out.stage,'verified');
  assert.deepEqual(out.files,[f.file]);
  assert.equal((await f.git('rev-parse','HEAD')).trim(),f.before);
  assert.equal((await f.git('rev-parse','origin/source')).trim(),f.before);
  assert.ok(f.calls.every(c=>!(c[0]==='git' && ['add','commit','push','reset','rebase'].includes(c[1]))));
});
for (const [name,setup,pattern] of [
  ['empty index',async f=>{await f.git('reset');await rm(join(f.root,f.file));},/暂存|staged/],
  ['wrong branch',async f=>f.git('switch','-c','other'),/source/],
  ['foreign origin',async f=>{f.remote='https://github.com/other/site.git';},/origin/],
  ['unstaged tracked changes',async f=>writeFile(join(f.root,'source','existing.md'),'changed'),/未暂存|unstaged/],
  ['untracked build input',async f=>writeFile(join(f.root,'source','image.png'),'image'),/未跟踪|untracked/],
  ['local unpushed commit',async f=>{await f.git('commit','-m','previous');await writeFile(join(f.root,f.file),'again');await f.git('add','--',f.file);},/ahead|领先/],
  ['remote changed',async f=>{const commit=await f.git('commit-tree',f.before+'^{tree}','-p',f.before,'-m','remote');await f.git('push','origin',commit.trim()+':source');},/behind|落后/]
]) test(name+' stops before committing',async t=>{
  const f=await fixture(t);await setup(f);
  await assert.rejects(()=>publish(f),pattern);
  assert.ok(!f.calls.some(c=>c[0]==='git' && c[1]==='commit'));
});
test('ignored build output is allowed and preflight can run without gh',async t=>{
  const f=await fixture(t);f.gh=false;
  await mkdir(join(f.root,'public'));await writeFile(join(f.root,'public','index.html'),'generated');
  assert.equal((await publish(f)).stage,'verified');
  await assert.rejects(()=>apply(f),/gh|认证/);
  assert.equal((await f.git('rev-parse','HEAD')).trim(),f.before);
});
for (const [name,change] of [
  ['verify failure',async()=>result('',1,'failed tests')],
  ['workspace changed during verify',async f=>{await writeFile(join(f.root,'source','existing.md'),'race');return result();}],
  ['index changed during verify',async f=>{await writeFile(join(f.root,f.file),'race');await f.git('add','--',f.file);return result();}],
  ['HEAD changed during verify',async f=>{await f.git('commit','-m','race');return result();}]
]) test(name+' blocks publication',async t=>{
  const f=await fixture(t);f.verify=()=>change(f);
  await assert.rejects(()=>apply(f),e=>e.stage==='verify');
  assert.ok(!f.calls.some(c=>c[0]==='git' && ['commit','push'].includes(c[1])));
});
test('apply commits only the index and pushes the resulting SHA, then confirms deployment',async t=>{
  const f=await fixture(t);
  const out=await apply(f);
  assert.equal(out.stage,'deployed');assert.equal(out.conclusion,'success');
  assert.notEqual(out.sha,f.before);
  assert.equal((await f.git('rev-parse','origin/source')).trim(),out.sha);
  assert.equal((await f.git('show','HEAD:'+f.file)),'staged\n');
  assert.equal((await f.git('status','--porcelain')),'');
});
test('commit failure never pushes; push failure preserves the new commit and SHA',async t=>{
  const f=await fixture(t);f.fail='commit';
  await assert.rejects(()=>apply(f),e=>e.stage==='commit');
  assert.ok(!f.calls.some(c=>c[0]==='git' && c[1]==='push'));
  f.fail='push';
  await assert.rejects(()=>apply(f),e=>e.stage==='push' && e.sha!==f.before && /^[a-f0-9]{40}$/.test(e.sha));
  assert.notEqual((await f.git('rev-parse','HEAD')).trim(),f.before);
});
test('apply requires a message before any write',async t=>{
  const f=await fixture(t);
  await assert.rejects(()=>mod.publishSite({root:f.root,apply:true},{run:f.run}),/message|提交说明/);
  assert.equal((await f.git('rev-parse','HEAD')).trim(),f.before);
});
const sha='a'.repeat(40), url='https://github.com/run/7';
for (const [name,runs,view] of [
  ['wrong SHA',[{databaseId:7,headSha:'b'.repeat(40),url}],null],
  ['no run',[],null],
  ['pending',[{databaseId:7,headSha:sha,url}],{headSha:sha,status:'in_progress',jobs:[]}],
  ['API failure',null,null],
  ['failed build',[{databaseId:7,headSha:sha,url}],{headSha:sha,status:'completed',conclusion:'failure',jobs:[{name:'build',conclusion:'failure'},{name:'deploy',conclusion:'skipped'}]}],
  ['skipped deploy',[{databaseId:7,headSha:sha,url}],{headSha:sha,status:'completed',conclusion:'success',jobs:[{name:'build',conclusion:'success'},{name:'deploy',conclusion:'skipped'}]}],
  ['cancelled',[{databaseId:7,headSha:sha,url}],{headSha:sha,status:'completed',conclusion:'cancelled',jobs:[]}]
]) test('deployment '+name+' cannot be reported as success',async()=>{
  assert.equal(typeof mod.waitForDeployment,'function');
  const run=async (c,a)=> a[1]==='list' ? (runs ? result(JSON.stringify(runs)):result('',1,'API unavailable')) : result(JSON.stringify({...view,url}));
  await assert.rejects(()=>mod.waitForDeployment({sha,timeoutMs:10,pollMs:1},{run}),e=>e.stage==='deploy' && e.sha===sha);
});
test('deployment observation accepts only matching SHA and successful build plus deploy',async()=>{
  assert.equal(typeof mod.waitForDeployment,'function');
  const run=async(c,a)=>result(JSON.stringify(a[1]==='list' ? [{databaseId:7,headSha:sha,url}] : {headSha:sha,status:'completed',conclusion:'success',url,jobs:[{name:'build',conclusion:'success'},{name:'deploy',conclusion:'success'}]}));
  assert.deepEqual(await mod.waitForDeployment({sha,timeoutMs:100},{run}),{runUrl:url,conclusion:'success'});
});
test('a conflicted merge is rejected before any new commit',async t=>{
  const f=await fixture(t);
  await f.git('commit','-m','staged article');
  await f.git('switch','-c','conflict');
  await writeFile(join(f.root,'source','existing.md'),'branch conflict\n');
  await f.git('commit','-am','other edit');
  await f.git('switch','source');
  await writeFile(join(f.root,'source','existing.md'),'source conflict\n');
  await f.git('commit','-am','source edit');
  await assert.rejects(()=>f.git('merge','conflict'));
  await assert.rejects(()=>publish(f),/冲突/);
});
test('wrong Node version blocks verify and all Git writes',async t=>{
  const f=await fixture(t);await writeFile(join(f.root,'.nvmrc'),'0.0.1\n');
  await assert.rejects(()=>publish(f),/Node/);
  assert.equal((await f.git('rev-parse','HEAD')).trim(),f.before);
  assert.ok(!f.calls.some(c=>c[0]==='npm' && c[1]==='run'));
});
test('status only observes a SHA belonging to source and never publishes staged edits',async t=>{
  const f=await fixture(t);
  const out=await mod.observePublication({root:f.root,sha:f.before},{run:f.run});
  assert.equal(out.sha,f.before);assert.equal(out.stage,'deployed');
  assert.equal((await f.git('rev-parse','HEAD')).trim(),f.before);
  await assert.rejects(()=>mod.observePublication({root:f.root,sha:'b'.repeat(40)},{run:f.run}));
  await assert.rejects(()=>mod.observePublication({root:f.root,sha:'HEAD'},{run:f.run}),/SHA/);
  assert.ok(f.calls.every(c=>!(c[0]==='git' && ['add','commit','push'].includes(c[1]))));
});
test('CLI rejects unknown options and a missing message without touching Git',async t=>{
  const f=await fixture(t), script=join(import.meta.dirname,'..','tools','publish-site.mjs');
  await assert.rejects(()=>exec(process.execPath,[script,'--unknown'],{cwd:f.root}),e=>e.code===1 && /未知参数/.test(e.stderr));
  await assert.rejects(()=>exec(process.execPath,[script,'--apply'],{cwd:f.root}),e=>e.code===1 && /message/.test(e.stderr));
  assert.equal((await f.git('rev-parse','HEAD')).trim(),f.before);
});
