# 摘要与学习系列导航实施计划

> **For agentic workers:** 使用 executing-plans。主代理负责内容判断，机械编辑只有符合 AGENTS.md 资格后才可委派。

**Goal:** 让读者按知识主题找到8篇原文章，并在首页/订阅/分享中读到清楚摘要。

**Architecture:** 现有Fluid page渲染纯Markdown系列页，现有front matter保存人工摘要，沿用数学/物理/生活标签；不建CMS或关联引擎。

**Tech Stack:** Hexo 8.1.1、Fluid 1.9.9、Markdown/YAML；不新增依赖。

**Spec:** [共享设计 D](../specs/2026-10-04-website-phase3-design.md)。

## Global Constraints

保持版本、8篇文件名/title/date/URL/正文/公式和Giscus pathname；不改permalink，不把已有标签删除或迁移成分类。不由AI直接改写文章。B可独立，但推荐先B后D以复查RSS摘要。

## 文件

- 创建 source/series/index.md：学习导航。
- 修改 _config.fluid.yml：navbar增加短名称“系列”、/series/链接。
- 修改 tests/check-health.test.mjs：目标数量从22变23，仍断言无Memos且包含系列页。
- 修改 docs/maintenance/baseline.json：requiredPaths只增加/series/，articlePaths不变。
- 修改 scaffolds/post.md：加入可选description空字段。
- 修改下列8个 source/_posts 文件的front matter：
  Introduction-to-kisara-s-blog.md、
  一元函数与二元函数中连续性与导数介值性的分析.md、
  多元函数综合分析.md、二重积分.md、第二型曲线积分.md、
  散度旋度.md、幂级数和傅里叶级数.md、物理1.md。
- 创建 docs/maintenance/content.md，更新README导航维护位置。

使用真实manifest.path填链接，不手写新的slug/date转换算法。系列页只用现有生成器，不新建script。

## Task D1：摘要和模板

- [x] 保存当前8篇的文件名/title/date、front matter之后正文和manifest路径基线，放忽略的.cache/content-before.json。
- [x] 阅读原文后每篇写1—2句description，人工核对准确、不夸大、不含未确认个人履历；保留原标签。
- [x] 物理1可用的候选：“梳理质点运动学的位移、速度与加速度，结合直角坐标和自然坐标分析运动。”先与全文核对再写入。
- [x] 只修改front matter；正文从结束分隔符之后逐字保持。格式化器不能顺带改公式或段落。
- [x] 模板加description空字段，不将空字段设为新文章硬错误；现有post正文回退仍可用。
- [x] npm run verify，比较前后8篇路径/date/title及正文与保存基线一致，首页/分享/RSS摘要可读。
- [x] 独立提交摘要与模板。无需为可逆文字编辑写镜像测试，复用构建与实际差异检查。

模板：

```yaml
---
title: {{ title }}
date: {{ date }}
description: ''
tags:
---
```

不更改已有 date，不用mtime制造新发布时间。

## Task D2：系列页和入口

- [x] 新建layout:page的Markdown导航；大纲：连续与微分（2篇）、积分与向量分析（3篇）、级数（1篇）、物理运动学（1篇）、个人记录（介绍1篇），另放一条回首页链接。
- [x] 用真实文章链接生成列表，不以首页作为失败链接的替代。系列组织不是新的文章分类URL。
- [ ] navbar“系列”已生成；手机展开/收起视觉验收待继续，维持当前首页/归档/标签入口。
- [x] baseline.requiredPaths增加/series/，利用现有check-site验证它和全部站内链接；新增测试先证明系列页应受监控，然后更新目标数量断言为23。
- [x] 默认健康检查会因requiredPaths多一页从22变23项；更新README/health维护说明，并核对真实报告，不继续声称只有22。
- [x] B已实施时核对新页出现在sitemap、RSS仍只包含正式文章；系列页description不混入RSS文章列表。
- [ ] clean/build/verify 已通过；手机400px和桌面、深浅色、搜索和长公式在性能阶段统一视觉验收。
- [x] PR #13、Linux、Pages 37211367193 与23/23健康run 37211453317已验收。

页面骨架（链接列表使用实际manifest输出填写）：

```yaml
---
title: 学习导航
layout: page
description: 按主题阅读数学、物理与个人学习记录。
---
```

精确链接可从已有 `.cache/site-manifest.json` 用下面只读命令取得：

```sh
node --input-type=module -e "import fs from 'node:fs'; for (const p of JSON.parse(fs.readFileSync('.cache/site-manifest.json','utf8')).posts) console.log(p.title, new URL(p.path,'https://www.kisara.com.cn/').href)"
```

页面每个条目的标准格式为 `[原文标题](实际manifestURL)`；实施时写入真实URL，不能留下此说明文字作为页面正文。不加入重复标签/分类体系。

## 验证与回退

```sh
npm run verify
git diff --check
npm run check:health
```

验收：8篇原路径/日期/title/正文完全保持；系列页9个链接包含本站首页和8篇文章，均存在；原3个标签有效，手机导航无遮挡，RSS摘要合理；23项健康检查通过（D之前仍22）。

回退系列页交付同时移除导航/baseline新路径，并将健康计数回到22；回退摘要只还原对应front matter与模板。不能为回退改文章date、重命名文件或清空Giscus。

本地验收：新增23项巡检目标断言先RED（实际22），实施后统一 verify 97/97、8篇检查0错误。独立快照比较原8篇正文/title/date/tags/path完全一致；系列页正文9条有效内链，RSS8条摘要与front matter一致。发布与视觉验收待下。

上线：source 5ed778b；本机与GitHub23/23健康检查通过，report quiet。原文与RSS独立比较通过，手机与深浅色实际视觉待性能阶段，不以构建成功代替。
