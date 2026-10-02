# 迁移基线与恢复

记录时间：2026-10-02（Asia/Shanghai）。路由原始记录见 [baseline.json](baseline.json)。

- source 起点：e8a08da56e0d96ffd418f147c649115b29c8702d。
- main 发布起点：9862527086803bcfe89ce5b15e1a815892966add，迁移期间不修改。
- 旧 Pages 来源：legacy，main 的 /；默认分支 main。
- 正式域名：www.kisara.com.cn，HTTPS 已启用；kisara.com.cn 跳转到正式地址。
- 原站 Node 24.21.0 安装与构建通过，共 61 个资源、21 个 HTML、8 篇文章。
- 浏览器抽查生活文章正文可访问；二重积分 45 个、多元函数综合分析 40 个 MathJax 容器渲染。
- 旧播放器出现音频错误；旧 Memos 初始停留加载提示；Giscus 在首次检查时未观察到 iframe，外部功能须继续核对。

## 恢复旧发布

如果首次迁移失败：在 Pages 设置把发布来源恢复为 Deploy from a branch，选 main 和 / (root)。保留 www.kisara.com.cn 与 HTTPS，不改 DNS；确认 main 仍指向上述发布提交，然后核对首页和 baseline.json 中文章路径。

新发布稳定后若源码回归：revert 引入问题的源码提交，由 CI 检查后重新部署；不手工改生成 HTML。

## 核对范围

首页、8 篇文章、归档、标签、分类、友链、Memos、404；桌面/移动导航、搜索、MathJax、Giscus 和根域跳转。

## 自动发布验收（2026-10-02）

- PR #2 已合并到 source，首次发布源码：355eda9c4357a34e0dfd1176e36132d903fc7434。
- [PR 检查](https://github.com/kisara174/kisara174.github.io/actions/runs/36991339072) 通过，deploy 被跳过。
- [首次正式发布](https://github.com/kisara174/kisara174.github.io/actions/runs/36991540854) build/deploy 均 success。
- 默认分支已是 source，Pages build_type 是 workflow；github-pages 环境已允许 source，无需扩大规则。
- 正式首页和新 CSS 已返回 HTTP 200，Last-Modified 为首次自动发布之后；根域 HTTPS 返回 301 到 https://www.kisara.com.cn/。
- 介绍文章段落整理经 PR、31 个测试、正式构建和发布完成；原 date/title/path 保持。旧 main 仍是上述基线提交。
- 安装依赖从原 688 个降到首次精简 241 个；主题/检查依赖迁移及旧部署器移除后约 242 个，当前 npm audit 0 个已报告漏洞。
- 外部限制：Memos 原公开 API 返回 404；客户端已经有安全文字渲染、超时和准确错误/重试提示。
- HTTPS 待办：GitHub 切换 workflow 后 https_enforced 变为 false，重新开启返回“certificate does not exist yet”。已按官方文档重触发一次域名证书签发，最终 cname 仍是 www.kisara.com.cn。Cloudflare 代理下 HTTPS 页面可访问，但 GitHub 源站证书/强制 HTTPS 尚待恢复，不将这一项标为通过。DNS 没有变更。
