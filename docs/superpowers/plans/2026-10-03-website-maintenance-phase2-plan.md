# 网站维护第二阶段实施计划

> **For agentic workers:** 使用 executing-plans 按任务推进。主代理负责判断、诊断和验收；遵循仓库 AGENTS.md 的执行器资格规则。步骤使用复选框跟踪，实际验证后再勾选。

**Goal（2026-10-04 调整）:** 完善 Mac 草稿与图片流程，建立独立、只在健康状态变化时记录异常的每日巡检；用户已取消 Memos 功能，原恢复任务撤销。

**Architecture:** 复用现有 Hexo 草稿、模板、验证和 Pages 发布。健康检查独立于构建，使用 Node 标准库、已有解析器和 GitHub Actions；已撤销 Memos 相关页面和外部服务检查。

**Tech Stack:** Hexo 8.1.1、Fluid 1.9.9、Node 24.21.0、npm、GitHub Actions。

**Spec:** [第二阶段设计](../specs/2026-10-03-website-maintenance-phase2-design.md)。状态：实施中；用户已授权按清单实施。写作工具与巡检已发布；2026-10-04 用户取消 Memos，恢复任务撤销，首次定时运行仍待观察。

## Global Constraints

- 保持 Hexo/Fluid、Node 24.21.0、Asia/Shanghai，不新增运行时依赖。
- 保留 `source` 自动 Pages 发布、旧 `main`、现有 8 篇文章路径及 Giscus pathname 映射。
- 保留正式域名、Cloudflare 网站 Strict 规则和强制 HTTPS；本轮不再调整 DNS。
- `scripts` 只放 Hexo 插件；CLI 放 `tools`，测试放 `tests`。
- 私密数据和令牌不进入前端、生成网站、报告或文档；健康通知不包含页面正文。
- 构建检查不访问外部服务；外部故障不能阻断文章构建和发布。
- 每部分独立验证、独立提交；不新增 CMS、图床服务、AI 自动改写或自动发布文章。

## 计划清单总览

| 顺序 | 交付 | 完成标准 | 状态 |
| --- | --- | --- | --- |
| 1 | Memos 定位与恢复 | 正式页面可读取公开内容，故障提示准确 | 已取消（2026-10-04） |
| 2 | Mac 草稿、模板与图片入口 | 创建、预览、插图、转正式文章流程可用 | 本机验收通过 |
| 3 | 独立健康检查 CLI | 可识别路径、资源、跳转及源站证书故障 | 本机 22/22 通过，待本次正式验收 |
| 4 | 每日巡检与去重通知 | 手动/定时可运行，异常变化与恢复可记录 | 两次手动验收通过，启用每日调度；首次定时待观察 |
| 5 | 端到端验收与维护说明 | Mac 使用步骤、运行证据、恢复入口完整 | 已正式发布；Memos 已取消，首次定时待观察 |

写作入口与每日巡检已实施；本次完成 Memos 移除及发布验收，首次定时运行继续以实际记录为准。

## Task 1：诊断并恢复公开 Memos（已取消）

2026-10-04 用户取消此功能及恢复待办。以下步骤是原计划的历史记录，不再执行；无需再提供迁移地址或数据库备份。

**Files:** 修改 `source/js/memos.js`、`tests/memos.test.mjs`、`source/memos/index.md`；记录到 `docs/maintenance/memos.md`，更新 README 和旧计划中的服务待办。

**Interfaces:** 页面继续使用 `#memos-list`；保留 `parseMemos(data)`、`memoDate(item)`、`renderMemos(container, items)`，将调用接口扩展为 `loadMemos({endpoint, fetchImpl, timeoutMs})`，`endpoint` 必填。输出最多 10 条纯文本公开记录。最终公开端点只保存一份：页面 `data-memos-endpoint`；挂载时读取该属性传给 `loadMemos`，巡检读取同一属性，不再硬编码第二份 URL。

