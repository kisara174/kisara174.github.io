import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { checkSite } from '../tools/check-site.mjs';

function fixture(t, overrides = {}) {
  const publicDir = mkdtempSync(join(tmpdir(), 'kisara-site-'));
  t.after(() => rmSync(publicDir, { recursive: true, force: true }));
  const write = (path, content) => {
    mkdirSync(join(publicDir, path, '..'), { recursive: true });
    writeFileSync(join(publicDir, path), content);
  };
  write('index.html', '<meta property="og:url" content="https://www.kisara.com.cn/"><a href="/笔记/">笔记</a>');
  write('笔记/index.html', '<h1 id="section">笔记</h1>');
  const manifest = {
    siteUrl: 'https://www.kisara.com.cn',
    posts: [{ source: '_posts/笔记.md', path: '笔记/index.html', title: '笔记', date: '2026-01-31T00:00:00+08:00', tags: ['数学'] }],
    ...overrides,
  };
  const baseline = { articlePaths: ['/笔记/'], requiredPaths: ['/'] };
  return { publicDir, manifest, baseline, write };
}

test('accepts actual rendered routes and encoded Chinese links', t => {
  const f = fixture(t);
  f.write('index.html', '<a href="/%E7%AC%94%E8%AE%B0/#section">笔记</a>');
  assert.deepEqual(checkSite(f).errors, []);
});

test('reports a missing original article route', t => {
  const f = fixture(t);
  f.baseline.articlePaths.push('/旧文章/');
  assert.match(checkSite(f).errors.join('\n'), /旧文章/);
});

test('rejects empty titles before Hexo filename fallback can hide them', t => {
  const f = fixture(t);
  f.manifest.posts[0].title = '  ';
  assert.match(checkSite(f).errors.join('\n'), /笔记.md.*title/);
});

test('rejects missing and invalid explicit publication dates', t => {
  const f = fixture(t);
  for (const date of [undefined, 'not-a-date']) {
    f.manifest.posts[0].date = date;
    assert.match(checkSite(f).errors.join('\n'), /笔记.md.*date/);
  }
});

test('rejects duplicate output routes including encoded equivalents', t => {
  const f = fixture(t);
  f.manifest.posts.push({ ...f.manifest.posts[0], source: '_posts/重复.md', path: '%E7%AC%94%E8%AE%B0/index.html' });
  assert.match(checkSite(f).errors.join('\n'), /重复.md.*重复/);
});

test('warns about absent tags without blocking publication', t => {
  const f = fixture(t);
  delete f.manifest.posts[0].tags;
  const result = checkSite(f);
  assert.deepEqual(result.errors, []);
  assert.match(result.warnings.join('\n'), /tags/);
});

test('rejects structured or numeric tag values instead of silently converting them', t => {
  const f = fixture(t);
  f.manifest.posts[0].tags = { math: true };
  assert.match(checkSite(f).errors.join('\n'), /tags/);
});

test('allows a scalar tag supported by Hexo', t => {
  const f = fixture(t);
  f.manifest.posts[0].tags = '数学';
  assert.deepEqual(checkSite(f).errors, []);
});

test('reports missing local images with the referencing page', t => {
  const f = fixture(t);
  f.write('笔记/index.html', '<img src="/img/missing.png">');
  assert.match(checkSite(f).errors.join('\n'), /笔记\/index.html.*missing.png/);
});

test('resolves relative links and same-site absolute links', t => {
  const f = fixture(t);
  f.write('笔记/index.html', '<a href="../">首页</a><a href="https://www.kisara.com.cn/笔记/">当前</a>');
  assert.deepEqual(checkSite(f).errors, []);
});

test('reports broken internal links without making external network requests', t => {
  const f = fixture(t);
  f.write('index.html', '<a href="/不存在/">失效</a><a href="https://unreachable.invalid/">外站</a>');
  const errors = checkSite(f).errors;
  assert.equal(errors.length, 1);
  assert.match(errors[0], /不存在/);
});

