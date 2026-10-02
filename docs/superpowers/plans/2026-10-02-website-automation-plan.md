# Kisara 网站自动化与精简 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: 使用 executing-plans 按任务推进。主代理负责规划、技术判断、调试和验收；执行器只能在用户现有 AGENTS.md 的路由与资格规则允许时处理机械子任务。用户已授权实施，当前按验证证据更新状态。

**Goal:** 在保留文章与核心功能的前提下，实现 Mac/Linux 维护源码、GitHub Actions 自动检查构建并直接部署 Pages，清除三类装饰效果和无用依赖，建立清晰的维护及回退入口。

**Architecture:** 保留 source 为唯一日常源码入口，CI 生成 public 并通过 Pages artifact 发布；旧 main 在迁移中保留。主题、个人资产与维护检查分开，PR 只验证、正式源码提交才发布。

**Tech Stack:** Hexo 8.1.1、Fluid 1.9.8 起点、Node 24 LTS、npm、GitHub Actions/Pages、Node 内置测试运行器、现有 Giscus 和 Memos。

**Spec:** [2026-10-02-website-automation-design.md](../specs/2026-10-02-website-automation-design.md)

## Global Constraints

- 项目根目录：`/Users/kisara/Documents/ChatGPT/个人网站/kisara174.github.io`。本文任务中的相对路径均以此为根。
- 8 篇文章现有 pathname 保持不变；不批量改日期、重命名文章或重建评论关联。
- 正式 URL：`https://www.kisara.com.cn`；保留 `kisara.com.cn` 访问和现有跳转。原计划不改 DNS；用户已追加授权必要的 Cloudflare DNS/HTTPS 修复，范围见任务 10。
- 明确使用 `Asia/Shanghai`；updated 未提供时使用发布日期，不依赖 CI 文件 mtime。
- 用户已选择移除音乐、Live2D、点击文字；保留公式、搜索、归档、标签、Giscus、Memos 和现有栏目路由。
- 默认沿用 npm/package-lock；本机和 CI 计划固定 Node 24.21.0 LTS，实施时先验证兼容性。
- 不删远端 main 或 Git 历史；先验证 CI，再切换发布来源，再清除旧部署插件。
- 主题的 13 个文本差异先逐项审核，迁移成功后才移除本地 Fluid 副本。
- AI 摘要/标签仅后续建议，不是本项目必需交付。
- 用户已于 2026-10-02 授权实施本计划并追加液态玻璃视觉要求；勾选仅基于实际验证证据。

---

## 总清单与依赖

| 任务 | 产出 | 前置 | 完成状态 |
|---|---|---|---|
| 1 | 基线与可回退起点 | 无 | 已验证 |
| 2 | 简洁页面和一致的本机环境 | 1 | 已验证 |
| 3 | 只检查、构建的 CI | 2 | 已验证 |
| 4 | 验证后的自动发布切换 | 3 | 已上线，源站证书待恢复 |
| 5 | 主题依赖和配置精简 | 4 | 已验证 |
| 6 | 内容质量检查 | 5 | 已验证 |
| 7 | 稳定、安全的 Memos 展示 | 5 | 客户端已验证，服务 404 |
| 8 | 维护文档和完整验收 | 6、7、9 | 发布已验收，外部待办已记录 |
| 10 | Cloudflare DNS / HTTPS 修复 | 4 | 待 Cloudflare 登录后检查 |

任务 6 与 7 功能独立，但当前默认由主代理顺序执行。

## Task 1：建立基线和回退记录

**Files:** 创建 `docs/maintenance/baseline.md`；执行时选用合适的隔离工作副本，不在 main 产物分支实现。

**Interfaces:** 输入当前 source/main 提交、Pages 配置和生成目录；输出 8 篇文章实际路由、核心功能检查表、旧发布配置。

- [x] 刷新 Git 分支、提交与工作区状态；已有改动保留，记录源码与发布提交。
- [x] 记录 Pages build_type、branch/path、cname、HTTPS；记录默认分支。仅只读查询。
- [x] 从实际 Hexo 生成结果记录 8 个文章路径；建立首页、文章、归档、标签、分类、友链、Memos 和 404 的检查表。
- [x] 浏览器核对一篇生活文章和两篇复杂公式文章、搜索、评论、Memos；记录现有问题，不将它们误判为后续回归。
- [x] 将恢复 Pages 为 main `/` 的步骤及基线提交写入 baseline.md。