- [x] 重新检查公开首页和现有 API，记录状态、Content-Type、跨源响应头及错误类型；不保存正文或账户数据。
- [x] 根据实际响应确定检查分支：首页也不可达→检查同一个 Zeabur 服务；首页可达而 API 404→核对部署版本和路径；API curl 可读但浏览器失败→检查对应来源的 CORS；401/403→核对是否公开可读。
- [x] 必要时在现有账户中只读查看服务版本、启动状态及首个错误；记录具体原因后再确定最小修改，不盲目升级、重建或迁移数据库。
- [ ] 对照运行版本的官方 API 处理确认的问题；若改前端，先补充真实结构的失败测试，再做最小适配。若只改外部服务，保留客户端实现。
- [x] 将最终公开端点集中到页面 `data-memos-endpoint`，更新挂载传参和现有测试；核对仅展示公开记录、纯文本、北京时间、最多 10 条，空列表、超时、HTTP 错误和重试继续可用。
- [ ] 正式页面实际读取公开内容后再移除“服务 404”待办，独立提交代码和维护记录。

**Validation:**

```sh
curl --max-time 20 -I https://memos.kisara.com.cn/
curl --max-time 20 -D - -o /dev/null \
  -H 'Origin: https://www.kisara.com.cn' \
  'https://memos.kisara.com.cn/api/v1/memos?pageSize=10'
node --test tests/memos.test.mjs
npm run verify
git diff --check
```

curl 使用原端点进行诊断；若实际版本要求新端点，同步更新本清单的复查命令和唯一配置。浏览器打开正式 `/memos/`，确认实际公开记录和一次重新加载；离线时有准确提示，文章页面仍可读。

**Acceptance:** HTTP 成功、响应结构测试和浏览器成功缺一不可。暂时空列表须与服务中确实没有公开记录一致，不能把加载失败当成空数据。

## Task 2：完善 Mac 写作入口

**Files:** 修改 `package.json`、`scaffolds/draft.md`、`scaffolds/post.md`、README；新增 `tools/writing.mjs`、`tools/templates/note.md`、`tests/writing.test.mjs`。图片仅写入新文章的 `source/img/posts/` 子目录，不批量修改已有文章和资源。

**Interfaces:**

```sh
npm run draft -- "文章标题"
npm run draft -- "数学笔记" --template note
npm run preview
npm run image -- "数学笔记" "/绝对路径/示意图.png"
npm run publish:draft -- "数学笔记"
npm run verify
```

`draft` 调用 `node tools/writing.mjs draft`，默认普通模板，可选 `--template note`；调用原生 Hexo 创建草稿后补充笔记章节。`preview` 固定 `TZ=Asia/Shanghai`、`hexo server --draft --ip 127.0.0.1`。`image` 调用同一个 CLI 的 `image` 子命令，复制图片并输出引用。`publish:draft` 调用 `node tools/writing.mjs publish`，精确移动指定 Markdown 文件，只转换本机草稿，不执行 Git 或部署。所有 Hexo 子进程使用 argv 数组、`shell: false`，继承现有项目根目录。

- [x] 先在临时目录测试中文/空格标题、同名冲突、错误模板和不存在草稿；操作失败不得留下半成品或修改旧文章。
- [x] 包装原生草稿创建：默认填标题、北京时间、空 tags；保留 `render_drafts: false`。数学模板提供“问题 / 定义与条件 / 推导 / 例题 / 易错点”五个章节，不生成内容。
- [x] 增加本机草稿预览入口；普通正式构建仍不包含草稿。
- [x] 图片导入使用文件名去扩展名确定文章目录，接受 png/jpg/jpeg/webp/avif；路径编码后生成 Markdown 引用。拒绝覆盖同名图片和目录越界；超过 2 MiB 提示大小，保留原图。
- [x] `publish:draft` 核对草稿存在及目标文章未存在，转换时保留原有 date/title；处理中文名，不执行 Git 提交、推送或隐式更新旧文章日期。
- [x] 使用临时 Hexo 实例完成一篇数学草稿、图片和转换测试；核对预览包含草稿、正式构建不含草稿、转换后包含文章，图片引用有效。
- [x] 写清 Mac 创建→预览→图片→转换→verify→显式提交/推送步骤，独立提交。

