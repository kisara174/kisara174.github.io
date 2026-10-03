import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync,existsSync,symlinkSync,cpSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const cli=resolve('tools/writing.mjs');
function fixture(t){
 const root=mkdtempSync(join(tmpdir(),'kisara-writing-'));
 t.after(()=>rmSync(root,{recursive:true,force:true}));
 symlinkSync(resolve('node_modules'),join(root,'node_modules'),'dir');
 cpSync(resolve('scaffolds'),join(root,'scaffolds'),{recursive:true});
 mkdirSync(join(root,'scripts'),{recursive:true});
 cpSync(resolve('scripts/export-manifest.js'),join(root,'scripts/export-manifest.js'));
 mkdirSync(join(root,'themes/basic/layout'),{recursive:true});
 writeFileSync(join(root,'themes/basic/layout/post.ejs'),'<html><head><title><%= page.title %></title></head><body><%- page.content %></body></html>');
 writeFileSync(join(root,'package.json'),JSON.stringify({hexo:{version:'8.1.1'},dependencies:{'hexo-renderer-marked':'*','hexo-renderer-ejs':'*'}}));
 writeFileSync(join(root,'_config.yml'),'url: https://www.kisara.com.cn\ntimezone: Asia/Shanghai\ntheme: basic\npermalink: :year/:month/:day/:title/\nnew_post_name: :title.md\nrender_drafts: false\npost_asset_folder: false\n');
 return root;
}
function run(root,args){return spawnSync(process.execPath,[cli,...args],{cwd:root,env:{...process.env,TZ:'UTC'},encoding:'utf8'});}
function ok(r){assert.equal(r.status,0,r.stderr+r.stdout);}
function generate(root,draft=false){
 const hexo=resolve('node_modules/hexo/bin/hexo');
 const r=spawnSync(process.execPath,[hexo,'generate',...(draft?['--draft']:[])],{cwd:root,env:{...process.env,TZ:'Asia/Shanghai'},encoding:'utf8'});
 ok(r);return JSON.parse(readFileSync(join(root,'.cache/site-manifest.json')));
}
test('creates a named draft with Beijing date and a math note template',t=>{
 const root=fixture(t);ok(run(root,['draft','数学 笔记','--template','note']));
 const s=readFileSync(join(root,'source/_drafts/数学-笔记.md'),'utf8');
 assert.match(s,/title: 数学 笔记/);assert.match(s,/date: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
 const date=s.match(/date: (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})/)[1];
 assert.ok(Math.abs(Date.now()-Date.parse(date.replace(' ','T')+'+08:00'))<10000,'草稿日期必须是北京时间');
 assert.match(s,/## 推导/);assert.equal(existsSync(join(root,'source/_posts/数学-笔记.md')),false);
});
test('refuses duplicate drafts and unknown templates without changing content',t=>{
 const root=fixture(t);ok(run(root,['draft','测试']));const p=join(root,'source/_drafts/测试.md'),before=readFileSync(p,'utf8');
 assert.equal(run(root,['draft','测试']).status,1);assert.equal(readFileSync(p,'utf8'),before);
 assert.equal(run(root,['draft','其他','--template','unknown']).status,1);assert.equal(existsSync(join(root,'source/_drafts/其他.md')),false);
});
test('rejects traversal names and cannot publish a similarly prefixed draft',t=>{
 const root=fixture(t);assert.equal(run(root,['draft','../越界']).status,1);ok(run(root,['draft','foo-more']));
 assert.equal(run(root,['publish','foo']).status,1);assert.equal(existsSync(join(root,'source/_drafts/foo-more.md')),true);
});
test('publishes exactly the selected file and preserves its bytes and date',t=>{
 const root=fixture(t);ok(run(root,['draft','foo-more']));ok(run(root,['draft','foo']));
 const p=join(root,'source/_drafts/foo.md');const content='---\ntitle: Original\ndate: 2026-01-20 00:41:22\ntags: [数学]\n---\n正文\n';writeFileSync(p,content);
 ok(run(root,['publish','foo']));assert.equal(readFileSync(join(root,'source/_posts/foo.md'),'utf8'),content);
 assert.equal(existsSync(p),false);assert.equal(existsSync(join(root,'source/_drafts/foo-more.md')),true);
});
test('refuses to replace an existing article and keeps the draft',t=>{
 const root=fixture(t);ok(run(root,['draft','同名']));mkdirSync(join(root,'source/_posts'),{recursive:true});writeFileSync(join(root,'source/_posts/同名.md'),'原文章');
 assert.equal(run(root,['publish','同名']).status,1);assert.equal(readFileSync(join(root,'source/_posts/同名.md'),'utf8'),'原文章');assert.equal(existsSync(join(root,'source/_drafts/同名.md')),true);
});
test('copies images and prints encoded references without overwriting originals',t=>{
 const root=fixture(t);ok(run(root,['draft','数学 笔记']));const original=join(root,'示意 图.png');writeFileSync(original,Buffer.from([137,80,78,71]));
 const r=run(root,['image','数学-笔记',original]);ok(r);
 assert.match(r.stdout,/\/img\/posts\/%E6%95%B0%E5%AD%A6-%E7%AC%94%E8%AE%B0\/%E7%A4%BA%E6%84%8F%20%E5%9B%BE.png/);
 assert.deepEqual(readFileSync(join(root,'source/img/posts/数学-笔记/示意 图.png')),readFileSync(original));
 assert.equal(run(root,['image','数学-笔记',original]).status,1);
 assert.equal(run(root,['image','不存在',original]).status,1);
 const bad=join(root,'bad.svg');writeFileSync(bad,'<svg/>');assert.equal(run(root,['image','数学-笔记',bad]).status,1);
});
test('real Hexo hides drafts, previews them, then builds the unchanged dated article and image',t=>{
 const root=fixture(t);ok(run(root,['draft','实际笔记','--template','note']));
 const file=join(root,'source/_drafts/实际笔记.md');let content=readFileSync(file,'utf8').replace(/date: .*/, 'date: 2026-01-20 00:41:22');
 const image=join(root,'diagram.png');writeFileSync(image,Buffer.from([137,80,78,71]));const imported=run(root,['image','实际笔记',image]);ok(imported);
 content+='\n![示意图](/img/posts/%E5%AE%9E%E9%99%85%E7%AC%94%E8%AE%B0/diagram.png)\n$$x^2$$\n';writeFileSync(file,content);
 assert.equal(generate(root).posts.length,0);assert.equal(generate(root,true).posts.length,1);
 rmSync(join(root,'public'),{recursive:true,force:true});ok(run(root,['publish','实际笔记']));const manifest=generate(root);
 assert.equal(manifest.posts[0].path,'2026/01/20/实际笔记/');
 const html=readFileSync(join(root,'public/2026/01/20/实际笔记/index.html'),'utf8');assert.match(html,/<img[^>]+diagram\.png/);assert.match(html,/推导/);
 assert.equal(existsSync(join(root,'public/img/posts/实际笔记/diagram.png')),true);
});

test('a title resembling a CLI option cannot be interpreted as a Hexo switch',t=>{
 const root=fixture(t);const r=run(root,['draft','--version']);
 assert.equal(r.status,1);assert.equal(existsSync(join(root,'source/_drafts/version.md')),false);
});
