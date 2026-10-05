# Kisara 的个人网站

[www.kisara.com.cn](https://www.kisara.com.cn/) · Hexo + Fluid · 在 Mac/Linux 编辑 Markdown，在 GitHub 自动检查并发布。

`source` 是源码分支和默认分支。`main` 保存迁移前的生成网站作为回退点，不再日常提交 HTML。

## 本机维护

安装 Node 24.21.0（版本见 `.nvmrc`，npm 随 Node 提供）。如果使用 nvm，在仓库运行 `nvm install && nvm use`。所有 Hexo 命令固定 `Asia/Shanghai`，保证 Mac 与 Linux CI 的日期和网址一致。

```sh
git clone https://github.com/kisara174/kisara174.github.io.git
cd kisara174.github.io
git switch source
npm ci
npm run server
```

预览：[localhost:4000](http://localhost:4000/)。按 Ctrl+C 停止。

先从草稿开始写作：

```sh
npm run draft -- "数学 笔记" --template note
npm run preview
npm run image -- "数学-笔记" "/绝对路径/示意图.png"
npm run publish:draft -- "数学-笔记"
npm run verify
git add source/_posts/数学-笔记.md source/img/posts/数学-笔记/
npm run publish:site
npm run publish:site -- --apply --message "新增数学笔记"
```

`draft` 默认普通文章模板，`--template note` 加入“问题、定义与条件、推导、例题、易错点”五个空章节。标题可含中文和空格，文件名会规范为 `数学-笔记.md`；命令会输出准确路径。编辑 `source/_drafts/` 中的文件，预览仍在 [localhost:4000](http://localhost:4000/)，正式构建不会包含草稿。`server` 只预览正式文章，`preview` 包含草稿；运行其中一个即可。

`image` 复制 png/jpg/jpeg/webp/avif 到 `source/img/posts/<文章文件名>/`，输出可粘贴的 Markdown 图片引用。原图不变，同名图片不覆盖；超过 2 MiB 会提示。请使用命令输出的文章文件名，图片目录与文件名对应。

`publish:draft` 只把指定本机草稿转为正式文章，保留完整内容和原日期，拒绝覆盖现有文章。它不会提交 Git 或推送。日期统一北京时间，例如 `date: 2026-10-03 11:17:00`；修改旧文章时保留原日期和文件名，避免改变网址和评论关联。希望展示真实修订时间时显式填写 `updated`，否则使用发布日期。图片和文章须一起提交。

先明确暂存文章、图片和已跟踪草稿的删除，再运行 `publish:site` 预检；通过后用 `--apply --message` 提交并推送。命令会拒绝未暂存的跟踪文件及未跟踪的构建输入，核对验证前后的 HEAD/暂存树，并按新 SHA 观察 build/deploy。详细用法及失败恢复见 [发布入口](docs/maintenance/publishing.md)。

正式源码提交会触发 Actions：安装锁定依赖 → 测试 → 干净构建 → 路由/元数据/资源检查 → Pages 发布。检查失败时保留此前网站。较大改动先开 PR 到 `source`，PR 只验证。也可在 Actions 的 **Website checks and Pages** 手动运行，选择 `source` 才会发布。

## 修改位置

| 需求 | 文件 |
| --- | --- |
| 学习系列导航 | `source/series/index.md`、`_config.fluid.yml` |
| 标题、域名、时区、文章链接 | `_config.yml` |
| 菜单、横幅、公式、Giscus | `_config.fluid.yml`，只写个人覆盖 |
| 液态玻璃、手机和深色样式 | `source/css/custom.css` |
| 背景和图标 | `source/img/` |
| 草稿、笔记模板与图片入口 | `tools/writing.mjs`、`scaffolds/`、`tools/templates/note.md` |
| 上线后的独立巡检 | `.github/workflows/health.yml`、`tools/check-health.mjs` |
| 自动检查/发布 | `.github/workflows/pages.yml` |
| 原文章路径保护 | `docs/maintenance/baseline.json` |

Fluid 固定为 npm 依赖；不修改 `node_modules`。个人样式基于渐进增强 CSS：玻璃导航、卡片、搜索和手机浮层，正文接近实色；支持深色、减少动态与减少透明度，无 backdrop-filter 时使用实色。参考 [Apple 材质指南](https://developer.apple.com/design/human-interface-guidelines/materials)，通过网页 CSS 实现相近风格。

2026-10-04 按个人维护取舍取消 Memos：菜单、页面、脚本和相关巡检项已移除，旧 `/memos/` 地址进入网站 404 页面。取消记录见 [维护记录](docs/maintenance/memos.md)。

## 检查与恢复

读者可从 [系列导航](https://www.kisara.com.cn/series/) 按主题阅读笔记，维护方式见 [内容导航](docs/maintenance/content.md)。

读者可用页脚 [RSS](https://www.kisara.com.cn/rss.xml) 订阅文章摘要。站点地图、robots 和分享元信息随构建自动更新，维护方式见 [订阅与搜索发现](docs/maintenance/discovery.md)。

`npm run verify` 是统一检查入口。`npm run check:site` 可单独检查已生成的 `public`：保护旧文章及栏目、标题/日期/标签、重复文章路由、本地 HTML/CSS 资源和失效内链。不以第三方外链的临时故障阻断发布。

GitHub **Settings → Pages** 管理正式域名和源站证书，Cloudflare 管理 DNS、代理和边缘 HTTPS。保持 `www.kisara.com.cn`，根域继续跳转到正式地址。`source/CNAME` 保留迁移记录；artifact 部署以 Pages 设置为准。发布采用 [GitHub 官方 Pages workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

2026-10-03 已恢复 GitHub 源站证书和强制 HTTPS。Cloudflare 的根域与 `www` 保持代理，配置规则 **GitHub Pages strict TLS** 仅对这两个域名启用 Strict；其他子域名的设置保留。HTTP 自动跳转到 HTTPS，8 篇原文章及栏目、搜索和个人资源均验证通过。最终设置、证书检查和恢复步骤见 [基线与恢复](docs/maintenance/baseline.md)。

源码回归时 `git revert` 引入问题的源码提交，推送并等待重新部署。首次迁移出现发布问题时，在 Pages 把发布来源恢复为 **Deploy from a branch → main → / (root)**，保留域名和 HTTPS，详见 [基线与回退](docs/maintenance/baseline.md)。不要手工编辑生成 HTML。

Dependabot 每周提供 npm 和 Actions 更新 PR，兼容更新合组；先检查和预览再合并，不自动合并。迁移差异见 [主题记录](docs/maintenance/theme-diff.md)，实施验收见 [计划清单](docs/superpowers/plans/2026-10-02-website-automation-plan.md)。

## 上线后的巡检

`npm run check:health` 独立检查真实网站的 23 项路径、资源、跳转和 Cloudflare/源站证书，报告在忽略的 `.cache/website-health.json`。它不属于 `verify`，外部服务故障不会阻断写文章。

Actions 的 **Website health** 每天北京时间 11:17 巡检，也支持手动运行。异常记录使用同一个标题为“网站健康检查异常”的 Issue：首次异常创建，变化或恢复时评论并更新，恢复后关闭；相同故障保持安静。工作流成功表示检查和记录完成，站点是否健康请看摘要和 Issue。关注该 Issue 可按已有 GitHub 通知偏好接收变化；工作流不修改账户设置。调度、退出代码和停用方法见 [健康检查维护](docs/maintenance/health.md)。

第二阶段的完成项与待办见 [维护计划](docs/superpowers/plans/2026-10-03-website-maintenance-phase2-plan.md)。当前依赖审计及上游未修复问题见 [依赖状态](docs/maintenance/dependencies.md)。

第三阶段已交付 Mac统一发布入口、RSS/SEO与系列导航；性能测量发现预载候选没有稳定收益，已决定撤销，详细条件与结果见 [性能记录](docs/maintenance/performance.md)。剩余视觉验收以 [第三阶段清单](docs/superpowers/plans/2026-10-04-website-phase3-plan.md) 的实际状态为准。
