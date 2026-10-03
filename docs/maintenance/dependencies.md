# 依赖状态

2026-10-03 在 Node 24.21.0、当前未修改的 package-lock 上运行 `npm ci` 与 `npm audit --json`。安装和构建通过；审计报告 7 个 high 条目，均来自同一个 `braces <=3.0.3` 问题及依赖链传播，不是 7 个独立漏洞。

上游 [GHSA-vfj7-8cjw-p6xm / CVE-2026-93687](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) 说明深度嵌套的 glob 模式可能导致栈耗尽；当前没有修复版本。已安装的 braces 3.0.3 经 Hexo 的 micromatch 和 Fluid 的 Nunjucks/chokidar 等路径引入。

审计给出的自动建议包含把 Hexo 降级至 3.9.0，是不兼容的大版本改变，不能通过 `npm audit fix --force` 直接应用。本次保持锁文件和主题版本，没有添加依赖。问题位于本机/CI 构建与 watch 的依赖链；正式网站发布的是静态页面，不能把构建依赖的告警等同于浏览器中已注入漏洞代码，也不能宣称依赖无漏洞。

后续在上游有可用补丁时审阅 Dependabot PR，运行 `npm run verify` 并检查主题兼容性。不要自动合并、盲目 override 或用旧 Hexo 消除报告。此前维护记录中的审计值是当时的结果，以本次日期和实际 advisory 为新的现状。
