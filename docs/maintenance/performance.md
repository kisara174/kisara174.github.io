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

使用 [Fluid 自定义 head](https://fluid-dev.github.io/hexo-fluid-docs/guide/) 与 [Chrome 对 CSS LCP 背景图的优先级建议](https://web.dev/articles/fetch-priority)。候选必须通过构建、视觉和同正式域名12次复测，才可认定改善；若无可重复收益或出现回归，撤销预载。当前仅完成基线，尚未声称改善。

CSS 已核对：默认实色底，supports 内22px玻璃，接近实色正文，手机布局、深色、减少动态/透明度、forced-colors和打印回退均在 source/css/custom.css；性能判断与真实视觉验收继续执行。