**Validation:**

```sh
node --test tests/writing.test.mjs
npm run verify
git diff --check
```

测试须使用系统临时目录并在结束后清理，不能把验收文章发布到正式网站。Mac 实际预览检查插图、公式和草稿；Linux runner 重跑临时 Hexo 测试。验收不能只比较模板字符串，须核对生成 HTML、manifest 和图片路径。

**Acceptance:** 四个新增入口和现有 verify 行为明确；草稿不泄露到正式构建；旧 8 篇文章路径不变；标题和文件名含空格/中文可用；CLI 不覆盖内容。

## Task 3：实现独立健康检查

**Files:** 新增 `tools/check-health.mjs`、`tests/check-health.test.mjs`；修改 `package.json`，复用 `.gitignore` 中已有 `.cache` 规则；复用 `docs/maintenance/baseline.json` 和 Memos 页面公开端点，不改变 `tools/check-site.mjs` 的离线职责。

**Interfaces:** `npm run check:health` 执行 `node tools/check-health.mjs --output .cache/website-health.json`。报告格式为 `{schemaVersion:1, checkedAt, checks:[{id,url,status,code,httpStatus?,expiresAt?}]}`；`status` 为 `pass|fail|warn`。完成但存在 fail/warn 时 CLI 退出 1，全部通过退出 0，参数错误/无法生成有效报告退出 2。

- [x] 先用本地 HTTP fixture 测试 200 内容正确/错误、HTML 假 API、XML 搜索、404、超时、一次重试、跳转保留路径/查询和循环上限。
- [x] 从基线读取 8 篇文章和栏目，加搜索 XML、个人 CSS/JS；检查预期格式或页面标识，不能只看状态码。
- [x] 检查根域/www 的 HTTP、HTTPS 收敛到正式域名；最多 5 跳，校验 `/archives/?utm_source=health-check` 的跳转保留参数。
- [x] 直接连接 GitHub Pages 源站地址，用 `www.kisara.com.cn` 作为 SNI 和 Host，保留证书链/主机名校验；使用 Node HTTPS 的连接 lookup，不使用本机 HTTP 代理、不关闭证书校验。另正常连接 Cloudflare 域名，两条路径分别报告。
- [x] 检查证书有效期，少于 21 天返回稳定代码 `CERT_EXPIRING`；过期、域名不匹配、连接失败分别归类。时间和传输函数可注入，以 fixture 测试而非连接外网测试。
- [x] 读取唯一公开 Memos 端点，检查状态和 JSON 结构，不存储记录正文；没有公开内容是合法空数据，不等于服务故障。
- [x] 每项 10 秒超时、失败重试一次、最多 4 并发；写报告及人可读摘要。`.cache` 已忽略，确认报告不进入网站或提交。
- [x] 手动跑真实站点，对每项输出归类；预期失败如 Memos 尚未恢复须保留为 fail，不能跳过后声称全部健康。

**Validation:**

```sh
node --test tests/check-health.test.mjs
npm run check:health
npm run verify
git diff --check
```

**Acceptance:** fixture 覆盖 TLS 到期/错误与跳转循环；真实输出分别说明源站、Cloudflare、文章和 API 状态。`npm run verify` 不调用外网巡检，单独的故障不影响文章构建。

## Task 4：接入每日巡检与状态变化通知

**Files:** 新增 `.github/workflows/health.yml`、`tools/report-health.mjs`、`tests/report-health.test.mjs`、`docs/maintenance/health.md`；修改 README。现有 Pages 发布 workflow 保持职责不变。

**Interfaces:** check job 生成 Task 3 的报告、Actions 摘要和 7 天留存 artifact；report job 读取报告，通过原生 `GITHUB_TOKEN` 操作唯一健康 Issue。Issue 标题 `网站健康检查异常`，机器标记 `<!-- website-health:v1 -->`，正文只列检查 ID、稳定错误代码、URL、时间和 run 链接。只在正式默认分支执行通知。