**Validation:**

```sh
git status --short --branch
git log -1 origin/source
git log -1 origin/main
gh api repos/kisara174/kisara174.github.io/pages --jq '{build_type,source,cname,https_enforced}'
npm run build
```

验收：记录来自当前输出；8 个实际文章路径齐全；可回退的 main 提交仍存在。检查记录只包含必要元数据，不保存账户凭据或评论个人数据。

## Task 2：移除装饰效果，统一本机环境

**Files:** 修改 `package.json`、`package-lock.json`、`_config.yml`、`_config.fluid.yml`、`.gitignore`、`themes/fluid/source/css/custom.css`；删除 `source/js/click-text.js`、`_config.landscape.yml`、`yarn.lock`；创建 `.nvmrc`。图片及非播放器 CSS 保留给任务 5。

**Interfaces:** 消费任务 1 路由基线；产出无三类装饰效果、可稳定构建的站点。旧 deploy 暂时保留。

- [x] 删除播放器 custom_html、APlayer/Meting 资源引用、播放器 CSS；保留导航栏仍需使用的样式。
- [x] 删除 Live2D 配置、hexo-helper-live2d、tororo/shizuku 两个模型依赖；清理点击文字文件和 custom_js 引用。
- [x] 删除未使用的 Landscape 依赖和空配置；统一 npm 后删除 yarn.lock，重新生成唯一 npm 锁文件。
- [x] `.nvmrc` 写入 `24.21.0`；本机切到该版本并验证。Hexo/主题不同时大版本升级。
- [x] 将 url 改为正式 URL，timezone 改为 Asia/Shanghai；使用 `updated_option: date` 作为无显式 updated 的稳定回退，验证显式 updated 仍优先。
- [x] 将 `.graphflow-cache/`、`graphflow-out/` 等本地工具产物加入合适的忽略规则，不将它们或 public/node_modules 加入提交。
- [x] clean 后重新安装、构建并对照 8 个基线路由，核对页面与元信息。

**Validation:**

```sh
node --version
npm ci
npm run clean
npm run build
rg -n 'APlayer|Meting|L2Dwidget|live2dw|click-text' public
git diff --check
```

验收：Node 版本与 .nvmrc 一致；构建退出 0；对 public 的装饰引用搜索无命中（rg 退出 1 在这里代表无匹配）；8 个文章路径不变；正式元信息不含 example.com。构建资源数量应下降，不要求仍为 61。

## Task 3：先建立不发布的 CI

**Files:** 创建 `.github/workflows/pages.yml`、`tools/check-site.mjs`；修改 `package.json`。此阶段 workflow 仅执行检查与构建。

**Interfaces:** 固定 `npm run check:site` 为 `node tools/check-site.mjs --public public`；输入 Hexo 构建后目录，成功退出 0，错误退出 1 并显示文件/路由和原因。先实现首页、8 个基线路由、搜索索引与正式 URL 的基本检查。

- [x] 用官方 checkout/setup-node 配置源码检出，setup-node 读取 .nvmrc；缓存 npm 下载数据，不缓存 public 构建结果。
- [x] 设置 PR 到 source 和 source push 的构建触发，执行 npm ci、npm run build、npm run check:site。
- [x] 添加手动触发入口；明确只允许 source 的正式重新构建，不让任意分支发布。界面上的手动入口在任务 4 将默认分支改为 source 后再核对。
- [x] CI 只读取仓库；输出安装/构建/检查结果，此阶段不设置部署 job、不切 Pages。
- [x] 推送可审阅的实现并观察真实 CI；PR 结果通过，现有网站仍由旧 main 发布。

**Validation:**

```sh
npm ci
npm run build
npm run check:site
gh run list --workflow pages.yml --limit 5
```

验收：干净 GitHub runner 构建与检查退出 0；PR 不部署；CI 通过不能仅由本机结果代替。CI 报错先定位首个失败，不扩大权限或跳过失败检查。

## Task 4：切换到 Pages artifact 自动发布

**Files:** 修改 `.github/workflows/pages.yml`、`package.json`、`package-lock.json`、`_config.yml`；更新 `docs/maintenance/baseline.md`。此任务外部设置包括默认分支、Pages 发布来源与 github-pages 环境的对应分支规则；追加的 Cloudflare 修复单列在任务 10。

