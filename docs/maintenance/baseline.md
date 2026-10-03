# 迁移基线与恢复

基线记录：2026-10-02；HTTPS 修复验收：2026-10-03（Asia/Shanghai）。路由原始记录见 [baseline.json](baseline.json)。

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
- 首次迁移时的 HTTPS 问题：GitHub 切换 workflow 后 https_enforced 变为 false，重新开启返回“certificate does not exist yet”。当时 Cloudflare 边缘 HTTPS 可访问，但源站证书为空；这一项已于 2026-10-03 完成修复，详见下方记录。

## DNS / HTTPS 修复验收（2026-10-03）

用户已于 2026-10-02 授权检查并修复必要的 Cloudflare DNS/HTTPS 设置。此授权扩展原计划“不改 DNS”的边界，仅用于正式网站的解析和加密修复。

- 使用 Computer Use 在已登录的 Cloudflare 管理页核对：根域 A 指向 `185.199.108.153`，`www` CNAME 指向 `kisara174.github.io`，两者原来均为 Proxied；整区 SSL 模式为 Full。目标符合 [GitHub 域名文档](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site)。
- 临时把这两条记录切为 DNS only，确认权威解析可见 GitHub 源站，再移除并立即恢复 Pages 的同一个自定义域名，重触发一次签发。Pages 保持 workflow 发布，最终域名仍是 `www.kisara.com.cn`。
- GitHub `https_certificate.state` 已为 `approved`，覆盖 `www.kisara.com.cn` 与 `kisara.com.cn`，本次证书到期日为 `2027-01-01`。用严格 TLS 分别直连 GitHub 的四个 Pages IPv4 地址，`www` 均返回 200；源站根域返回 301 到正式地址。
- 已恢复 GitHub `https_enforced: true`，并把根域与 `www` 恢复为 Proxied，原解析目标不变。
- Cloudflare **Rules → Configuration Rules** 中启用 **GitHub Pages strict TLS**：匹配表达式 `http.host in {"kisara.com.cn" "www.kisara.com.cn"}`，唯一设置为 SSL = Strict。该规则按 [配置规则设置](https://developers.cloudflare.com/rules/configuration-rules/settings/) 为这两个域名启用 [Full (strict)](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/full-strict/)；整区 Full 和其他子域名设置保留。
- 通过 `curl --noproxy '*' --resolve` 直连 Cloudflare 边缘验证：HTTPS 正式首页 200；根域及 `www` 的 HTTP 均 301；HTTPS 根域 301。跟随跳转均到 `https://www.kisara.com.cn/`，无循环；`/archives/?utm_source=https-check` 的 HTTP 跳转保留路径与查询参数。现有 GitHub 跳转已经生效，无需新增重复的 Cloudflare 跳转规则。
- 同样通过严格 TLS 核对 18 个地址：8 篇原文章、首页和 6 个栏目/404 地址、搜索 XML、个人 CSS 和 Memos JS 全部返回 200。Memos 页面资源可访问与其外部公开 API 的 404 是两项独立结果；服务待恢复的记录仍保留。

## 后续证书检查

证书由 GitHub Pages 管理，参见 [官方 HTTPS 说明](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https)。查看当前状态：

```sh
gh api repos/kisara174/kisara174.github.io/pages \
  --jq '{cname,build_type,https_enforced,https_certificate}'
curl --noproxy '*' --resolve www.kisara.com.cn:443:185.199.108.153 \
  --max-time 20 -I https://www.kisara.com.cn/
```

第二个命令直接检查源站证书，避免本机代理让 `--resolve` 的检查绕回 Cloudflare。若未来再次出现签发问题，先核对实际 DNS 和源站证书，再按上述过程临时调整这两条记录的代理状态；证书签发且严格 TLS 检查通过后恢复代理，并核对配置规则与强制 HTTPS。