- [x] 用户已授权实施含 GitHub Issue 渠道的本清单；正式配置先手动验收，之后再启用定时，不制造测试 Issue。
- [x] 先用假 GitHub API 测试：首次异常创建、相同异常不写、新异常更新、全部恢复关闭、已人工关闭的持续异常重开；正常且没有历史问题不创建记录。
- [x] 通知比较只使用排序后的检查 ID+code，不将延迟、每日剩余证书天数和正文作为变化。Issue 内保存机器可读失败集；处理 API 失败须可见，不伪装成功。
- [x] 独立 workflow 先仅 `workflow_dispatch`；固定现有 Node，Actions 固定经核对的 SHA；job 超时 10 分钟，concurrency 防止两个运行同时更新同一记录。
- [x] check job 仅 `contents: read`；report job 单独 `issues: write`，通过 artifact 取报告且使用 `actions: read`。不给 Pages/OIDC 写权限、不从 PR 运行通知、不改变账户全局通知偏好。
- [x] CLI 退出 1 时仍发布有效报告并完成异常记录；退出 2、报告缺失/无效或 GitHub 写入失败使 workflow 失败。摘要清楚区分“巡检执行完成”和“网站存在异常”。
- [x] 单元测试确认去重/恢复后，手动跑正式配置；不制造真实站点故障，模拟异常只进入假 API 测试。核对实际报告、权限和摘要。
- [x] 两次手动验收通过后添加每日北京时间 11:17 调度（UTC 03:17）；README 写清查看 Issue、关闭调度及重新启用的方法。
- [ ] 观察并记录首个定时 run，确认 schedule 事件与报告正常；下一次预期 2026-10-04 北京时间 11:17 附近。

**Validation:**

```sh
node --test tests/report-health.test.mjs
gh workflow run health.yml --ref source
gh run list --workflow health.yml --branch source --limit 5
gh issue list --state all --search '网站健康检查异常 in:title'
```

前两个 GitHub 命令仅在 workflow 已审阅并上线后执行。异常消息去重用假 API 验证，不向真实仓库注入测试故障或重复评论。

**Acceptance:** 手动运行通过且首个定时运行有实际证据；相同故障不反复写入，恢复有一次记录。依据 [GitHub 调度说明](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)，文档注明调度可能延迟、公开仓库 60 天不活跃可能停用；不把每日巡检描述成实时监控。

## Task 5：端到端验收与交付

**Files:** 更新 README、本清单及对应 `docs/maintenance/memos.md`、`docs/maintenance/health.md`；只更新实际验证过的记录。

- [x] 在 Mac 按文档完成临时草稿/图片/预览/转换，不发布验收文章。
- [x] `npm run verify` 全部通过，CI 正常构建并部署；旧路由检查通过，浏览器复查公式、搜索和移动导航；Giscus 配置与生成脚本保留，未发布测试评论。
- [ ] 源站和 Cloudflare 严格 HTTPS 及取消 Memos 后的 22 项巡检通过；Memos 公开可读验收已随功能取消。
- [ ] 记录各部分提交、测试结果、正式部署 run、手动巡检 run 和首个定时 run。无法观察的事项保持未勾选。
- [x] 记录回退：源码问题 revert 对应提交；巡检问题禁用独立 health workflow，不动 Pages 发布；Memos 外部服务改动保存修改前配置及恢复步骤。
- [x] 最后复查 Git 状态与文档链接，更新 GraphFlow 索引，交付可复用维护流程。

## 后续候选

AI 摘要和标签建议放在上述三个交付稳定之后，独立设计、由用户确认后写入文章；不纳入本阶段完成标准。

## 2026-10-03 实施证据与调整

