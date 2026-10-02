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