test('ignores scripts, data URLs, email links and in-page anchors', t => {
  const f = fixture(t);
  f.write('index.html', '<script>const html = \'<img src="/not-real">\';</script><a href="javascript:;">搜索</a><a href="mailto:test@example.com">邮件</a><img src="data:image/png;base64,AA"><a href="#local">锚点</a>');
  assert.deepEqual(checkSite(f).errors, []);
});

test('rejects example.com in canonical and social metadata but permits quoted prose', t => {
  const f = fixture(t);
  f.write('index.html', '<p>配置示例 http://example.com</p><!-- http://example.com -->');
  assert.deepEqual(checkSite(f).errors, []);
  f.write('index.html', '<meta property="og:url" content="http://example.com/"><link rel="canonical" href="http://example.com/">');
  assert.match(checkSite(f).errors.join('\n'), /example.com/);
});

test('checks CSS background resources rather than just HTML images', t => {
  const f = fixture(t);
  f.write('css/custom.css', 'body { background: url("/img/missing.jpg") }');
  f.write('index.html', '<link rel="stylesheet" href="/css/custom.css">');
  assert.match(checkSite(f).errors.join('\n'), /custom.css.*missing.jpg/);
});

test('rejects malformed URL escapes with an actionable message', t => {
  const f = fixture(t);
  f.write('index.html', '<a href="/%E0%A4/">无效</a>');
  assert.match(checkSite(f).errors.join('\n'), /index.html.*URL/);
});

test('rejects residual music and Live2D markup in the generated site', t => {
  const f = fixture(t);
  f.write('index.html', '<script src="https://cdn.example.org/APlayer.min.js"></script>');
  assert.match(checkSite(f).errors.join('\n'), /装饰/);
});

test('rejects a site URL that differs from the recorded domain', t => {
  const f = fixture(t);
  f.baseline.siteUrl = 'https://www.kisara.com.cn';
  f.manifest.siteUrl = 'https://wrong.example.org';
  assert.match(checkSite(f).errors.join('\n'), /域名/);
});

test('requires the search index and checks its actual output links', t => {
  const f = fixture(t);
  f.baseline.searchIndex = '/local-search.xml';
  assert.match(checkSite(f).errors.join('\n'), /local-search.xml/);
  f.write('local-search.xml', '<search><entry><title>笔记</title><link href="/笔记/"/></entry></search>');
  assert.deepEqual(checkSite(f).errors, []);
  f.write('local-search.xml', '<search><entry><link href="/missing/"/></entry></search>');
  assert.match(checkSite(f).errors.join('\n'), /local-search.xml.*missing/);
});

test('reports an empty search index', t => {
  const f = fixture(t);
  f.baseline.searchIndex = '/local-search.xml';
  f.write('local-search.xml', '<search></search>');
  assert.match(checkSite(f).errors.join('\n'), /搜索索引/);
});

test('CLI succeeds on a valid site and exits 1 with a file-specific failure', t => {
  const f = fixture(t);
  f.write('.cache/site-manifest.json',JSON.stringify(f.manifest));
  f.write('docs/maintenance/baseline.json',JSON.stringify(f.baseline));
  const run = () => spawnSync(process.execPath,[fileURLToPath(new URL('../tools/check-site.mjs',import.meta.url)),'--public',f.publicDir],{cwd:f.publicDir,encoding:'utf8'});
  assert.equal(run().status,0);
  f.write('index.html','<img src="/missing.png">');
  const failure = run();
  assert.equal(failure.status,1);
  assert.match(failure.stderr,/index.html.*missing.png/);
});

