# Fluid 迁移记录

旧目录标注 1.9.8，但与官方 v1.9.8 有 13 个文本差异。迁移采用固定 npm `hexo-theme-fluid@1.9.9`，个人配置与图片迁到根配置/source。对照官方包逐项处理：

| 旧文件 | 差异与处理 |
| --- | --- |
| README.md | 上游说明，改为 npm 包自带文档 |
| README_en.md | 上游说明，改为 npm 包自带文档 |
| _config.yml | 上游默认配置，个人需求统一根 `_config.fluid.yml` 覆盖 |
| layout/index.ejs | 隐藏 H1，上游 1.9.9 已包含 |
| languages/zh-TW.yml | 上游繁体翻译，使用 1.9.9；本站语言 zh-CN |
| scripts/tags/fold.js | HTML 换行转空格，上游 1.9.9 已包含 |
| scripts/tags/note.js | HTML 换行转空格，上游 1.9.9 已包含 |
| scripts/helpers/wordcount.js | content.length 字数统计，上游 1.9.9 已包含 |
| source/js/events.js | 移动菜单动画保护，上游 1.9.9 已包含 |
| source/js/umami-view.js | API 路径/认证修复，使用上游；本站未启用 Umami |
| layout/_partials/comments/disqus.ejs | Disqus 参数，使用上游；本站使用 Giscus |
| layout/_partials/comments/cusdis.ejs | iframe 高度，使用上游；本站未启用 Cusdis |
| layout/_partials/plugins/typed.ejs | 随机文字支持，使用上游；为简洁和减少动态关闭打字动画 |

个人文件 `eva.jpg`、`fluid0.png` 搬到 `source/img`，URL 保持 `/img/eva.jpg`、`/img/fluid0.png`。CSS 搬到 `source/css/custom.css`，加入 Liquid Glass 导航/卡片/搜索浮层；正文使用接近实色的背景。新增深色切换，沿用 Fluid 的状态与交互。不复制模板、修改依赖包或加入折射库。

根主题配置从一千余行缩为个人差异。保留全文章 MathJax、Giscus pathname 映射、现有导航、栏目和横幅；删除未用评论系统与 CDN 覆盖。上游默认值见 npm 包配置及 [Fluid 文档](https://hexo.fluid-dev.com/docs/guide/)。

## 当前责任边界（2026-10-07）

上文为迁移时的状态；资源加载的后续调整以 [架构优化清单](../superpowers/plans/2026-10-07-website-architecture-roadmap.md) 和 [性能记录](performance.md) 为准。

| 入口 | 责任 | 更新时检查 |
| --- | --- | --- |
| `_config.yml` | 站点 URL、语言、时区、permalink、生成器等 Hexo 配置 | 原文章路径、日期、RSS/sitemap 与站点检查 |
| `_config.fluid.yml` | 通过官方接口覆盖导航、横幅、暗色、公式、评论与自有资源 | 对照固定版本默认配置与发布说明，验证覆盖实际生效 |
| `source/css/custom.css` | 自有液态玻璃视觉、正文可读性、手机及无障碍回退 | Fluid DOM/class、暗色属性、菜单/搜索交互与媒体查询 |
| `scripts/export-manifest.js` | Hexo 插件，构建后导出实际文章路径及元数据 | Hexo 生命周期与 manifest；不放维护 CLI |
| `tools/*.mjs`、`tests/*.test.mjs` | Mac 写作/发布入口、构建产物与健康校验 | CLI 接口、生成页结构与真实失败场景 |
| `node_modules/hexo-theme-fluid` | 固定版本上游实现，仅用于读取与对照 | 通过依赖更新获得新版，不在此编辑或复制模板 |

主题外观不等于内容模型。文章继续用 Markdown/front matter；图像位于 `source/img`；系列页使用普通 Markdown 链接。未来换主题时先保留这些内容与地址，再适配导航、搜索及视觉规则。

## 自有 CSS 的主题结构依赖

| 选择器 / 属性 | 用途与升级复查点 |
| --- | --- |
| `[data-user-color-scheme="dark"]` | Fluid 暗色状态；自有颜色/透明度/阴影变量随之切换 |
| `#navbar`、`.top-nav-collapse`、`.navbar-col-show` | 浮动玻璃导航及滚动/展开状态；不能仅保留初始导航样式 |
| `.navbar-toggler .animated-icon span` | 手机菜单/关闭图标；强制颜色模式使用系统 ButtonText |
| `#mobile-grid-menu`、`.mobile-grid-item`、`.show` | 手机网格菜单显示、可用高度及可读性；与 Bootstrap collapse 分别复查 |
| `#board`、`.index-card`、`.index-header/excerpt/btm/info` | 正文容器和首页卡片；正文接近实色，不能整体改为透明玻璃 |
| `.modal-dialog .modal-content`、`.modal-header .close` | 搜索弹层与关闭控件；检查输入焦点、结果与 Escape |
| `.markdown-body`、`mjx-container[display="true"]` | 正文行距、图片、代码及长公式横向滚动 |
| `#scroll-top-button`、`.links .card` | 返回顶部和友情链接卡片 |
| `@supports` 与 reduced-motion/transparency、forced-colors、print | 无模糊、系统偏好、高对比度与打印回退；保持规则顺序 |

当前颜色、透明度和主要阴影已经集中在 `:root` 与暗色变量块内，CSS 仅一个入口。圆角数值中的差异对应手机、卡片和正文用途；不为统一数字而改变布局，也不拆成多个文件或复制 Fluid 模板。任何后续删重复规则的改动均单独做视觉对照。
