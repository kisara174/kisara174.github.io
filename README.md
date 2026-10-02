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

文章在 `source/_posts/`，使用 Markdown。新文章可以运行 `npm exec hexo new "文章标题"`，填写 `title`、`date` 和 `tags`。日期统一北京时间，例如 `date: 2026-10-02 16:30:00`；修改旧文章时保留原日期和文件名，避免改变网址和评论关联。希望展示真实修订时间时显式填写 `updated`，否则使用发布日期。

```sh
npm run verify
git add source/_posts/文章标题.md
git commit -m "更新文章"
git push origin source
```

正式源码提交会触发 Actions：安装锁定依赖 → 测试 → 干净构建 → 路由/元数据/资源检查 → Pages 发布。检查失败时保留此前网站。较大改动先开 PR 到 `source`，PR 只验证。也可在 Actions 的 **Website checks and Pages** 手动运行，选择 `source` 才会发布。

## 修改位置

| 需求 | 文件 |
| --- | --- |
| 标题、域名、时区、文章链接 | `_config.yml` |
| 菜单、横幅、公式、Giscus | `_config.fluid.yml`，只写个人覆盖 |
| 液态玻璃、手机和深色样式 | `source/css/custom.css` |
| 背景和图标 | `source/img/` |
| 碎碎念页面和公开接口 | `source/memos/index.md`、`source/js/memos.js` |
| 自动检查/发布 | `.github/workflows/pages.yml` |
| 原文章路径保护 | `docs/maintenance/baseline.json` |

Fluid 固定为 npm 依赖；不修改 `node_modules`。个人样式基于渐进增强 CSS：玻璃导航、卡片、搜索和手机浮层，正文接近实色；支持深色、减少动态与减少透明度，无 backdrop-filter 时使用实色。参考 [Apple 材质指南](https://developer.apple.com/design/human-interface-guidelines/materials)，通过网页 CSS 实现相近风格。

Memos 只读现有公开服务，不使用令牌；内容按纯文本显示并保留换行。服务返回 404、网络失败或超时会显示状态和重试按钮。2026-10-02 验收时旧接口返回 404，需在 Memos 服务恢复后再次核对公开内容。

## 检查与恢复

`npm run verify` 是统一检查入口。`npm run check:site` 可单独检查已生成的 `public`：保护旧文章及栏目、标题/日期/标签、重复文章路由、本地 HTML/CSS 资源和失效内链。不以第三方外链的临时故障阻断发布。

域名和 HTTPS 由 GitHub **Settings → Pages** 管理，保持 `www.kisara.com.cn`，根域继续沿用现有跳转。`source/CNAME` 保留迁移记录；artifact 部署以 Pages 设置为准。发布采用 [GitHub 官方 Pages workflow](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)。

源码回归时 `git revert` 引入问题的源码提交，推送并等待重新部署。首次迁移出现发布问题时，在 Pages 把发布来源恢复为 **Deploy from a branch → main → / (root)**，保留域名和 HTTPS，详见 [基线与回退](docs/maintenance/baseline.md)。不要手工编辑生成 HTML。

Dependabot 每周提供 npm 和 Actions 更新 PR，兼容更新合组；先检查和预览再合并，不自动合并。迁移差异见 [主题记录](docs/maintenance/theme-diff.md)，实施验收见 [计划清单](docs/superpowers/plans/2026-10-02-website-automation-plan.md)。
