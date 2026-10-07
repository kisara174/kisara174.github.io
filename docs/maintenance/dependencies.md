# 依赖状态

## 构建依赖与浏览器资源（2026-10-07）

Hexo、EJS/Marked/Stylus renderer、各 generator 和校验用 htmlparser2/linkedom 运行在 Mac 或 CI，不作为浏览器脚本加载。Fluid 的主题源码也只参与构建；下表是从当前生成 HTML 的 stylesheet/script 引用核对的浏览器资源，不能用 npm 依赖数量代替网络请求数。

| 资源 | 使用范围与用途 | 来源 / 维护入口 |
| --- | --- | --- |
| 横幅 `eva.webp`（保留 `eva.jpg`） | 首页、文章、归档、标签、系列等页面背景 | `source/img`，根 `_config.fluid.yml` 的各 `banner_img`；OG 分享图单独配置 |
| Bootstrap 4.6.1 CSS/JS、jQuery 3.6.4 | 全站布局、导航、搜索弹层等基础交互 | `lib.baomitu.com`；Fluid `static_prefix.bootstrap/jquery` |
| 两套 Iconfont CSS 与按需字体 | 全站主题图标与菜单图标 | `at.alicdn.com`；主题固定依赖 `font_1749284_5i9bdhy70f8.css` 与可配置 `iconfont`，不是同一资源的重复请求 |
| `main.css`、`highlight.css`、`highlight-dark.css` | 全站主题外观、代码高亮及暗色高亮 | Fluid 生成到 `/css`，由主题模板管理；自有 `/css/custom.css` 最后覆盖 |
| NProgress 0.2.0 CSS/JS | 全站页面加载进度 | `lib.baomitu.com`；`static_prefix.nprogress` 与主题开关 |
| `utils/color-schema/events/plugins/img-lazyload/local-search/boot.js` | 全站主题状态、导航、图片延迟加载及搜索 | Fluid 生成到 `/js`；搜索索引为本站 `/local-search.xml`，查询时使用 |
| github-markdown-css 4.0.0、hint.css 2.7.0 | 当前文章正文与提示 | `lib.baomitu.com`；主题 markdown 插件与对应 `static_prefix` |
| Fancybox 3.5.7 CSS/JS | 当前文章图片放大 | `lib.baomitu.com`；`post.image_zoom`、对应 `static_prefix`；JS 由插件动态插入，并非必须点击图片才下载 |
| AnchorJS 5.0.0、Tocbot 4.20.1 | 文章标题锚点与目录 | `lib.baomitu.com`；`fun_features.anchorjs`、`post.toc` 和对应 `static_prefix`；由插件动态插入 |
| Clipboard 2.0.11 | 当前文章代码复制 | `lib.baomitu.com`；主题代码插件按配置注入 |
| MathJax 3.2.2 | 7 篇明确 `math: true` 的公式文章；介绍文章不加载 | `lib.baomitu.com`；`post.math`，主题已启用 `ui/lazy`；首页/系列等列表页未加载 |
| Giscus | 文章评论，主题延迟加载 | `giscus.app`；根 `giscus` 配置；pathname 映射保持 |
| Cloudflare 注入脚本（如 beacon） | 仅线上响应可能出现，不来自本地生成 HTML | 由现有 Cloudflare 配置管理，本阶段不更改 |

路径依据：Fluid `layout/_partials/{css,scripts,markdown-plugins}.ejs`、`plugins/math.ejs` 和生成页。表格是引用/加载条件清单，不代表每项在首屏都发出请求；字体、懒加载脚本和评论应结合网络瀑布判断。当前正文字体使用系统字体栈，没有新增在线正文字体。

官方配置入口见 [Fluid 覆盖配置与静态资源](https://fluid-dev.github.io/hexo-fluid-docs/guide/)。2026-10-07 核对官方 releases：已安装 Hexo 8.1.1，上游最新 [8.1.2](https://github.com/hexojs/hexo/releases/tag/v8.1.2)；Fluid 已安装与上游最新均为 [1.9.9](https://github.com/fluid-dev/hexo-theme-fluid/releases/tag/v1.9.9)。这只说明有可评估的版本，不等于升级已完成或依赖无漏洞。本批不改 package/lock，不将版本升级混入性能实验。

## 当前安装与审计（2026-10-07）

使用 `.nvmrc` 指定的 Node 24.21.0 与原锁文件重新 `npm ci` 成功。当前 `npm audit --json` 报告 11 个条目（9 high、2 moderate），去重后为 3 个 advisory；不能继续使用下方历史“8 high”的数字描述当前状态。原始报告保存在忽略的 `.cache/architecture-resources/audit.json`，依赖和锁文件本批未改。

| Advisory | 已安装依赖链 | 当前官方补丁状态 / 下一步 |
| --- | --- | --- |
| [braces 深嵌套栈耗尽](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | 既有 Hexo/Fluid/micromatch 等构建链 | 官方仍无补丁；继续跟踪上游，不强制降级或 override |
| [compression 提前断连内存泄漏](https://github.com/advisories/GHSA-vc2v-76pw-4v95) | `hexo-server@3.0.0 → compression@1.8.1` | 官方补丁 1.8.2；单独更新锁文件候选，并验收本机预览服务和完整 verify |
| [sprintf-js 非受限精度参数](https://github.com/advisories/GHSA-hp3w-g68c-fv3c) | `hexo@8.1.1 → hexo-i18n@2.0.0 → sprintf-js@1.1.3` | 官方仍无补丁；跟踪 i18n/Hexo 上游 |

正式站只提供静态产物，不运行 Hexo 预览服务。现有 npm server/preview 固定监听 127.0.0.1；保持该边界，不以此宣称本机依赖无风险，也不执行 `npm audit fix --force`。依赖更新应独立审阅，避免干扰资源性能对照。

## 历史安装与审计记录

2026-10-03 在 Node 24.21.0、当前未修改的 package-lock 上运行 `npm ci` 与 `npm audit --json`。安装和构建通过；审计报告 7 个 high 条目，均来自同一个 `braces <=3.0.3` 问题及依赖链传播，不是 7 个独立漏洞。

上游 [GHSA-vfj7-8cjw-p6xm / CVE-2026-93687](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) 说明深度嵌套的 glob 模式可能导致栈耗尽；当前没有修复版本。已安装的 braces 3.0.3 经 Hexo 的 micromatch 和 Fluid 的 Nunjucks/chokidar 等路径引入。

审计给出的自动建议包含把 Hexo 降级至 3.9.0，是不兼容的大版本改变，不能通过 `npm audit fix --force` 直接应用。本次保持锁文件和主题版本，没有添加依赖。问题位于本机/CI 构建与 watch 的依赖链；正式网站发布的是静态页面，不能把构建依赖的告警等同于浏览器中已注入漏洞代码，也不能宣称依赖无漏洞。

后续在上游有可用补丁时审阅 Dependabot PR，运行 `npm run verify` 并检查主题兼容性。不要自动合并、盲目 override 或用旧 Hexo 消除报告。此前维护记录中的审计值是当时的结果，以本次日期和实际 advisory 为新的现状。

2026-10-04 新增官方 hexo-generator-feed 4.0.0（Node >=20.19.0）与 hexo-generator-sitemap 3.0.1（Node >=12.13.0），固定版本并更新 lock。安装前 audit 为 7 high，安装后为 8 high：新增 sitemap 条目仍是既有 braces/micromatch/Nunjucks 链的传播，没有新增独立 advisory；依赖审计未清零。保持 Node 24.21.0 和现有主题，不执行 force、降级或 override。实际构建与错误产物校验通过后再发布。
