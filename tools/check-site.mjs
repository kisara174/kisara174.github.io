import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Parser } from 'htmlparser2';

export function checkSite({ publicDir, manifest, baseline }) {
  const errors = new Set();
  const warnings = [];
  const fail = (file, reason) => errors.add(`${file}: ${reason}`);
  const site = new URL(manifest.siteUrl);
  const routeFile = pathname => {
    const decoded = decodeURIComponent(pathname).replace(/^\/+/, '');
    const target = resolve(publicDir, decoded || '.');
    if (relative(resolve(publicDir), target).startsWith('..')) throw new Error('路径越界');
    return !decoded || decoded.endsWith('/') ? join(target, 'index.html') : target;
  };
  const validFile = path => existsSync(path) && statSync(path).isFile();
  const reference = (file, value) => {
    if (!value || value.startsWith('#')) return;
    try {
      const url = new URL(value, new URL(file, `${site.origin}/`));
      if (!['http:', 'https:'].includes(url.protocol) || url.origin !== site.origin) return;
      let target = routeFile(url.pathname);
      if (!validFile(target) && !url.pathname.endsWith('/')) target = join(target, 'index.html');
      if (!validFile(target)) fail(file, `本地资源或链接不存在 ${value}`);
    } catch {
      fail(file, `无效 URL ${value}`);
    }
  };
  const routes = new Map();
  for (const post of manifest.posts) {
    if (typeof post.title !== 'string' || !post.title.trim()) fail(post.source, 'title 必须为非空文字');
    if (!post.date || !Number.isFinite(Date.parse(post.date))) fail(post.source, 'date 缺失或无效');
    if (post.tags == null || post.tags === '' || (Array.isArray(post.tags) && !post.tags.length)) warnings.push(`${post.source}: 缺少 tags`);
    else if (!(typeof post.tags === 'string' || (Array.isArray(post.tags) && post.tags.every(tag => typeof tag === 'string' && tag.trim())))) fail(post.source, 'tags 应为文字或文字列表');
    try {
      const route = routeFile(`/${post.path}`);
      if (routes.has(route)) fail(post.source, `重复文章路径，与 ${routes.get(route)} 相同`);
      routes.set(route, post.source);
      if (!validFile(route)) fail(post.source, `文章输出不存在 ${post.path}`);
    } catch { fail(post.source, `无效文章 URL ${post.path}`); }
  }
  for (const route of [...baseline.articlePaths, ...baseline.requiredPaths]) reference('基线路由', route);
  const walk = directory => readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(join(directory, entry.name)) : [join(directory, entry.name)]);
  for (const path of walk(publicDir)) {
    const file = relative(publicDir, path).replaceAll('\\', '/');
    if (!/\.(html|css)$/.test(file)) continue;
    const content = readFileSync(path, 'utf8');
    if (file.endsWith('.css')) {
      for (const match of content.matchAll(/url\(\s*['"]?([^'"\)]+)['"]?\s*\)/g)) reference(file, match[1].trim());
      continue;
    }
    const parser = new Parser({ onopentag(name, attributes) {
      for (const attr of ['src', 'href', 'poster']) reference(file, attributes[attr]);
      if (name === 'script' && /APlayer|Meting|live2d|click-text/i.test(attributes.src || '')) fail(file, '残留装饰脚本');
      if (/aplayer|live2d/i.test(`${attributes.id || ''} ${attributes.class || ''}`)) fail(file, '残留装饰元素');
      if ((name === 'meta' && /^(og:|twitter:)/.test(attributes.property || attributes.name || '')) || (name === 'link' && attributes.rel === 'canonical')) {
        if (/https?:\/\/example\.com(?:\/|$)/.test(attributes.content || attributes.href || '')) fail(file, '正式元信息含 example.com');
      }
    } }, { decodeEntities: true });
    parser.end(content);
  }
  return { errors: [...errors], warnings, posts: manifest.posts.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const index = process.argv.indexOf('--public');
    const result = checkSite({
      publicDir: resolve(index >= 0 ? process.argv[index + 1] : 'public'),
      manifest: JSON.parse(readFileSync('.cache/site-manifest.json', 'utf8')),
      baseline: JSON.parse(readFileSync('docs/maintenance/baseline.json', 'utf8')),
    });
    for (const warning of result.warnings) console.warn(`提示 ${warning}`);
    for (const error of result.errors) console.error(error);
    console.log(`检查 ${result.posts} 篇文章；${result.errors.length} 个错误，${result.warnings.length} 个提示`);
    process.exitCode = result.errors.length ? 1 : 0;
  } catch (error) {
    console.error(`站点检查无法完成: ${error.message}。请先 npm run build。`);
    process.exitCode = 1;
  }
}
