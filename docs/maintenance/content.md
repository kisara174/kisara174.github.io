# 文章摘要与学习导航

8 篇原文章各新增一条 description，只介绍原文讨论的主题；title/date/文件名/标签/正文及公式均保持原样。普通新文章模板提供可选的空 description，未填写时仍用主题和订阅生成器的正文回退。

学习导航在 source/series/index.md，用 Fluid 普通 page 渲染。导航菜单的“系列”入口指向 /series/，按连续与微分、积分与向量分析、级数、物理运动学、个人记录组织。不是新分类体系，不改变原文路由或 Giscus pathname。

新增笔记后在已有组补上实际文章链接，必要时增加主题。运行 npm run verify 可验证所有内链和图片；从 .cache/site-manifest.json 读取实际 path，不重新计算日期或拼音 slug。导航页进入 sitemap，RSS 仍只列正式文章。

本地快照在忽略的 .cache/content-before.json；与修改后的实际 manifest/front matter/body 比对。全部原文、标题、日期、标签和路径需完全一致，系列页应有 8 条原文链接及 1 条首页链接。新页面进入 baseline.requiredPaths，独立健康巡检因此从22变23项。

回退系列页时一并移除菜单和 baseline 路径，健康目标计数回到22。摘要可独立撤销对应 front matter 行，不重命名原文或修改日期。上线与视觉验收记录见下方。