**Interfaces:** build 输出 public artifact；deploy 仅在 source push 或明确的 source 人工触发后执行，依赖成功的 build/check。PR 仍只验证。

- [x] 添加官方 upload-pages-artifact/deploy-pages；部署 job 使用必要的 Pages/OIDC 权限，构建 job 维持只读。
- [x] 设置 github-pages 环境与发布任务串行顺序，确保旧提交不会在新提交后覆盖网站；检查环境允许 source。
- [ ] 在上线前呈现完整 diff、CI 结果、域名基线和回退步骤，明确这一步会更新正式网站。
- [x] 将默认分支改为 source、Pages 来源切到 GitHub Actions；正式域名仍为 www.kisara.com.cn。
- [ ] 恢复 GitHub 源站证书与强制 HTTPS；由任务 10 继续验收。
- [x] 首次部署完成后，用实际运行结果核对正式域名和根域跳转，浏览器核对核心功能和 8 个文章路径。
- [x] 部署验证成功后删除 hexo-deployer-git、旧 deploy 配置及本地 deploy npm 脚本；判断 source/CNAME 是否保留为迁移记录或删除，README 明确域名以 Pages 设置为准。
- [x] 保留旧 main，不新增产物提交；记录成功的源码提交及 Actions run。

**Validation:**

```sh
gh api repos/kisara174/kisara174.github.io --jq '.default_branch'
gh api repos/kisara174/kisara174.github.io/pages --jq '{build_type,cname,https_enforced}'
gh run list --workflow pages.yml --limit 5
curl -IL https://kisara.com.cn
curl -I https://www.kisara.com.cn/
```

验收：default_branch 为 source；Pages 为 workflow 发布；source 正常提交可部署；PR 不能部署；域名和 HTTPS 保持；旧 main 提交没有被构建流程覆盖。

**Rollback:** 首次迁移失败，恢复 Pages 发布来源 main `/`，确认原域名、HTTPS 和旧发布提交；不要为修部署而删除 main。新流程稳定后发现源码回归，则 revert 对应源码提交，经检查后重新部署；不手工改生成 HTML。

## Task 5：迁移主题资产，缩减配置

**Files:** 创建 `source/css/custom.css`、`source/img/eva.jpg`、`source/img/fluid0.png`、`docs/maintenance/theme-diff.md`；修改 `_config.fluid.yml`、`package.json`、`package-lock.json`；条件删除 `themes/fluid/` 和失去用途的 themes/.gitkeep。

**Interfaces:** 使用 npm 的固定版本 Fluid，站点资产来自 source；仍需保留的上游差异必须有用途、覆盖位置和验证记录。

- [x] 审核与官方 v1.9.8 的 13 个文本差异：README 两份、主题配置、index 模板、zh-TW、fold/note、wordcount、events、umami-view、disqus/cusdis、typed。记录每项属于个人需求、上游修复还是未使用功能。
- [x] 将个人图片、图标和移除播放器后剩下的 CSS 迁出主题目录；核对相同 URL 的输出文件，避免资产搬迁改变页面链接。
- [x] 先尝试固定正式 Fluid 版本。实际使用的行为差异通过最小覆盖保留，或选择已包含对应修复的正式版本；不能只凭 package.json 的相同版本号认定内容相同。
- [x] 把根目录覆盖配置缩减为实际差异；保留重要的开关和行为，核对数组覆盖及默认值，不能因省略配置意外开启栏目或改变评论。
- [x] 干净安装、clean、build 后浏览器核对桌面/手机导航、文章、公式、折叠内容、搜索、评论和 Memos；通过后才删除旧主题副本。
- [x] 单独提交主题迁移，便于回退；不把渲染器更换与主题迁移绑在一起。数学渲染器只有明确复现兼容问题后才单独处理。

**Validation:**

```sh
npm ci
npm run clean
npm run build
npm run check:site
git diff --check
```

验收：theme-diff 的 13 项都有明确处理结果；CSS、背景、图标和路由可访问；核心功能通过浏览器检查。若正式包无法保留必要行为，暂停目录删除并调整覆盖方案，不能以文件数量下降替代验收。

## Task 6：扩展内容质量检查

**Files:** 扩展 `tools/check-site.mjs`；创建 `tests/check-site.test.mjs` 与 `tests/fixtures/site/`；修改 `package.json`、`.github/workflows/pages.yml`。

