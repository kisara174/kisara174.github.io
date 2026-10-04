# RSS、SEO 与质量检查实施计划

> **For agentic workers:** 使用 executing-plans；主代理审查依赖和真实生成结果，不委派依赖或上线判断。

**Goal:** 可订阅全部正式文章，给出正确元信息和 sitemap，并在构建中阻止错误产物。

**Architecture:** 两个 Hexo 官方生成器 + Fluid 原有 head + 现有 check-site。新增检查随 baseline 配置启用，老核心 fixture 不被迫模拟整站。

**Tech Stack:** Node 24.21.0、Hexo 8.1.1、Fluid 1.9.9、现有 htmlparser2/linkedom；候选 feed 4.0.0、sitemap 3.0.1。

**Spec:** [共享设计 B](../specs/2026-10-04-website-phase3-design.md)。

## Global Constraints

保持版本/原文章日期、路径、正文/Giscus/HTTPS/source/main；最多新增两个固定版本官方生成插件，不增加 SEO 平台账号或自动提交收录。沿用 verify/CI，不重做断链/缺图。每日巡检保持现有22项，新产物先由离线构建检查覆盖。

## 文件与合同

| 操作 | 文件 | 用途 |
| --- | --- | --- |
| 修改 | package.json、package-lock.json | 固定生成插件 |
| 修改 | _config.yml | 简介、feed、sitemap |
| 修改 | _config.fluid.yml | canonical、首页分享图、页脚RSS |
| 创建 | source/robots.txt | 声明 sitemap |
| 修改 | docs/maintenance/baseline.json | discovery 产物和正式分享图要求 |
| 修改 | tools/check-site.mjs、tests/check-site.test.mjs | 复用路由与解析器，增加产物检查 |
| 创建 | docs/maintenance/discovery.md | 订阅/SEO维护与验证 |
| 修改 | README.md | 写作与订阅入口说明 |

checkSite({publicDir,manifest,baseline}) 的返回合同保持 {errors,warnings,posts}。当 baseline.discovery 存在时启用检查；固定形状为：

```json
{"feed":"/rss.xml","sitemap":"/sitemap.xml","robots":"/robots.txt","socialImage":"/img/eva.jpg"}
```

不向 requiredPaths 加 RSS：它们不是 HTML，也不会自动混入健康巡检。helper 可留在 check-site 同一模块，复用 existing reference(file,value)，不复制 permalink/路径映射算法。文章 URL 一律使用实际 manifest.posts[].path；index.html 和结尾斜线仅作比较归一。

## Task B1：生成器与产物

- [ ] 先在现有 fixture 增加 discovery 场景：缺 RSS/sitemap/robots 要出现具体文件错误，记录 RED。
- [ ] 检查候选版本/Node engines，执行下列安装；比较 audit 与现有记录，不使用 audit fix --force、盲目降级或 override。
- [ ] 配置 RSS2 摘要和 sitemap；测试生成覆盖正式文章，不含 drafts/Memos/404，XML中链接解码后仍为正式域名。
- [ ] 将 discovery 写入实际 baseline；只撤销/增加功能对应配置，不改8篇 articlePaths。
- [ ] 核对默认404来自 Fluid generator，并非 source/404.md；不得修改 node_modules。若生成器意外收录404，先查上游过滤接口，不能删除正式404来迁就 sitemap。
- [ ] clean/build 与 verify，记录新包版本、真实审计和产物；独立提交生成器和检查。

未来安装命令（规划阶段不执行）：

```sh
npm install --save-exact hexo-generator-feed@4.0.0 hexo-generator-sitemap@3.0.1
npm audit --json
```

配置：

```yaml
description: '学习笔记与个人记录，分享数学、物理及学习过程中的思考。'
feed:
  enable: true
  type: rss2
  path: rss.xml
  limit: 0
  content: false
sitemap:
  path: sitemap.xml
```

robots.txt：

