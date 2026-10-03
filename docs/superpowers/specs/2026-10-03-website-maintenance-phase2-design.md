# 网站维护第二阶段设计

日期：2026-10-03（Asia/Shanghai）。状态：已批准并实施中，实际证据见计划清单。

## 目标与当前事实

目标：恢复公开碎碎念，缩短 Mac 写作操作，并让上线后的外部故障能够被发现和记录。

- 当前源码提交：`731b0bc350c8f6fe583f9ea00f10ac1abaa3d6b0`；默认源码分支 `source`，旧 `main` 是回退点。
- Hexo 8.1.1、Fluid 1.9.9、Node 24.21.0；已有 `server`、`test`、`verify`、`check:site` 和 Pages 自动发布。
- Memos 已有纯文本展示、10 条限制、8 秒超时及重试；上次公开接口验收返回 404。404 的原因尚未确定，实施时先复查，不能把接口版本变化当成已证实的原因。
- 草稿目录和模板是 Hexo 原生机制；目前没有便捷的 npm 草稿入口，`render_drafts: false`，`post_asset_folder: false`。
- HTTPS 已修复：源站证书覆盖根域和 www，强制 HTTPS 开启，Cloudflare 代理恢复，Strict 规则只覆盖网站这两个域名。

## 范围和方案

### A. Memos 恢复

先检查公开首页、现有 API 响应及浏览器跨源请求，再在必要时查看 Zeabur 的实际服务状态、部署版本和日志。按运行版本对应的官方 API 修复最小范围的问题。前端继续只读公开内容，不加入访问令牌；不把公开站点改成登录后才可读。

若服务本身未运行，先恢复同一个实例；若只有 API 路径/返回结构变化，调整调用和对应解析；若跨源访问被拒绝，只处理正式网站对应的来源。禁止把未知版本当成最新版、盲目升级或重建实例。涉及服务重建、数据库迁移、付费方案等新的操作时，先记录具体方案和影响，再解决授权范围。

### B. Mac 写作入口

保留 Markdown、原生 Hexo 草稿和现有发布链路。优先使用 npm 对原生命令的包装；只有图片整理等原生命令未覆盖的操作新增 Node CLI，放在 `tools`。

第一版入口：`draft` 创建草稿、`preview` 本机预览草稿、`publish:draft` 把指定草稿转为正式文章、`image` 导入图片。日常提交仍是 `npm run verify` 后显式 git commit/push；不把内容发布和 Git 推送混成一个命令。

模板先提供普通文章和数学笔记两种；已有 `scaffolds/post.md` 和 `scaffolds/draft.md` 继续承担标题、北京时间和标签等元信息，笔记章节使用额外模板文件。图片统一放 `source/img/posts/<文章文件名去扩展名>/`，生成可复制的 `/img/posts/...` Markdown 引用。保留现有全局资源方式，不批量迁移旧图、不改变文章 URL。

图片第一版只复制、整理和提示大小，超过 2 MiB 给出提示；不新增压缩依赖，不覆盖原文件。重名、路径越界、草稿不存在必须给出明确错误。`publish:draft` 保留已有发布日期；新建草稿时已有日期，发布时不得自动重写。

### C. 健康检查与通知

使用独立 GitHub Actions workflow，默认每天北京时间 11:17、支持手动运行。只读检查网站，不构建或部署、不改变 DNS/证书。健康检查 CLI 使用 Node HTTP/HTTPS 标准库并复用已有解析器，读取已有路径基线和 Memos 的公开配置。

检查首页、8 篇旧文章、栏目、搜索 XML、个人资源、根域/www 跳转、Cloudflare HTTPS 与直接连接 GitHub 的源站 TLS；另检查 Memos API 的状态和结构。HTTP 200 不能代替实际页面核对：HTML 应具备页面标题/站点标识，搜索应是 XML，API 应是预期 JSON。证书剩余不足 21 天形成告警，不自动触发签发。

每项超时 10 秒、失败重试一次、最多跟随 5 次跳转；并发最多 4，总 workflow 限时 10 分钟。输出去除正文和凭据的 JSON 报告及 Actions 摘要，只保存地址、状态、失败类型、证书到期日和检查时间。

通知首选仓库单个健康 Issue，标题 `网站健康检查异常`，机器标记 `<!-- website-health:v1 -->`。首次异常创建，新增/变化的异常更新，相同异常不写入，全部恢复时关闭并记录一次恢复。异常比较用检查 ID 和稳定错误代码，不用每日变化的延迟或证书剩余天数。已有 Issue 被人工关闭但异常仍在时，重开该 Issue，不创建重复记录。

检查 job 只读；通知 job 单独授予 `issues: write`，只处理默认分支的手动/定时运行，不在 PR 执行。站点异常写入报告和 Issue；工作流自身的执行状态代表检查/记录流程是否完成，脚本崩溃、报告无效或记录失败使工作流失败。README 必须解释到哪里查看站点健康状态。

用户已授权实施包括 GitHub Issue 渠道的本清单。先只上线手动入口，核对实际记录后启用调度；不改变全局通知偏好。GitHub 调度可能延迟，公开仓库长期不活跃时可能停用定时任务，因此首版属于每日巡检，不承诺实时可用性监控。

## 全局约束

- 保持 Hexo/Fluid、Node 24.21.0、Asia/Shanghai，不新增运行时依赖。
- 保留 `source` 自动 Pages 发布、旧 `main`、现有 8 篇文章路径及 Giscus pathname 映射。
- 保留正式域名、Cloudflare 网站 Strict 规则和强制 HTTPS；本轮不再调整 DNS。
- `scripts` 只放 Hexo 插件；CLI 放 `tools`，测试放 `tests`。
- 私密数据和令牌不进入前端、生成网站、报告或文档；健康通知不包含 Memos 正文。
- 构建检查不访问 Memos；外部故障不能阻断文章构建和发布。
- 每部分独立验证、独立提交；不新增 CMS、图床服务、AI 自动改写或自动发布文章。

## 验收与资料

三项独立通过：公开 Memos 实际可读；草稿与图片流程在 Mac 操作成功且旧路由保持；巡检能识别故障、恢复，并对重复异常保持安静。详细勾选清单见 [实施计划](../plans/2026-10-03-website-maintenance-phase2-plan.md)。

设计依据：[Hexo 写作与模板](https://hexo.io/docs/writing)、[Hexo 命令](https://hexo.io/docs/commands)、[资源目录](https://hexo.io/docs/asset-folders)、[Memos API](https://usememos.com/docs/api/latest)（实施时须切换到对应部署版本）、[GitHub 调度行为](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)。

实施调整：`publish:draft` 为避免 Hexo 8.1.1 前缀匹配选错文件，使用精确文件转换并保留日期；创建与预览仍复用 Hexo。Memos 原项目为空，恢复等待迁移地址或原数据库备份，不能用新建空服务代替恢复。
