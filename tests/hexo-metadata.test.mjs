import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import Hexo from 'hexo';

test('real Hexo preserves midnight route, explicit updated and published-only collection', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'kisara-hexo-'));
  const previousTimezone = process.env.TZ;
  process.env.TZ = 'Asia/Shanghai';
  const write = (path, content) => {
    mkdirSync(join(directory,path,'..'),{recursive:true});
    writeFileSync(join(directory,path),content);
  };
  symlinkSync(resolve('node_modules'),join(directory,'node_modules'),'dir');
  write('package.json', JSON.stringify({hexo:{version:'8.1.1'},dependencies:{'hexo-renderer-marked':'*'}}));
  write('_config.yml','url: https://www.kisara.com.cn\ntimezone: Asia/Shanghai\nupdated_option: date\ntheme: ""\npermalink: :year/:month/:day/:title/\n');
  write('source/_posts/midnight.md','---\ntitle: Midnight\ndate: 2026-01-20 00:41:22\n---\n正文');
  write('source/_posts/revised.md','---\ntitle: Revised\ndate: 2026-01-20 00:41:22\nupdated: 2026-10-01 20:00:00\n---\n正文');
  write('source/_posts/hidden.md','---\ntitle: Hidden\ndate: 2026-01-20 00:41:22\npublished: false\n---\n隐藏');
  write('source/_drafts/draft.md','---\ntitle: Draft\ndate: 2026-01-20 00:41:22\n---\n草稿');
  const hexo = new Hexo(directory,{silent:true});
  t.after(async () => {
    await hexo.exit();
    rmSync(directory,{recursive:true,force:true});
    if (previousTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = previousTimezone;
  });
  await hexo.init();
  await hexo.load();
  const posts = hexo.locals.get('posts').toArray();
  assert.equal(posts.length,2);
  const midnight = posts.find(post=>post.slug==='midnight');
  assert.equal(midnight.path,'2026/01/20/midnight/');
  assert.equal(midnight.updated.toISOString(),midnight.date.toISOString());
  assert.equal(posts.find(post=>post.slug==='revised').updated.toISOString(),'2026-10-01T12:00:00.000Z');
});
