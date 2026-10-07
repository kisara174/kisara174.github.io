# 网站性能测量记录

2026-10-05（Asia/Shanghai）。基线源码：ebae059444bf7eb831dab8e29386cdf95a11b45f，线上 Pages build/deploy 已成功；测量访问正式 www 域名。

## 条件与原始证据

- 本机 Mac17,3 / Apple M5 / macOS 27.0.1；Chrome 152.0.0.0、DevTools 内置 Lighthouse 13.4.1，仅 Performance 分类，Navigation 模式。
- 每页每配置连续三次，启用 Clear storage / disableStorageReset=false，报告所有站点请求 cache=none；没有服务工作线程。浏览器冷缓存不能清空 Cloudflare 边缘缓存，边缘和外部 CDN 波动仍存在。
- mobile：Moto G Power 模拟、412×823、DPR 1.75；simulate 节流 RTT 150ms、1638.4Kbps、CPU 4×。desktop：实际 DevTools 视口、simulate RTT 40ms、10240Kbps、CPU 1×。各组 configSettings 完全一致。
- 基线时间北京时间 13:09:53–13:23，12 次独立 fetchTime，全部无 runtimeError/runWarnings。JSON 原件在忽略的 .cache/performance/baseline-{home,article}-{mobile,desktop}-{1,2,3}.json；baseline-summary.json 保存文件 SHA256、时间和逐次指标，不提交大报告。
- 首页 https://www.kisara.com.cn/；长文章 https://www.kisara.com.cn/2026/02/13/幂级数和傅里叶级数/。

