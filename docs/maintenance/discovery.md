# RSS 与搜索发现

读者可从页脚 RSS 链接订阅 [全部正式文章的摘要](https://www.kisara.com.cn/rss.xml)。Hexo 官方 [feed](https://github.com/hexojs/hexo-generator-feed) 和 [sitemap](https://github.com/hexojs/hexo-generator-sitemap) 生成器在现有构建中自动输出；不会注册搜索平台账号或自动提交收录。

配置集中在 _config.yml；feed.limit: 0 包含全部正式文章，content: false 仅摘要。摘要优先使用文章 front matter 的 description，否则由生成器从正文提取。写新文章时可填写简短介绍，不要改旧文章日期和文件名。草稿不参与正式构建；若需排除特定公开页面的站点地图，使用官方 sitemap: false front matter。

Fluid 原生 canonical 已启用，首页/文章生成正确 HTTPS 与 www 链接。分享默认使用现有 eva.jpg，不加载新 SDK。robots.txt 允许公开内容抓取并声明正式 sitemap；它不会保护私密内容。是否收录由搜索引擎决定。

npm run verify 继续作为唯一本地/CI 检查入口。baseline.discovery 启用 RSS 与 sitemap 的结构、闭合、正式文章覆盖、重复/错误域名/无效路由、草稿及退休页面排除；robots 声明；首页及文章 description、canonical 和 OG 元信息。HTML 同时检查懒加载 data-src 和响应式图片候选，不对第三方链接发网络请求。这是针对网站产物的检查，未声称实现完整 XML 标准验证。

本地验收：检查覆盖 8 篇正式文章；RSS 8 项、站点地图 12 项（含首页和3个标签），404 与 Memos 未收录；原 22 项健康巡检保持独立。真实部署后还需核对 RSS/sitemap/robots 的 HTTP 状态和类型，验收链接见下方记录。依赖审计见 dependencies.md。

回退时同时撤销插件/lock、配置、页脚入口、robots 和 discovery 硬要求；保留此前路由与资源检查。

2026-10-04 验收：[PR #12](https://github.com/kisara174/kisara174.github.io/pull/12) Linux 97/97，通过后合并 055e5d89389d1740d2861bbaab2878232246a90e。[Pages run](https://github.com/kisara174/kisara174.github.io/actions/runs/37211026474) 成功，publish:status 按 SHA 确认。随后实际请求 /rss.xml、/sitemap.xml 均 HTTP200/application/xml，/robots.txt 为 HTTP200/text/plain；独立 XML 解析确认8篇覆盖和12项地图。B 交付时巡检22项，D新增系列页后为23项，地图随页面自动扩展。