**Interfaces:** 维持任务 3 的 CLI 和退出码。检查使用 Hexo 的实际文章元信息与路由、生成 HTML 的本地资源引用，不复制一套 permalink 算法。失败格式统一为 `文件或路由: 原因`。

- [x] 为检查器建立有意义的失败用例：空标题、无效日期、两个文章占同一路由、缺失本地图片、缺失内部链接、生成元信息中的 example.com；有效文章与主题注释中样例域名不误报。
- [x] 先运行测试确认上述故障能够被复现，再实现最小检查；缺少标签提示而不阻断，标签格式错误定位到文章。
- [x] 验证含中文/URL 编码路由、锚点链接、外部 URL、草稿/未发布文章不会被错误处理；遵守当前站点的实际链接结构。
- [x] 使用明确的 updated/date 策略，并检验两次干净构建后文章更新时间不随检出时间变化。
- [x] CI 在部署前执行 Node 内置测试与扩展检查；外链可达性作为单独诊断，不因第三方临时不可达阻断本站发布。

**Validation:**

```sh
node --test tests/check-site.test.mjs
npm run build
npm run check:site
```

验收：坏样例使 checker 退出 1 并定位问题；好样例退出 0；所有故障用例测试通过；真实站点检查通过；CI 部署依赖检查成功。

## Task 7：整理 Memos 展示与错误处理

**Files:** 修改 `source/memos/index.md`；创建 `source/js/memos.js`、`tests/memos.test.mjs`；必要样式加入 `source/css/custom.css`。

**Interfaces:** 页面保留 `/memos/` 和 `memos-list` 容器；JS 继续只读请求现有公开 API。加载中、空列表、超时/接口错误有独立提示；正文默认纯文本加换行，不执行 HTML。

- [x] 先用测试固定接口列表解析、createTime/createdTs 日期兼容、空列表和错误结果，以及正文包含 HTML 标签时仅作为文字展示。
- [x] 从 Markdown 移出逻辑；明确初始化时机，不依赖覆盖 window.onload；不重复加载或插入内容。
- [x] 使用 textContent/安全 DOM 构造内容、CSS 保留换行；请求增加有限超时和非 2xx/错误响应结构处理，不把所有错误都提示为匿名访问问题。
- [ ] 用模拟网络测试成功、空数据、超时与失败，浏览器再核对实际公开内容；不引入令牌，不读取私有内容。

**Validation:**

```sh
node --test tests/memos.test.mjs
npm run build
npm run check:site
```

验收：HTML 作为文本显示；外部服务故障时页面给出准确提示且文章阅读正常；本地与正式 Memos 页面均核对；无需为了通过构建访问 Memos 网络。

## Task 8：维护说明、依赖更新和完整验收

**Files:** 创建 `README.md`、仓库 `AGENTS.md`；修改 `.github/dependabot.yml`；更新 `docs/maintenance/baseline.md` 与本清单。

**Interfaces:** 一个编辑/预览入口、一个检查入口、一个源码发布入口；Dependabot 提供 npm 和 Actions 更新 PR，质量检查决定能否合并。

- [x] README 写清 source 分支、固定 Node/npm、npm ci、创建文章、npm run server、构建检查、推送源码后的发布，以及失败恢复。
- [x] 仓库维护规则记录 GraphFlow 上下文入口、文章路径/评论映射保护、主题覆盖位置、实际验证命令和现有执行器资格政策；避免复制大段与网站无关的说明。
- [x] Dependabot 改成每周、按合理范围汇总 npm 和 GitHub Actions；不自动合并未经验证的依赖更新。
- [x] 从干净副本完成安装、构建、检查和预览；确认 .gitignore 保护 node_modules/public/工具缓存。
- [x] 用一篇文章的正常改动完成 PR 检查 → 合并/源码提交 → 自动部署的完整路径，浏览器核对域名、核心功能、移动导航和所有基线路由。
- [ ] 对照设计文档的项目完成标准逐项验收，保留关键命令退出码、CI run 与浏览器核对结果；只有实际通过的事项才勾选。

**Validation:**

```sh
npm ci
node --test tests/check-site.test.mjs tests/memos.test.mjs
npm run clean
npm run build
npm run check:site
git diff --check
git status --short
```

验收：干净环境检查通过；正式自动发布成功；无装饰代码/依赖；文章路径和核心功能通过；回退入口明确。项目验收后再讨论 AI 摘要/标签建议，不因此拖延自动发布交付。

