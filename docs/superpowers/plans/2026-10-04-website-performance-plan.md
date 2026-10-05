# 手机性能测量与玻璃效果优化计划

> **For agentic workers:** 使用 executing-plans。主代理进行测量/瓶颈判断/视觉验收；不派执行器猜测性能。

**Goal:** 获得可重复的基线，只改影响首屏或滚动的实际瓶颈，并保留液态玻璃风格。

**Architecture:** 浏览器内置 Lighthouse 和 Performance/Network；证据后做最小配置/CSS或资产修复，复用已有站点检查。

**Tech Stack:** 现有 Hexo/Fluid/CSS，Mac浏览器；不新增 npm、图像处理或持续性能服务。

**Spec:** [共享设计 C](../specs/2026-10-04-website-phase3-design.md)。

## Global Constraints

保持 Node/Hexo/Fluid、原URL/正文/公式、Giscus、DNS/HTTPS、既有回退样式；不编辑 theme依赖/生成public。不设未测量的Lighthouse CI硬分数门槛，不因为CSS可改就强行修改。

## 文件

- 创建 docs/maintenance/performance.md：设备、测量条件、前后表和瓶颈结论。
- 按证据才修改 source/css/custom.css、_config.fluid.yml 或 source/img/eva 的新增优化副本。
- 不创建性能CLI。报告JSON放忽略的 .cache/performance，提交文档中的统计与必要证据。
- 外部资源若成为瓶颈，先核对主题现有 static_prefix 功能与版本，另列具体变更，不能顺带搬运全部CDN。

## Task C1：建立基线（可独立结案）

- [x] 核对现有CSS22px玻璃、手机、实色回退、深色、减少动态/透明度和forced-colors；记录已完成能力。
- [x] 用内置Lighthouse测首页和长文章：
  `https://www.kisara.com.cn/2026/02/13/幂级数和傅里叶级数/`。
- [x] 每URL的mobile/desktop至少各3次，共至少12次；浏览器版本、冷缓存、相同网络/CPU设置固定，报告JSON保留。
- [x] 记录LCP元素/发现时间、LCP、CLS、TBT、传输字节和请求数中位数；不将TBT称为真实用户INP。
- [x] Performance测一次手机模拟滚动和搜索弹层，查绘制与长任务；另用Safari确认Mac实际视觉。模拟不能替代真实iPhone硬件结论。
- [x] 只列实际瓶颈，标注CDN/网络噪声；没有瓶颈则写“基线可接受，本次无代码修复”并结案。
- [x] 提交报告，不提前改 CSS 或图片。

报告表格式（实际测完才填值）：

```text
URL | 浏览器/版本 | 场景 | 冷缓存/网络/CPU | 次数 | LCP中位数 | CLS中位数 | TBT中位数 | 字节/请求
```

这是记录字段定义，不是捏造测量值。本计划不预填性能分数。

## Task C2：按证据执行最小修复

- [x] 若横幅是LCP且发现晚，优先检查真实HTML/CSS与Network时序；首屏LCP图不加lazyload，避免预载与实际URL不一致的双请求。
- [x] 已记录eva.jpg尺寸/传输成本；本次只检验发现时机，不生成副本。独立WebP清晰度/大小/性能对照列入后续候选。
- [x] 核对本机已有cwebp，无需安装工具；转换不成为本次测量或回退的依赖。
- [x] 滚动录制未证实模糊持续拖慢；手机和桌面均保留22px，不实施14px候选。
- [x] 已记录外部CSS/字体阻塞首屏，列为后续独立测量；本次不混入预载实验、不批量换主题/CDN。
- [x] 每次只改一个瓶颈，npm run verify及浏览器视觉检查通过后提交；不能同时换图、模糊、字体后声称知道是哪项生效。

仅在模糊瓶颈已确认时的候选（不是已实施CSS）：

```css
@media (max-width:767px) {
  #navbar, .modal-dialog .modal-content, #mobile-grid-menu {
    -webkit-backdrop-filter: blur(14px) saturate(135%);
    backdrop-filter: blur(14px) saturate(135%);
  }
}
```

插入位置必须在supports渐进增强内，并位于减少透明度/forced-colors回退之前；不能让后加手机规则覆盖无障碍回退。该片段不覆盖正文，也不凭空增加新动画。

## Task C3：复测与接受

- [x] 重复C1同条件12次。比较中位数及波动范围，不比较不同机器/网络的一次结果。
- [x] 首屏LCP目标参考<=2.5s、CLS<=0.1；实验室基线若受网络导致更慢，报告真实原因，不伪称已达标。
- [x] 存在可重复改善且没有正文/公式/导航退化时接受；若改善落在波动范围或其他指标变差，回退该候选。
- [ ] 400px、桌面、深浅色、键盘搜索/导航、减少动态、实色回退、长公式、打印均检查。
- [x] 少数浏览器不支持prefers-reduced-transparency，必须仍保留默认可读实色底和supports回退。
- [x] 更新报告的实际数字、改动提交、Pages run，确认现有健康检查无回归：D之前22项，D之后23项。

## 验证/回退

```sh
npm run verify
git diff --check
npm run check:health
```

新依赖或改变业务行为才补相关测试；CSS调整不写镜像测试。性能与视觉必须由实际报告证明，不能靠构建通过。

单独revert优化提交可回到原图片和22px样式；基线报告保留。不得通过改DNS、关闭TLS或移除用户选定玻璃风格来完成本计划。

## 2026-10-05/06 实施记录

基线12次与预载候选12次已完成，报告原件、逐次SHA256和400px滚动/搜索录制保存在忽略的 .cache/performance，统计见 [性能记录](../../maintenance/performance.md)。候选PR #14 / source e59b0a9 / Pages 37268056748成功，但未达到重复改善和无其他指标回归的接受标准，撤销两行预载配置。图片转换、手机模糊降低、CDN迁移三项均已评估并跳过；上方对应条件项勾选表示完成条件判断，不表示实施了转换/样式/外部资源改动。原图、22px、MathJax和依赖保持。

Mac自动锁定打断最后视觉验收；减少动态/透明度、forced-colors、打印与Safari深色待继续，不能用源码存在代替实际验收。撤销后本机verify通过97项、8篇0错误；原8篇正文/title/date/tags/路由独立比较一致，21份HTML已无横幅预载。回退PR #15 / source 6633ce566154f2a92027a720e2fe1fddbd8d6cb8 / Pages 37358442751的build/deploy已成功，线上首页无预载、RSS8/sitemap13/robots核对通过，部署后健康23/23。最后视觉项仍待完成。
