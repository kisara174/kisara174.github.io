# 网站维护第三阶段设计

日期：2026-10-04（Asia/Shanghai）。状态：规划稿；本次只编写文档。

## 目标与已核对事实

目标：在 Mac 上串联文章检查、提交和部署结果，让既有内容可订阅、可发现、易于阅读。复用 Hexo/Fluid 与 GitHub Pages。

起点：source 提交 `5bf6f6250a5233f38452b31bcba6c32a72d6ae4e`；Node 24.21.0、Hexo 8.1.1、Fluid 1.9.9，8 篇文章、47 项测试。draft/image/preview/publish:draft 已实现；publish:draft 只转正式文章，不处理 Git。

`tools/check-site.mjs` 已检查文章、原路径、HTML/CSS 本地资源、断链及搜索索引。首页 description 为空，没有 canonical；Fluid 支持 canonical，默认关闭，已有部分 Open Graph 输出。RSS/sitemap 依赖与生成文件尚不存在。

2026-10-04 注册表查询：`hexo-generator-feed@4.0.0` 要求 Node >=20.19.0；`hexo-generator-sitemap@3.0.1` 要求 Node >=12.13.0。仅为候选，实施仍需兼容和审计验证。

横幅 eva.jpg 为 298059 bytes，主题默认图各 400730 bytes；尚无性能报告，不能据此判断瓶颈。文章已有数学/物理/生活标签，未设置专门系列导航。

首个 schedule 已成功，22/22、report quiet：[运行记录](https://github.com/kisara174/kisara174.github.io/actions/runs/37193437502)。实际开始北京时间 2026-10-04 17:50:33，晚于配置的 11:17；保留原 cron，调度不是精确时间保证。

## 共享约束

- 保持 Node 24.21.0、Hexo 8.1.1、Fluid 1.9.9、Asia/Shanghai，不顺带升级。
- 保持正式域名 https://www.kisara.com.cn、source 自动 Pages、旧 main。
- 保持 8 篇文章文件名、date、URL、正文及 Giscus pathname 映射，不重写公式。
- Memos、播放器、Live2D、点击动画继续取消。
- 不改 DNS、HTTPS、外部服务或通知偏好；不增加后台/CMS/AI API。
- CLI 放 tools，Hexo 插件放 scripts，测试放 tests；不编辑 node_modules/public。
- A、C、D 不新增 npm 依赖；B 最多新增两个官方生成插件，固定直接版本和锁文件。
- 本机与 CI 使用同一 npm run verify；健康检查独立，不阻断文章构建。
- 主代理负责设计、Git、依赖、发布与验收；不委派规划或高风险工作。

## 独立交付与方案

### A：发布入口

复用 Git 暂存作为内容选择；不自动 git add -A、转正草稿或创建发布服务。

`npm run publish:site` 预检、显示暂存差异并运行 verify；`npm run publish:site -- --apply --message "更新学习笔记"` 才提交、普通 push 和观察对应 SHA 的 build/deploy。另设 `npm run publish:status -- --sha <40位SHA>`，只继续观察，不重复推送。

为保证构建和提交一致：拒绝未暂存的跟踪改动、未跟踪的构建输入（source/scripts/tools/tests/scaffolds/根配置和包文件）；忽略的 public/cache 不受影响。暂存为空、错误分支/远端、冲突、远端超前、本地已有未推送提交均停止并给出具体下一步。fetch 后核对同步，不自动 pull/rebase。

verify 前后核对 HEAD、暂存树和工作树；变化则停止。commit/push/查询/部署失败分别报告阶段，保留文件和已创建提交，不 reset/force。成功必须为该 SHA 的 build 和 deploy 都 success。默认最多观察 10 分钟；超时返回 SHA/run 链接。

### B：订阅、SEO 和质量

官方插件生成 `/rss.xml`（RSS2、摘要、全部正式文章）及 `/sitemap.xml`。Fluid 输出 canonical 和分享信息，不写第二套 head。简介建议“学习笔记与个人记录，分享数学、物理及学习过程中的思考。”，不扩写作者履历。

canonical 的 index.html 归一只用于比较，不改原 URL 配置。首页分享图使用现有 eva.jpg；文章精写摘要在 D。robots.txt 声明 sitemap，404/草稿/Memos 不入 sitemap；它不是访问控制，也不承诺收录。RSS 链接放页脚，不增加主导航负担。

扩展现有 check-site 检查 RSS/sitemap 结构、正式域名、实际文件、文章覆盖、description/canonical/分享图。复用已有解析器做预期结构和语义核对，不写通用 XML schema 引擎。断链和缺图不重新实现。

### C：性能

先测首页和长数学文章的手机/桌面场景，每种至少三次；记录浏览器版本、缓存/网络、LCP/CLS/TBT、请求体积中位数。Lighthouse 不是实测用户 INP，不拿一次分数作保证。

候选：横幅发现与加载优先级、合适尺寸/WebP、外部资源、手机大面积模糊。只有测量指向瓶颈时才改。保留玻璃风格、桌面 22px 基准、接近实色的正文、深色和实色回退。不增加视差、动态光照。

用浏览器内置 Lighthouse；不新增 Lighthouse CI 或图片库。基线没有明显瓶颈可交付报告结案，不强行改 CSS。

### D：内容组织

纯 Markdown 的 `/series/` 学习导航使用现有 Fluid page；直接链接原文章。保留数学/物理/生活标签，不迁移栏目或建立自动关联引擎。baseline.requiredPaths 增加系列页后，健康巡检从22变23项；同步相关断言和维护说明。

数学按连续与微分、积分与向量分析、级数组织；物理为运动学。8 篇 description 由人工审阅，只改 front matter，保留 title/date/文件名/正文。新文章模板加入可选 description。

## 顺序与后续

推荐 A → B → D；C 测量后独立按证据实施。每项单独 PR、验证、部署和回退。性能分数暂不成为 CI 硬门槛。AI 摘要/标签建议、自动图片转换、CMS、PWA 和复杂统计后台另行设计。

## 官方依据

- [RSS 插件](https://github.com/hexojs/hexo-generator-feed)、[sitemap 插件](https://github.com/hexojs/hexo-generator-sitemap)。
- [Hexo front matter](https://hexo.io/docs/front-matter)、[permalink](https://hexo.io/docs/permalinks)。
- [gh run list](https://cli.github.com/manual/gh_run_list)、[gh run watch](https://cli.github.com/manual/gh_run_watch)。
- [Lighthouse](https://developer.chrome.com/docs/devtools/lighthouse/)、[LCP 优化](https://web.dev/articles/optimize-lcp)。
- [减少透明度的兼容性](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-transparency)：不能将这一媒体查询当作所有浏览器的唯一回退。

## 2026-10-05/06 实施进展

上述“已核对状态”保留规划时的历史快照。A/B/D已通过PR #11/#12/#13上线，原8篇正文与URL保持，统一verify97项、健康目标23项。C完成12次基线与12次预载候选复测；PR #14候选无稳定收益，已通过PR #15撤销（source 6633ce5 / Pages 37358442751成功），仅保留报告和原22px玻璃。详见 [性能记录](../../maintenance/performance.md) 与总清单；最后无障碍/打印/Safari深色检查待Mac解锁后继续，不声明第三阶段全部完成。
