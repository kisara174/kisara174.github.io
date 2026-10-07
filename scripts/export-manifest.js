const { mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
const frontMatter = require('hexo-front-matter');

// 直接使用 Hexo 过滤后的文章集合和实际输出路径，避免复制 permalink 算法。
hexo.extend.filter.register('after_generate', function () {
  const posts = hexo.locals.get('posts').toArray().map(post => {
    const metadata = frontMatter.parse(post.raw);
    return { source: post.source, path: post.path, title: metadata.title, date: metadata.date, tags: metadata.tags, math: metadata.math ?? false, updated: post.updated.toISOString() };
  });
  const directory = join(hexo.base_dir, '.cache');
  mkdirSync(directory, { recursive: true });
  writeFileSync(join(directory, 'site-manifest.json'), JSON.stringify({ siteUrl: hexo.config.url, posts }, null, 2));
});