function discoveryFixture(t) {
  const f=fixture(t);
  f.baseline.discovery={feed:'/rss.xml',sitemap:'/sitemap.xml',robots:'/robots.txt',socialImage:'/img/eva.jpg'};
  f.write('img/eva.jpg','image');
  const page=url=>'<meta property="og:title" content="笔记"><meta property="og:url" content="'+url+'"><meta name="description" content="学习笔记"><link rel="canonical" href="'+url+'"><meta property="og:image" content="https://www.kisara.com.cn/img/eva.jpg">';
  f.write('index.html',page('https://www.kisara.com.cn/'));
  f.write('笔记/index.html',page('https://www.kisara.com.cn/%E7%AC%94%E8%AE%B0/'));
  f.write('rss.xml','<?xml version="1.0"?><rss version="2.0"><channel><title>Kisara</title><link>https://www.kisara.com.cn/</link><item><title>笔记</title><link>https://www.kisara.com.cn/笔记/</link></item></channel></rss>');
  f.write('sitemap.xml','<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://www.kisara.com.cn/</loc></url><url><loc>https://www.kisara.com.cn/笔记/</loc></url></urlset>');
  f.write('robots.txt','User-agent: *\nAllow: /\nSitemap: https://www.kisara.com.cn/sitemap.xml\n');
  return f;
}
test('accepts complete feeds, sitemap, robots and canonical/social metadata',t=>{
  assert.deepEqual(checkSite(discoveryFixture(t)).errors,[]);
});
for (const [name,path,content,pattern] of [
  ['empty feed','rss.xml','<rss version="2.0"><channel/></rss>',/rss.xml/],
  ['truncated XML','rss.xml','<rss><channel><item></channel></rss>',/XML/],
  ['wrong RSS root','rss.xml','<feed><item/></feed>',/rss.xml/],
  ['foreign feed URL','rss.xml','<rss><channel><item><link>https://wrong.invalid/笔记/</link></item></channel></rss>',/rss.xml/],
  ['duplicated feed item','rss.xml','<rss><channel><item><link>https://www.kisara.com.cn/笔记/</link></item><item><link>https://www.kisara.com.cn/%E7%AC%94%E8%AE%B0/</link></item></channel></rss>',/重复/],
  ['missing sitemap article','sitemap.xml','<urlset><url><loc>https://www.kisara.com.cn/</loc></url></urlset>',/sitemap.xml/],
  ['draft sitemap URL','sitemap.xml','<urlset><url><loc>https://www.kisara.com.cn/_drafts/test/</loc></url></urlset>',/sitemap.xml/],
  ['retired page sitemap URL','sitemap.xml','<urlset><url><loc>https://www.kisara.com.cn/memos/</loc></url></urlset>',/sitemap.xml/],
  ['404 sitemap URL','sitemap.xml','<urlset><url><loc>https://www.kisara.com.cn/404.html</loc></url></urlset>',/sitemap.xml/],
  ['wrong robots sitemap','robots.txt','User-agent: *\nSitemap: http://wrong.invalid/sitemap.xml\n',/robots.txt/],
  ['robots blocks whole site','robots.txt','User-agent: *\nDisallow: /\nSitemap: https://www.kisara.com.cn/sitemap.xml\n',/robots.txt/],
  ['empty description','笔记/index.html','<meta name="description" content=""><link rel="canonical" href="https://www.kisara.com.cn/笔记/"><meta property="og:image" content="https://www.kisara.com.cn/img/eva.jpg">',/description/],
  ['wrong canonical','笔记/index.html','<meta name="description" content="学习"><link rel="canonical" href="https://www.kisara.com.cn/"><meta property="og:image" content="https://www.kisara.com.cn/img/eva.jpg">',/canonical/],
  ['relative social image','index.html','<meta name="description" content="学习"><link rel="canonical" href="https://www.kisara.com.cn/"><meta property="og:image" content="/img/eva.jpg">',/og:image/],
  ['duplicate canonical','index.html','<meta name="description" content="学习"><link rel="canonical" href="https://www.kisara.com.cn/"><link rel="canonical" href="https://www.kisara.com.cn/"><meta property="og:image" content="https://www.kisara.com.cn/img/eva.jpg">',/canonical/]
]) test('discovery rejects '+name,t=>{
  const f=discoveryFixture(t);f.write(path,content);
  assert.match(checkSite(f).errors.join('\n'),pattern);
});
test('discovery checks are required by the production baseline',t=>{
  const f=fixture(t);
  const baseline=JSON.parse(readFileSync(new URL('../docs/maintenance/baseline.json',import.meta.url),'utf8'));
  f.baseline.discovery=baseline.discovery;
  assert.ok(f.baseline.discovery);
  assert.match(checkSite(f).errors.join('\n'),/rss.xml/);
});
test('missing lazy and responsive images are caught, data URL candidates are ignored',t=>{
  const f=fixture(t);
  f.write('img/ok.png','image');
  f.write('index.html','<img src="data:image/gif;base64,AA==" data-src="/img/missing.png"><img srcset="data:image/png;base64,AAAA 1x, /img/missing2.png 2x"><source srcset="/img/ok.png 400w, /img/missing3.png 800w">');
  assert.match(checkSite(f).errors.join('\n'),/missing.png/);
  assert.match(checkSite(f).errors.join('\n'),/missing2.png/);
  assert.match(checkSite(f).errors.join('\n'),/missing3.png/);
  f.write('index.html','<img srcset="data:image/png;base64,AAAA 1x, /img/ok.png 2x">');
  assert.deepEqual(checkSite(f).errors,[]);
});

