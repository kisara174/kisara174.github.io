# 第三阶段最终视觉验收

2026-10-06，Mac解锁后使用Computer Use实际操作Chrome 152与Safari。功能基于已部署source 97dabb96be39280137cd0429d1b08bdd5a085d22；下述菜单修复在本机Hexo预览中复查。原始截图保存在忽略的 `.cache/visual-final/`，性能原件仍在 `.cache/performance/`。

| 范围 | 实际检查 | 结果 |
| --- | --- | --- |
| Chrome手机 | Responsive 400×625，深浅色系列页、六项菜单开关，从系列进入原长文章 | 可读、无遮挡、原链接正确 |
| 键盘 | Tab到搜索、Return打开、关键词自动获得焦点，查询“傅里叶”、Tab结果、Return原URL、Escape关闭 | 已实际通过；焦点边框可见 |
| 减少动态/透明度 | DevTools Rendering两个查询值均为reduce，展开菜单、输入关键词、查看结果、Escape关闭 | 实色背景可读，交互可用 |
| 强制颜色 | forced-colors: active，菜单、搜索、输入焦点 | 搜索正常；菜单图标消失，修复后开/关图标可见 |
| Safari Mac | 线上深色长文章正文/MathJax公式、搜索输入及结果、Escape、顶部系列导航与五组列表 | 已通过；此前浅色首页/系列/长文章检查保留 |
| 打印 | 本地长文章实际Chrome打印预览，逐页查看共三页 | 白底正文、公式、表格与署名可读，无导航/横幅遮挡；未实际打印或共享 |
| RSS/分享元信息 | Chrome打开正式rss.xml显示文章与摘要；构建检查真实canonical、description、OG标题/URL/图片 | RSS8篇、sitemap13项、robots；第三方分享平台预览未测试 |

## 菜单图标修复

复现步骤：Chrome400px长文章 → Rendering启用forced-colors: active → 展开手机菜单。关闭图标由三个span的背景绘制，背景色被强制颜色模式重映射，与按钮背景相同；搜索关闭符号使用文字绘制，仍正常。这与[MDN强制颜色说明](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/forced-colors)中的背景色重映射机制一致。

仅在已有forced-colors媒体查询中为 `#navbar .navbar-toggler .animated-icon span` 指定系统色 `ButtonText`，让浏览器采用用户调色板。未关闭forced-color-adjust，未更改主题依赖、普通深浅色、22px玻璃、正文或动画。修改前已在正式站复现，修改后本地相同模拟条件下汉堡与关闭图标可见，菜单可展开/收起。

验收后所有Rendering媒体模拟均恢复No emulation，设备工具栏关闭，网站外观恢复原深色；没有修改用户OS外观设置。手机结果是浏览器模拟，不能替代真实iPhone硬件测试。性能预载实验仍按24次测量结果撤销，不能据此宣称首屏已经达标。

## 内容与发布检查

统一入口为 `npm run verify`；另运行忽略目录的独立内容快照检查，核对原8篇正文/title/date/tags/路径、系列9条内链和RSS摘要。Giscus仍使用pathname，原评论关联配置不变；不发测试评论。原source/main与域名/HTTPS保持。最终修复通过独立PR、Linux CI和精确SHA的Pages状态验收，部署后重新核对CSS、TLS及23项健康检查；运行凭据记录在该PR及本地验收收据中。

## 横幅 WebP 验收（2026-10-07）

仅替换横幅图片副本与 8 处配置，保留原 JPG 和分享图 URL；没有 CSS、媒体查询或交互改动。先比较原图/q75 副本及桌面浅深色、400px 首页；Computer Use 恢复后，在 Chrome 实际补查系列页的横幅裁切、五组列表和原文章入口，进入《幂级数和傅里叶级数》，检查手机首屏、滚动后的行内及 Taylor 块公式，以及桌面浅深色首屏和正文。画面细线、标题、玻璃层和正文宽度均未见回归，接受体积降低 39.1% 的副本。此轮为桌面及 Chrome 400×625 模拟，未做实机 iPhone 验收，也未重复改动之前已验收的无障碍回退。

24 份性能报告、范围及解释见[性能记录](performance.md#横幅-webp-对照2026-10-07)。手机首页 LCP 中位数基本不变，接受理由是节省传输量，不能宣称全站稳定加速。验收结束关闭 DevTools，保留网站深色；没有修改 macOS 外观设置。