LCP、TBT 是 Lighthouse simulate 估计；Network / LCP breakdown 中的请求时间是本机实际观测，两者不能直接相加或互换。TBT 不是真实用户 INP，模拟手机不等于实测 iPhone。取三次中位数和最小–最大范围，不能保证全球访问表现。参考 [Lighthouse 节流说明](https://github.com/GoogleChrome/lighthouse/blob/main/docs/throttling.md)与[结果波动说明](https://github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md)。

## 12 次基线

表内为中位数（最小–最大），传输量取 total-byte-weight；请求数包括报告捕获的字体/data URI及 Cloudflare beacon，保持同一口径。

| 页面 | 配置 | 次数 | LCP s | CLS | TBT ms | 传输 KiB | 请求数 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 首页 | mobile | 3 | 4.12 (3.80–4.37) | 0.0000 (0.0000–0.0069) | 10.0 (0.0–19.0) | 560.0 (558.6–560.1) | 25 |
| 首页 | desktop | 3 | 0.77 (0.77–1.14) | 0.0108 (0.0108–0.0108) | 0.0 (0.0–0.0) | 558.8 (558.5–559.0) | 25 |
| 长文章 | mobile | 3 | 6.88 (6.76–7.57) | 0.0000 (0.0000–0.0351) | 46.5 (46.0–89.0) | 1001.7 (1001.5–1001.8) | 40 |
| 长文章 | desktop | 3 | 1.81 (1.63–2.13) | 0.0108 (0.0108–0.0108) | 0.0 (0.0–0.0) | 1001.8 (1001.7–1001.9) | 40 |

手机两页 LCP 均为 #banner 的 /img/eva.jpg 背景图；首页桌面为 .banner-text > .h2 文字，文章桌面为 #banner。原图1920×1080、298059 bytes，每份报告只捕获一次图片请求，手机共25/40个请求。

基线图片请求开始（实际观测）首页手机512–1117ms，文章手机1017–2654ms；文章首次图片传输实际达12.3秒、后两次2.2–3.4秒，存在明显网络波动。首页外部 Bootstrap/Iconfont 等阻塞首屏；文章另有328441 bytes 的 MathJax 主脚本。不能把全部延迟归因于玻璃效果。

## 实施边界

第一候选仅用 Fluid 1.9.9 现有 custom_head 添加同 URL 的 image preload / fetchpriority=high，提前发现背景图；不更换图片、外部库、玻璃22px或公式引擎。所有页面横幅当前一致，后续若改变单页 banner_img 必须同步调整预载范围或使用匹配的逐页注入，避免下载不用的图片。

使用 [Fluid 自定义 head](https://fluid-dev.github.io/hexo-fluid-docs/guide/) 与 [Chrome 对 CSS LCP 背景图的优先级建议](https://web.dev/articles/fetch-priority)。候选必须通过构建、视觉和同正式域名12次复测，才可认定改善；若无可重复收益或出现回归，撤销预载。候选已通过构建并完成12次复测，结果不支持接受，详见下文。

CSS 已核对：默认实色底，supports 内22px玻璃，接近实色正文，手机布局、深色、减少动态/透明度、forced-colors和打印回退均在 source/css/custom.css；以下记录实际性能判断和已执行的视觉检查。

## 预载候选的12次复测与回退决定

候选源码为 [PR #14](https://github.com/kisara174/kisara174.github.io/pull/14) 的 source e59b0a9b8211c5e755c63085fe4d44b525427d02；[Pages 37268056748](https://github.com/kisara174/kisara174.github.io/actions/runs/37268056748) build/deploy 均成功，真实 publish:status 和 HTTP head 解析确认上线。只增加同 URL 的 image preload / fetchpriority=high，其他站点行为保持。

文章复测在北京时间13:33–13:38，首页因暂停后恢复在23:39–23:48。同机器、浏览器、节流、清存储设置；均使用浅色站点外观，24份报告无 runtimeError/runWarnings、fetchTime互不重复、本站请求cache=none，eva.jpg每份只有一次请求。desktop关闭设备工具栏，实际视口909px；不能只检查 configSettings，因为 screenEmulation.disabled=true。comparison-summary.json保存各原件SHA256与逐次指标。

| 页面 | 配置 | 次数 | LCP s | CLS | TBT ms | 传输 KiB | 请求数 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 首页 | mobile | 3 | 4.75 (4.57–4.87) | 0.0114 (0.0114–0.0191) | 5.0 (3.0–26.0) | 560.1 (559.1–560.3) | 25 |
| 首页 | desktop | 3 | 2.59 (1.15–2.87) | 0.0108 (0.0108–0.0125) | 0.0 (0.0–0.0) | 558.9 (558.8–560.1) | 25 |
| 长文章 | mobile | 3 | 6.65 (6.52–6.82) | 0.0000 (0.0000–0.0000) | 103.5 (48.5–104.0) | 1001.8 (1001.6–1001.8) | 40 |
| 长文章 | desktop | 3 | 1.91 (1.49–2.03) | 0.0110 (0.0108–0.0110) | 0.0 (0.0–0.0) | 1001.8 (1001.7–1003.0) | 40 |

实际图片请求开始时间中位数：手机首页984→620ms、长文章1477→406ms，桌面长文章1384→461ms，说明提前发现图片确实发生；它不等于首屏已经更快。长文章手机 LCP 6.88→6.65s（约3.3%）且范围重叠，TBT 46.5→103.5ms；桌面长文章 LCP 1.81→1.91s。首页手机4.12→4.75s，桌面0.77→2.59s，未获得稳定收益。

按计划拒绝候选，撤销 _config.fluid.yml 的两行预载配置，保留统计报告。上午与晚间外部CDN/边缘网络状态可能不同，文章手机benchmarkIndex从4427–4439到4217–4323也略有波动；这不是随机对照实验，不能将所有变慢归因于预载。结论是当前证据不足以接受这个复杂度，而非“预载一律无用”。回退后恢复基线加载方式，没有额外“优化后达标”声明；手机LCP仍未达到2.5s参考值，所有有效CLS<0.1。

额外4份无效测量保留但不计入24份：excluded-article-mobile-cpu4.json 误留实际Performance CPU 4×，benchmark约1028，明显低于约4300的有效组；excluded-home-desktop-width400-{1,2,3}.json 的设备工具栏让desktop实际视口为400px，关闭后重新测量3次。每个排除都有明确条件偏差，未按分数挑报告。

本次未转换图片：原图约291KiB，图片大小值得后续独立试验，但阻塞CSS与MathJax也占首屏成本，当前候选只检验发现时机。现有cwebp工具可用于下一次有视觉对照的副本试验，无需安装；本次没有生成或替换资产。不批量迁移外部CDN，不因可改就降低玻璃模糊。

## 400px滚动与搜索录制

Chrome Responsive 400×625、Performance实际CPU 4×、Network无额外节流；预先加载的长文章滚动、展开手机菜单、搜索“傅里叶”、关闭弹层。录制108.39s（含等待），原件 .cache/performance/kisara-mobile-scroll-search-trace.json.gz，SHA256 916e3824f2ae32d3ccb87698b45654c845bad04e13113b9e241af932abcc571c，interaction-summary.json保存主渲染线程统计。

主线程2个>50ms任务：126.16ms为开始CPU采样自身的启动开销（其中124ms CpuProfiler::StartProfiling），51.87ms为MathJax idle/lazy渲染。Paint最大3.81ms、Layout最大8.24ms，未观察到持续大幅玻璃绘制任务。DevTools全窗口摘要：Scripting335ms、Painting171ms、Rendering170ms，显示一次本地交互52ms；这些不是用户群体的INP，也不能据此保证所有手机流畅。当前证据支持保留22px，而不是直接改14px。

## 视觉验收状态

- 已通过Computer Use实际操作：Chrome400px深色系列页，菜单展开有首页/归档/标签/系列/搜索/外观6项且无遮挡；Tab逐项可到搜索，Return打开，自动焦点落到关键词，查询“傅里叶”返回原文章；Tab到结果有明显蓝色焦点边框，Return进入原URL。上午400px浅色滚动/搜索及长公式局部横向滚动已经检查。
- Chrome909px深色系列页、400px深色长文章标题与正文可读；实际Safari Mac首页、系列页、长文章浅色已经查看。预载只修改head，不修改视觉CSS。
- 2026-10-06补齐减少动态/透明度、forced-colors、三页打印预览与Safari深色正文/公式/搜索/导航。forced-colors暴露菜单图标消失，已用系统色ButtonText作一行修复并在本地实际复查，详见 [最终视觉验收](visual-acceptance.md)。

## 后续优先级

先单独测长文章MathJax约321KiB传输和外部首屏CSS加载路径，保留公式正确性及现有懒渲染；或者独立比较横幅WebP副本的清晰度、大小与同条件性能。每次只试一项，以重复测量决定接受或回退；不添加永久Lighthouse服务或硬分数门槛。

## 2026-10-07：资源审查与待验收候选

### 公式加载候选

从实际生成页与原 8 篇正文核对：7 篇数学/物理文章使用美元符号公式语法，介绍文章没有公式；首页、系列等列表页原本就没有 MathJax。Fluid 1.9.9 的 `markdown-plugins.ejs` 在 `specific: false` 时忽略单篇 `math: false`，因此采用官方 `specific: true`，7 篇显式 `math: true`，介绍文章 `math: false`。

MathJax 3.2.2 URL、引擎、`ui/lazy` 与其余脚本保持。独立构建对照确认：7 篇数学文章完整 HTML 与本次基线逐字一致；介绍文章正文与原有元数据保持，只移除公式加载配置和脚本。候选不是长公式文章的加速方案；它只去掉介绍文章不需要的资源，不宣称 LCP 提升。

`npm run verify` 本地 101 项测试通过、8 篇检查 0 错误。新增的 4 项检查先在旧实现全部失败，再验证通过，覆盖公式资源缺失、多余加载、字符串布尔值和 HTML 内联横幅背景资源丢失。原 8 篇 Markdown 正文、原有 front matter 与 URL 独立核对保持，新增数学开关例外。证据在忽略的 `.cache/architecture-resources/{tests-red,tests-green,math-only-verify}.log` 与 `content-receipt.json`。

2026-10-07 恢复 Computer Use 后，Chrome 实际检查通过：介绍文章桌面排版；长文章 Taylor 与 Fourier 行内/块公式在滚动后渲染；400px 手机模拟下长公式保留独立横向滚动，正文没有被拉宽；菜单展开、搜索“傅里叶”的结果及链接正常；首页与系列页显示正常。这是桌面浏览器及设备模拟验收，不是实机 iPhone 验收。无公式介绍文章的独立资源对照见下文。

### 公式加载对照验收（2026-10-07）

只对实际改变的介绍文章做基线/候选对照，各手机/桌面 3 次，共 12 份 Chrome DevTools 导出的 Lighthouse 13.4.1 JSON。首页、系列和 7 篇公式文章生成 HTML 完全一致，因此不重复测未改变的页面，也不将此方案描述为长文章加速。两版切换同一个 `127.0.0.1:4173` 地址；Navigation、Performance only、Clear storage、Simulated throttling，JS sampling 关闭。手机 Moto G Power / Slow 4G，桌面使用 Lighthouse 默认桌面配置。按组顺序测量，没有挑选单次结果。

| 介绍页 / 中位数（3 次） | LCP | CLS | TBT | 传输量 | 请求数 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 基线手机 | 6.170s | 0.0069 | 36.5ms | 1153504 bytes | 52 |
| 候选手机 | 4.510s | 0.0069 | 0ms | 819392 bytes | 50 |
| 基线桌面 | 1.139s | 0.0108 | 0ms | 1153679 bytes | 52 |
| 候选桌面 | 0.873s | 0.0108 | 0ms | 819586 bytes | 50 |

手机 LCP 基线范围 6.107–6.321s、候选 4.360–4.515s；桌面基线 1.099–1.141s、候选 0.869–0.873s。每份基线都请求 MathJax 主脚本及 lazy 扩展（合计 332927 bytes），每份候选均为 0 个 MathJax 请求。保留按页开关：减少无用资源且本批对照改善，未牺牲公式页面。结果仅说明本次本地条件，不包括 Cloudflare 线上链路，也不是全站速度保证。

原始报告 `math-{baseline,candidate}-{mobile,desktop}-{1,2,3}.json`、时间/配置/哈希及各次指标收据 `math-lighthouse-receipt.json` 保存在忽略的 `.cache/architecture-resources/`。代码候选为 e99f2110196065e0dcd5eb437c1c7e8e6c549cfc；恢复验收时重新 verify 101/101、8 篇检查 0 错误。

### 横幅 WebP 对照（2026-10-07）

使用现有 cwebp 1.6.0，原 JPG 1920×1080 / 298059 bytes。`-q 85 -m 6` 副本 256798 bytes；采用 `-q 75 -m 6` 的候选 181592 bytes，比原图小 116467 bytes（39.1%），尺寸和画面保持。转换参数参考 [cwebp 官方文档](https://developers.google.com/speed/webp/docs/cwebp)。8 个 `banner_img` 统一使用 WebP；保留原 JPG 及 Open Graph 分享图 URL。不添加预载，不改 CSS、公式或其他资源。

独立快照 `baseline-public` / `image-public` 的 21 个 HTML 差异只在内联横幅的 `url('/img/eva.jpg')` → `url('/img/eva.webp')`，其余既有产物相同，新增 WebP 与 q75 副本哈希一致。同一个 `127.0.0.1:4173` 切换两版；首页及长文章《幂级数和傅里叶级数》，各手机/桌面 3 次基线与 3 次候选，共 24 份真实 Chrome DevTools Lighthouse 13.4.1 JSON。设置与公式对照相同：Navigation、Performance only、Clear storage、Simulated throttling，JS sampling 关闭。按组顺序运行，未随机交错。

| 页面 / 设备 / 中位数（3 次） | LCP 基线 → 候选 | CLS 基线 → 候选 | TBT 基线 → 候选 | 传输量基线 → 候选 | 请求数 |
| --- | ---: | ---: | ---: | ---: | ---: |
| 首页 / 手机 | 4.210 → 4.211s | 0.0069 → 0.0069 | 0 → 0ms | 650811 → 534342 bytes | 23 → 23 |
| 首页 / 桌面 | 0.927 → 0.855s | 0.0108 → 0.0108 | 0 → 0ms | 650789 → 534329 bytes | 23 → 23 |
| 长文章 / 手机 | 4.207 → 3.615s | 0.0342 → 0.0342 | 40.5 → 38ms | 1111844 → 995363 bytes | 38 → 38 |
| 长文章 / 桌面 | 0.672 → 0.670s | 0.0108 → 0.0108 | 0 → 0ms | 1111839 → 995380 bytes | 38 → 38 |

首页手机 LCP 范围为基线 3.538–4.812s、候选 3.538–4.218s；首页桌面为 0.920–0.930s、0.848–0.855s。文章手机为 2.979–4.214s、2.962–3.759s；文章桌面为 0.650–0.851s、0.629–0.771s。不能推导各组一致速度改善：手机首页中位数基本相同，文章范围重叠，外部 CDN 仍有网络波动。本批没有运行错误或失败资源状态。每次横幅传输量固定从 298274 降到 181807 bytes（含响应头），均减少 116467 bytes。

**候选判断：** 明确收益是降低横幅传输量，未证明全站稳定变快。原图及 WebP 初步细节对照、桌面浅深色首页与 400px 手机首页实际显示正常，裁切和玻璃层未见异常；系列页及长文章的最终视觉验收尚未完成，Computer Use 返回 `noWindowsAvailable`。因此当前仅准备独立候选，不合并发布。此处是桌面浏览器及设备模拟，未做实机 iPhone 验收。

候选源码重新执行 `npm run verify`：101/101 测试通过、8 篇检查 0 错误；与当前公式版 `math-public` 比较，仍仅有 21 个 HTML 横幅 URL 替换和新增 WebP，原 JPG 字节不变。

原始报告 `image-{baseline,candidate}-{home,article}-{mobile,desktop}-{1,2,3}.json` 及时间、配置、哈希和各次指标收据 `image-lighthouse-receipt.json` 保存在忽略的 `.cache/architecture-resources/`。不把先前线上基线、公式介绍页实验与本批混为同条件数据；本地结果不包含 Cloudflare 正式链路。

### 外部资源与主题审查

资源与加载入口见 [依赖清单](dependencies.md)，结构适配见 [主题边界](theme-diff.md)。两套 Iconfont 是不同主题用途，Bootstrap/jQuery 支持现有菜单及弹层；不能根据名称直接删掉。Fancybox/目录/锚点存在动态插入脚本，单靠 HTML 的 script[src] 清单不足以计算网络请求数。当前先记录这些事实，不批量本地化 CDN、不删除交互、不修改玻璃强度或 CSS。

## 回退上线验收（2026-10-06）

[PR #15](https://github.com/kisara174/kisara174.github.io/pull/15) 的Linux CI 37358297281通过，source合并提交6633ce566154f2a92027a720e2fe1fddbd8d6cb8；[Pages 37358442751](https://github.com/kisara174/kisara174.github.io/actions/runs/37358442751) build/deploy均成功，publish:status按完整SHA确认。正式首页HTTP200且无横幅预载，canonical域名正确；RSS8项、sitemap13项、robots声明独立解析通过；部署后重新运行健康检查23/23、两端严格TLS通过。原配置与实验前ebae059逐字一致，97项测试及原8篇内容快照通过。Mac的source工作目录已安全快进到合并源码，main没有改动。该回退发布时最后视觉尚未完成；2026-10-06已继续验收并记录菜单系统色修复，见上文。
