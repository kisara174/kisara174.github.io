# Memos 取消记录

2026-10-04，网站所有者决定取消 Memos 功能。

已移除导航入口、`source/memos/index.md`、`source/js/memos.js`、专用样式和测试。路径基线不再要求 `/memos/`，巡检不再请求该页面、脚本或 API，检查项从 25 项减为 22 项。旧 `/memos/` 地址按 GitHub Pages 的正常行为返回网站 404 页面。

之前“恢复原服务”和“寻找迁移地址或数据库备份”的待办已撤销。2026-10-03 的诊断仍作为历史：公开首页、API 和原 Zeabur 地址返回 404，原项目没有服务。功能取消不表示外部服务已恢复。

[PR #10](https://github.com/kisara174/kisara174.github.io/pull/10) 已合并并上线；旧页面及脚本地址实测为 HTTP 404。[健康 Issue #8](https://github.com/kisara174/kisara174.github.io/issues/8) 按“功能取消”关闭，随后正式巡检 22/22 通过。完整证据见 [健康检查记录](health.md)。

本次只清理网站仓库与对应健康记录；Cloudflare DNS、Zeabur 项目及外部数据没有删除。历史实现可通过 Git 查看，源码回退使用对应提交的 revert。
