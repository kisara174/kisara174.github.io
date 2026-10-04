import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { resolve, relative, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Parser } from 'htmlparser2';
import { DOMParser } from 'linkedom';

export function checkSite({ publicDir, manifest, baseline }) {
  const errors = new Set();
  const warnings = [];
  const fail = (file, reason) => errors.add(`${file}: ${reason}`);
  const site = new URL(manifest.siteUrl);
  if (baseline.siteUrl && new URL(baseline.siteUrl).href !== site.href) fail('站点配置', `域名与基线不一致 ${site.href}`);
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
  if (baseline.searchIndex) {
    reference('搜索索引', baseline.searchIndex);
    const indexFile = routeFile(baseline.searchIndex);
    if (validFile(indexFile)) {
      const indexedRoutes = new Set();
      const parser = new Parser({ onopentag(name, attributes) {
        if (name !== 'link' || !attributes.href) return;
        reference(baseline.searchIndex, attributes.href);
        try {
          const url = new URL(attributes.href, site);
          if (url.origin === site.origin) indexedRoutes.add(routeFile(url.pathname));
        } catch { /* reference 已输出无效 URL */ }
      } }, {xmlMode:true});
      parser.end(readFileSync(indexFile,'utf8'));
      for (const [route, source] of routes) if (!indexedRoutes.has(route)) fail(baseline.searchIndex, `搜索索引缺少文章 ${source}`);
    }
  }
  if (baseline.discovery) {
    const discovery = baseline.discovery;
    const normalize = value => {
      const url = new URL(value);
      if (url.origin !== site.origin || url.protocol !== 'https:') throw new Error('URL 必须使用正式 HTTPS 域名');
      return routeFile(url.pathname.replace(/index\.html$/, ''));
    };
    const xmlDocument = file => {
      reference('订阅与发现', file);
      const target = routeFile(file);
      if (!validFile(target)) return null;
      const content = readFileSync(target, 'utf8');
      let invalid = false, parser;
      parser = new Parser({ onclosetag(name, implied) {
        if (implied && !/\/\s*>$/.test(content.slice(parser.startIndex, parser.endIndex + 1))) invalid = true;
      } }, { xmlMode: true });
      parser.end(content);
      const doc = new DOMParser().parseFromString(content, 'application/xml');
      if (invalid || [...doc.childNodes].filter(node => node.nodeType === 1).length !== 1) {
        fail(file, 'XML 未正确闭合或根节点无效');
        return null;
      }
      return doc;
    };
    for (const [kind, rootName, selector, linkName] of [
      ['feed', 'rss', 'channel > item', 'link'],
      ['sitemap', 'urlset', 'url', 'loc']
    ]) {
      const file = discovery[kind], doc = xmlDocument(file);
      if (!doc) continue;
      if (doc.documentElement?.localName !== rootName ||
          (kind === 'feed' && !doc.querySelector('rss > channel'))) {
        fail(file, 'XML 根结构应为 ' + rootName);
        continue;
      }
      const indexed = new Set();
      const entries = [...doc.querySelectorAll(selector)];
      for (const entry of entries) {
        const links = [...entry.children].filter(node => node.localName === linkName);
        if (links.length !== 1) { fail(file, '每项必须包含一个 ' + linkName); continue; }
        const value = links[0].textContent.trim();
        try {
          const url = new URL(value);
          if (/\/(?:_drafts|memos)(?:\/|$)|\/404(?:\.html|\/)/.test(decodeURIComponent(url.pathname))) fail(file, '不应索引草稿、Memos 或 404: ' + value);
          const route = normalize(value);
          reference(file, value);
          if (indexed.has(route)) fail(file, '重复 URL ' + value);
          indexed.add(route);
          if (kind === 'feed' && !routes.has(route)) fail(file, 'RSS 包含非正式文章 ' + value);
        } catch { fail(file, '无效或非正式域名 URL ' + value); }
      }
      for (const [route, source] of routes) if (!indexed.has(route)) fail(file, '缺少文章 ' + source);
      if (kind === 'feed' && entries.length !== manifest.posts.length) fail(file, 'RSS 条目数量与正式文章不一致');
      if (kind === 'sitemap' && !indexed.has(routeFile('/'))) fail(file, '站点地图缺少首页');
    }
    reference('订阅与发现', discovery.robots);
    const robotsFile = routeFile(discovery.robots);
    if (validFile(robotsFile)) {
      const robots = readFileSync(robotsFile, 'utf8');
      const sitemapLines = [...robots.matchAll(/^Sitemap:\s*(\S+)\s*$/gmi)];
      if (sitemapLines.length !== 1 || sitemapLines[0][1] !== new URL(discovery.sitemap, site).href) fail(discovery.robots, 'Sitemap 必须指向正式站点地图');
      if (/^Disallow:\s*\/\s*$/mi.test(robots) || !/^User-agent:\s*\*\s*$/mi.test(robots)) fail(discovery.robots, 'robots 不应禁止整站抓取，并需默认 User-agent');
    }
    const pages = [routeFile('/'), ...routes.keys()];
    for (const target of pages) {
      if (!validFile(target)) continue;
      const file = relative(publicDir, target).replaceAll('\\', '/');
      const doc = new DOMParser().parseFromString(readFileSync(target, 'utf8'), 'text/html');
      const descriptions = [...doc.querySelectorAll('meta[name="description"]')];
      if (descriptions.length !== 1 || !descriptions[0].getAttribute('content')?.trim()) fail(file, 'description 必须存在且非空');
      const canonicals = [...doc.querySelectorAll('link[rel="canonical"]')];
      try {
        if (canonicals.length !== 1 || normalize(canonicals[0].getAttribute('href')) !== target) fail(file, 'canonical 必须唯一且对应当前正式 URL');
      } catch { fail(file, 'canonical 缺失或域名无效'); }
      const titles = [...doc.querySelectorAll('meta[property="og:title"]')];
      if (titles.length !== 1 || !titles[0].getAttribute('content')?.trim()) fail(file, 'og:title 必须唯一且非空');
      const urls = [...doc.querySelectorAll('meta[property="og:url"]')];
      try {
        if (urls.length !== 1 || normalize(urls[0].getAttribute('content')) !== target) fail(file, 'og:url 必须对应当前正式 URL');
      } catch { fail(file, 'og:url 缺失或域名无效'); }
      const images = [...doc.querySelectorAll('meta[property="og:image"]')];
      try {
        if (images.length !== 1 || normalize(images[0].getAttribute('content')) !== routeFile(discovery.socialImage)) fail(file, 'og:image 必须为正式域名的分享图片');
        reference(file, images[0]?.getAttribute('content'));
      } catch { fail(file, 'og:image 缺失或不是绝对 HTTPS URL'); }
    }
  }
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
      for (const attr of ['src', 'href', 'poster', 'data-src']) reference(file, attributes[attr]);
      for (const attr of ['srcset', 'data-srcset']) {
        const candidates = attributes[attr] || '';
        let rest = candidates.trim();
        while (rest) {
          rest = rest.replace(/^[,\s]+/, '');
          const token = /^\S+/.exec(rest)?.[0];
          if (!token) break;
          reference(file, token.replace(/,+$/, ''));
          rest = rest.slice(token.length);
          if (!token.endsWith(',')) {
            const comma = rest.indexOf(',');
            rest = comma < 0 ? '' : rest.slice(comma + 1);
          }
        }
      }
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