test('missing RSS file and incorrect OG title/url block discovery',t=>{
  const f=discoveryFixture(t);
  rmSync(join(f.publicDir,'rss.xml'));
  assert.match(checkSite(f).errors.join('\n'),/rss.xml/);
  const g=discoveryFixture(t);
  g.write('index.html','<meta name="description" content="学习"><link rel="canonical" href="https://www.kisara.com.cn/"><meta property="og:image" content="https://www.kisara.com.cn/img/eva.jpg"><meta property="og:url" content="https://wrong.invalid/">');
  assert.match(checkSite(g).errors.join('\n'),/og:title/);
  assert.match(checkSite(g).errors.join('\n'),/og:url/);
});
test('sitemap rejects duplicate URLs even with differently encoded paths',t=>{
  const f=discoveryFixture(t);
  f.write('sitemap.xml','<urlset><url><loc>https://www.kisara.com.cn/</loc></url><url><loc>https://www.kisara.com.cn/笔记/</loc></url><url><loc>https://www.kisara.com.cn/%E7%AC%94%E8%AE%B0/</loc></url></urlset>');
  assert.match(checkSite(f).errors.join('\n'),/重复/);
});
test('existing 404, drafts and retired pages are forbidden even when their files exist',t=>{
  for (const path of ['404.html','memos/index.html','_drafts/test/index.html']) {
    const f=discoveryFixture(t);f.write(path,'<h1>not indexed</h1>');
    f.write('sitemap.xml','<urlset><url><loc>https://www.kisara.com.cn/</loc></url><url><loc>https://www.kisara.com.cn/笔记/</loc></url><url><loc>https://www.kisara.com.cn/'+path+'</loc></url></urlset>');
    assert.match(checkSite(f).errors.join('\n'),/不应索引/);
  }
});
test('data-srcset candidates are checked using encoded local paths',t=>{
  const f=fixture(t);
  f.write('img/中文 图.png','image');
  f.write('index.html','<img data-srcset="/img/%E4%B8%AD%E6%96%87%20%E5%9B%BE.png 1x, /img/missing.png 2x">');
  assert.match(checkSite(f).errors.join('\n'),/missing.png/);
  f.write('index.html','<img data-srcset="/img/%E4%B8%AD%E6%96%87%20%E5%9B%BE.png 1x">');
  assert.deepEqual(checkSite(f).errors,[]);
});