```text
User-agent: *
Allow: /
Sitemap: https://www.kisara.com.cn/sitemap.xml
```

当前公开静态站无需新 robots 禁止规则，草稿靠实际不生成排除；不是靠 robots 保护隐私。

## Task B2：真实元信息和订阅入口

- [ ] 打开 Fluid 原有 canonical.enable；不更改 pretty_urls/permalink。
- [ ] 首页和8篇文章核对唯一 canonical，正确 www/HTTPS；缺失/错误域名/重复 canonical 用 fixture 验证会失败。
- [ ] 使用现有 open_graph 配置给出绝对分享图 https://www.kisara.com.cn/img/eva.jpg；核对不重复 meta，不引入分享 SDK。
- [ ] description 存在且非空、为文字；OG title/url/image 核对真实输出，兼容主题已经输出的 og:url。
- [ ] 页脚增加简单 RSS 链接，读者可复制/订阅；不再增加顶层导航。
- [ ] 浏览器查看首页和长文章、手机分享信息、RSS可读；实际 XML 解析在本地验证，不要求已被搜索引擎收录。
- [ ] 文档说明后续文章的 description 来源与 sitemap 排除方式，独立提交配置/入口。

## Task B3：完整覆盖与现有 CI

- [ ] fixture 覆盖：RSS伪HTML、截断/空items、错误域名、重复链接、缺正式文章、草稿/Memos/404泄漏；sitemap 对应场景；robots错误Sitemap；meta缺失/错域名/缺分享图。
- [ ] RSS用rss/channel/item/link、sitemap用urlset/url/loc核对预期结构和闭合。检查实际生成文件与manifest全集；拒绝空输出和错误根节点，不声称验证整个XML标准。
- [ ] 新语义检查调用已有资源解析。扩展现有 HTML 资源覆盖 data-src、data-srcset/srcset，支持多候选URL与descriptor；data URI和外站仍忽略。
- [ ] 给懒加载真实图片缺失、中文编码和合法 srcset 写失败测试；不要把占位图可用当作正文图片可用。
- [ ] 旧 check-site fixture 不设 discovery 时保持原断链、中文路径、搜索和资源合同；产品 baseline 必须启用 discovery，增加对应回归断言。
- [ ] 若新增校验已由 check-site 调用，pages.yml 不需新 job；npm run verify 在本机/Linux同时检查。
- [ ] PR CI和真实部署后检查 /rss.xml、/sitemap.xml、/robots.txt HTTP200与类型/内容，8篇文章仍通过；记录维护文档。

失败测试示例（沿用现有 fixture(t)）：

```js
const f=fixture(t);
f.baseline.discovery={
  feed:'/rss.xml',sitemap:'/sitemap.xml',
  robots:'/robots.txt',socialImage:'/img/eva.jpg'
};
assert.match(checkSite(f).errors.join('\n'), /rss\.xml/);
f.write('笔记/index.html',
  '<img src="data:image/gif;base64,AA" data-src="/img/missing.png">');
assert.match(checkSite(f).errors.join('\n'), /missing\.png/);
```

## 验证和回退

```sh
node --test tests/check-site.test.mjs
npm run verify
git diff --check
curl --fail --max-time 20 https://www.kisara.com.cn/rss.xml
curl --fail --max-time 20 https://www.kisara.com.cn/sitemap.xml
curl --fail --max-time 20 https://www.kisara.com.cn/robots.txt
```

curl只在真实部署成功之后运行，不能以旧站结果验收新功能。验收：全部正式文章在RSS/sitemap中，草稿与404不在，元信息正确、RSS入口可用，错误产物使CI失败。XML fixtures和完整生成集各有证据。

回退同一交付的实际提交，同时撤销包/锁、配置、入口和新增 discovery 硬要求；保留此前原路径、断链和资源检查。审计报告如有新增风险，先解释影响再决定方案，不把绿色构建当成没有风险。
