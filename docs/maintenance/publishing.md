# Mac 发布入口

先使用 README 的草稿和图片命令准备内容，明确选择 Git 暂存文件。Node 必须与 .nvmrc 一致；首次使用运行 npm ci，并安装、认证 GitHub CLI（gh auth login）。

```sh
git add -- source/_posts/文章.md source/img/posts/文章/
# 已跟踪草稿转正时，还须暂存草稿删除
npm run publish:site
npm run publish:site -- --apply --message "更新学习笔记"
npm run publish:status -- --sha "$(git rev-parse HEAD)"
```

默认只预检：展示暂存差异，fetch 核对 source 同步状态，再执行现有 verify。不会自动选择文件或提交。忽略的 public/cache 可由构建更新；未暂存跟踪文件及未跟踪构建输入会被拒绝。验证期间 HEAD、暂存树和工作树必须保持一致。只允许正式仓库的 HTTPS/SSH origin 和 source 分支；本地已有未推送提交或远端领先时，先检查 Git 状态并手动处理。

--apply 必须附非空 --message，且 gh 已认证。验证通过后仅提交暂存树，普通推送到 source，并最多等待 10 分钟；只有该 SHA 的 build 与 deploy 均成功才报告部署成功。不要在发布期间编辑或暂存其他文件。新增文章和大改动仍可通过 PR 审查，PR 部署跳过属于正常行为，不用此命令观察 PR。

停止信息显示阶段以及已产生的 SHA/run 链接：

- preflight/verify：尚未由命令提交；修正输入再跑预检。
- commit：查看 git status/log，处理提交失败的原因。
- push：新提交已保留。检查 git log -1/status，使用普通 git push origin HEAD:source，再用 publish:status 观察；不要再次创建重复提交。
- deploy：源码已推送。查看 run 失败 job，修复后以新提交发布；超时后也可用 publish:status 继续观察。它先 fetch 并验证 SHA 属于 origin/source，只观察，绝不提交或推送。

不使用自动暂存、pull/rebase/reset/force。预检缺 gh 时仍可完成本地检查，但不能继续 apply。现有 Pages workflow、域名和旧文章路由均不变。回退代码可通过实际源码提交 revert；已推送历史不会由命令自动删除。

2026-10-04 验收：[PR #11](https://github.com/kisara174/kisara174.github.io/pull/11) 的 Linux 构建通过；合并 source 为 97dbf32b066caebc790b2cf223f39fcd1ed7bb9a。[Pages run](https://github.com/kisara174/kisara174.github.io/actions/runs/37209802343) 的 build/deploy 均成功，实际运行 publish:status 确认同一 SHA。默认预检与执行由临时真实 Git 仓库测试覆盖（28项，统一75项），后续功能扩展后统一97项。

2026-10-04 真实执行：在 source 明确暂存8份维护文档后运行 publish:site 默认预检，再以 --apply --message 完成实际提交、普通推送和同SHA部署观察。产出 ebae059444bf7eb831dab8e29386cdf95a11b45f，[Pages 37212140157](https://github.com/kisara174/kisara174.github.io/actions/runs/37212140157) build/deploy 均成功；发布的是维护记录，没有测试文章。
