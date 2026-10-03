# 网站健康检查

巡检和 Pages 发布独立。`npm run verify` 离线验证源码与生成网站；`npm run check:health` 访问已经上线的网站。外部故障不阻断文章发布。

## 检查与结果

Node HTTP/HTTPS 标准库负责网络和 TLS，复用已有 linkedom 和 Memos 解析函数，没有新增依赖。检查基线内 8 篇文章和 7 个栏目、搜索 XML、个人 CSS/JS、4 条跳转以及 Cloudflare、GitHub 源站证书和公开 Memos API，共 25 项。

页面核对标题和站点标识，以及 Fluid 实际输出的 `og:url`（存在 canonical 时优先使用）；目录的 `index.html` 归一后必须与所请求页面相符。搜索检查 XML 类型和闭合的搜索/记录标记；API 检查 JSON 类型与已测试的结构，绝不保存正文。跳转最多 5 次，核对正式域名、路径和查询参数。

源站请求直连 `185.199.108.153`，SNI/Host 保持 `www.kisara.com.cn`，启用 Node 默认证书链和主机名校验，不使用 HTTP 代理、不关闭验证。正常域名请求另外检查 Cloudflare 边缘证书。证书剩余少于 21 天返回 `CERT_EXPIRING`；过期、主机名错误、连接失败分别归类。

每项 10 秒总超时，失败重试一次，最多 4 并发，响应最大 2 MiB。结果保存到已忽略的 `.cache/website-health.json`，不进入生成网站或源码；Actions artifact 留存 7 天，只含地址、稳定代码、HTTP 状态、检查时间及证书到期日。

| CLI 退出码 | 意义 |
| --- | --- |
| 0 | 所有项目通过 |
| 1 | 有有效报告，但存在故障或证书告警 |
| 2 | 参数或执行错误，无法生成有效报告 |

## GitHub 运行与异常记录

在 Actions → **Website health** → Run workflow，选择默认 `source` 分支。工作流执行完成且有效故障已记录时仍是绿色；真正的站点状态在检查摘要和健康 Issue 中。脚本错误、报告缺失或写入 GitHub 失败会使工作流失败。

check job 只有 `contents: read`；report job 通过 artifact 取报告，单独使用 `contents: read`、`actions: read`、`issues: write`。没有 Pages/OIDC 写权限，不从 PR 运行通知。固定 Node 和 Actions SHA，job 限时 10 分钟，concurrency 防止并发写入。

Issue 标题为“网站健康检查异常”，正文有 `<!-- website-health:v1 -->`。首次异常创建一个记录；对检查 ID 与稳定 code 排序比较，相同故障不写，变化时评论并更新，全部恢复时评论并关闭，复发时重开同一个记录。人工关闭但故障持续时也会重开。评论先写入带事件标记的记录，再更新状态；若更新失败，重跑会识别已写评论，避免重复。

通知由该 Issue 的订阅和现有账户偏好决定。可在 Issue 点击 Subscribe 关注；本工作流不修改全局通知设置。参见 [GitHub 通知说明](https://docs.github.com/en/subscriptions-and-notifications/concepts/about-notifications)。

## 调度和停止

已完成两次正式手动运行验收，启用每天北京时间 11:17（UTC 03:17，cron `17 3 * * *`）。首次定时运行需有实际 run 才能验收，不能用手动运行替代。调度可能延迟；公开仓库 60 天不活跃可能自动停用，参见 [官方调度说明](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)。这属于每日巡检。

需要停止时在 Actions → Website health → 菜单 → Disable workflow；重新启用使用 Enable workflow。只暂停定时可从 `health.yml` 删除 `schedule`，保留 `workflow_dispatch`。这些操作不影响 **Website checks and Pages**。脚本问题按源码提交 revert 后重新验证；不要手动删除健康 Issue 的机器标记。

## 实际验收记录

2026-10-03 本机真实检查 24/25 通过：全部文章、栏目、资源、跳转和两条严格 TLS 检查通过；唯一失败是 Memos API 的 `HTTP_404`。[PR #7](https://github.com/kisara174/kisara174.github.io/pull/7) 已合并，[Pages 部署](https://github.com/kisara174/kisara174.github.io/actions/runs/37114485054) 成功。

正式 [首次手动巡检](https://github.com/kisara174/kisara174.github.io/actions/runs/37114532091) 成功，报告 24/25 健康，创建 [健康 Issue #8](https://github.com/kisara174/kisara174.github.io/issues/8)；[第二次巡检](https://github.com/kisara174/kisara174.github.io/actions/runs/37114598105) 同样成功，report 输出 `quiet`。Issue 数量仍为 1，正文、状态和 `updatedAt` 完全不变，确认没有重复写入。实际 runner 权限与上面的 job 配置相符。

每日调度在手动验收之后启用；首个定时运行尚未发生，预期下一次为 2026-10-04 北京时间 11:17 附近，须以实际 run 为准。Memos 恢复仍待原服务或备份信息；绿色工作流不代表 Memos 已恢复。
