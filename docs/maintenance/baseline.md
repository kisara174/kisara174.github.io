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
