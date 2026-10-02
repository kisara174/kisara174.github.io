import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