## 勾选规则

- 本文件的复选框代表实际实施和验收状态；计划写完不代表任务完成。
- 每个任务完成后记录提交、验证命令与实际结果，再勾选对应步骤。
- 新发现的兼容问题由主代理调整计划；不由机械执行器扩大路径、换架构或增加权限。
- 每批工作独立成可审阅的改动，回退只涉及对应批次，不把无关工作混入同一提交。

## Task 9：苹果风格液态玻璃（追加，任务 5 后、任务 8 前完成）

**Files:** `source/css/custom.css`、`_config.fluid.yml`，必要的轻量辅助脚本仅放 source/js。

**Interfaces:** 使用 Fluid 现有 DOM，保留导航、搜索、文章和移动菜单行为；浅深色使用主题已有 data-user-color-scheme 状态。

- [x] 设计浮动玻璃导航、玻璃卡片边缘与搜索浮层，正文保持较实背景。
- [x] 实现渐进增强 CSS，不加入视觉依赖库或全屏折射。
- [x] 核对浅深色、390px 手机菜单、键盘焦点、无模糊支持和减少动态/透明度回退。
- [x] 保存实际页面截图并核对文章、公式、搜索及评论没有遮挡或横向溢出。

**Validation:** 本地构建检查，以及真实浏览器桌面/390px 手机和深色交互核对。

## Task 10：Cloudflare DNS / HTTPS 修复（追加授权）

**Scope:** 用户已授权检查和修复必要的 DNS/HTTPS 设置。先读取实际配置；外部变更只涉及网站域名的解析、证书和 HTTPS 跳转。记录更新到 `docs/maintenance/baseline.md`。

- [ ] 完成 Cloudflare 登录，记录 www / 根域的实际 DNS 目标、代理状态、SSL 模式与跳转规则。
- [ ] 按 GitHub 官方域名要求修复发现的问题，恢复源站证书；具体变更依实际配置确定。
- [ ] 恢复 GitHub 强制 HTTPS，并验证 Cloudflare 到源站的加密与 HTTP 跳转；核对其他子域名的影响范围。
- [ ] 验收根域及 www 的 HTTP/HTTPS、8 篇文章路径，记录最终设置和实际结果。

**Current state:** 管理页处于登录页面，DNS 尚未变更。HTTPS 首页 200，HTTP 首页 200 且未跳转，GitHub 源站证书仍为空。

## 实施记录（2026-10-02）

- 仅构建 CI 先于部署验证：[通过记录](https://github.com/kisara174/kisara174.github.io/actions/runs/36988638954)。首次 CI 捕获 UTC 下午夜文章日期回退，通过 npm scripts 固定 TZ 修复，保留文章原始 date。
- 维护 CLI 移到 tools：Hexo 自动把 scripts 内的文件当作 CommonJS 插件加载，ESM CLI 不能放在那里。
- 为避免中途两次改正式页面，主题、玻璃、Memos 与文档先在同一 PR 验证，再一次切换 Pages；旧 main 未改。
- 30 个测试、干净 npm ci/build、8 篇文章/资源/搜索索引检查通过。新增 CLI 退出码验证后共 31 个测试。两次干净构建的文章路径和 updated 按 source 排序比较一致；显式 updated、未发布和草稿由真实 Hexo 测试覆盖。
- 浏览器验证桌面搜索、深浅色、390px 手机菜单和焦点；两篇公式文章渲染 45/40 个 MathJax 容器，无页面横向溢出；评论滚动到区域后生成 Giscus iframe。减少透明度得到实色且无模糊，减少动态的 transition 为 0.01ms。
- npm audit 修复兼容范围内的锁定依赖，当前安装检查 0 个已报告漏洞。
- Memos 原公开接口 HTTP 404，浏览器因跨源网络失败显示可重试提示；成功/空数据/超时/失败/HTML 纯文本等由测试覆盖。实际公开内容需服务恢复后核对。
- 为验收一次文章修改发布链路，仅整理介绍文章的段落和空格并显式记录 updated，不改变事实、标题、发布日期或路径。

- PR #2 已合并，首次 build/deploy 均 success；默认 source、workflow 发布、旧 main 未改。Pages 切换触发 GitHub 源站证书待签发，强制 HTTPS 暂不能恢复；已重触发一次签发，不更改 DNS，验收留此项待办。详见 baseline.md。