- Memos：首页/API/原 Zeabur 地址均为 404，原项目没有服务且显示共享集群退役提示。已询问迁移地址或数据库备份；未重建服务、迁移数据或更改 DNS。详见 [诊断](../../maintenance/memos.md)。
- `npm run verify`：57/57 测试通过，干净构建 48 个资源，8 篇原文章检查无错误。临时真实 Hexo 测试验证日期/路径、草稿隐藏、图片和精确转换。
- Mac 在仓库外临时实例使用普通 npm 入口，Computer Use 读取 Edge：数学草稿、5 个笔记章节、插图、MathJax 积分及玻璃导航可见；随后转换并构建成功。临时验收内容不提交或发布。
- 真实巡检：24/25 通过，唯一异常 `memos-api:HTTP_404`。HTTP 200 页面用 Fluid 实际 `og:url` 校验地址，兼容目录 `index.html`；错误首页不能冒充文章。
- 精确转换调整：Hexo 8.1.1 `post.publish` 使用前缀正则查找，可能把 `foo-more` 当作请求的 `foo`。为满足“指定文件、保留日期、不覆盖”，CLI 使用排他复制并移除原草稿；测试证明前缀相似文件不被修改。创建和预览仍调用原生 Hexo。
- 健康检查的网络/TLS 使用标准库，HTML/Memos 复用仓库已有解析器；没有新增依赖。Issue 变化时有去重评论，状态更新失败后的重跑也不重复评论。
- 当前 npm audit 有 7 个 high 传播条目，来自一个尚无补丁的 braces advisory；未强制降级 Hexo。详见 [依赖状态](../../maintenance/dependencies.md)。
- GitHub PR、CI、实际手动巡检与首个定时 run 在观察后补充；不能把本机验收或手动运行当作首次定时运行。

独立实现提交：Memos 配置与诊断 `38dc1eb`；Mac 写作入口 `7d67220`；健康检查与手动工作流 `258e2b2`；[PR #7](https://github.com/kisara174/kisara174.github.io/pull/7) 已合并。

正式证据：

- [PR CI](https://github.com/kisara174/kisara174.github.io/actions/runs/37114416828)：Linux runner 57/57 测试、8 篇原路径检查通过；PR 不执行 Pages deploy。
- [部署](https://github.com/kisara174/kisara174.github.io/actions/runs/37114485054)：build/deploy 均成功，源码合并提交 `b7cc510`。正式页面已包含唯一 Memos 端点，浏览器故障提示和重试可用；GitHub Pages 证书 approved、强制 HTTPS true。
- [巡检一](https://github.com/kisara174/kisara174.github.io/actions/runs/37114532091)：25 项中 24 项健康，记录真实 Memos 404 至 [Issue #8](https://github.com/kisara174/kisara174.github.io/issues/8)，check/report 均成功。
- [巡检二](https://github.com/kisara174/kisara174.github.io/actions/runs/37114598105)：相同结果，report 为 quiet，Issue 正文、状态、数量与更新时间不变。
- 没有原 Memos 服务可重启；未恢复公开记录。首次定时巡检尚未发生，相关复选框保留未勾选。

收尾记录：

- [PR #9](https://github.com/kisara174/kisara174.github.io/pull/9) 已合并，每日 cron `17 3 * * *` 在默认 `source` 分支生效，健康 workflow 状态为 active。[调度提交的部署](https://github.com/kisara174/kisara174.github.io/actions/runs/37114810692) build/deploy 成功，Linux 再次通过 57 项测试与 8 篇原路径检查。
- Edge 正式页面复查 MathJax、中文“傅里叶”搜索结果和 400px 视口的展开/收起移动导航；玻璃界面仍正常。Giscus 的 repo、category、pathname 映射和生成调用未修改，不发布测试评论。
- 本机 `source` 与远端同步，旧 `main` 保留 `9862527`；仅清理本次创建的系统临时预览实例，已有 worktree 和忽略的备份均保留。文档相对链接、Git 空工作区及 GraphFlow 索引已检查。
- 本条是 2026-10-03 的待办状态；2026-10-04 Memos 内容恢复已取消，首次 schedule 运行仍待观察。

## 2026-10-04 范围调整

用户取消 Memos。删除网站入口、页面、JS、专用 CSS 和测试，移除路径基线及健康检查中的对应页面/JS/API。8 篇原文章、液态玻璃、写作工具、Giscus、HTTPS 和巡检调度继续保留。当前健康检查共 22 项。旧 Memos 异常按取消功能结案，不宣称服务恢复；首次定时运行仍需实际证据。
