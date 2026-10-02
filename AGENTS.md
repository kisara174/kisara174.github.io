# 网站维护约定

- `source` 为唯一源码分支。不要提交 `public`、`node_modules`、本地工具缓存或生成的 HTML；不要覆盖或删除回退分支 `main`。
- 使用 `.nvmrc` 的 Node 和 `npm ci`。验证入口为 `npm run verify`，Hexo 命令通过 npm scripts 固定北京时间，避免 UTC runner 改变文章日期。
- 保留 `docs/maintenance/baseline.json` 的旧文章路径及 Giscus pathname 映射。不得批量修改已有文章的日期、文件名和 slug。
- 保留正式域名和 HTTPS；部署权限只用于 source 的 Pages job。PR 只检查，部署之前必须通过测试、构建和站点检查。
- 个人资源放 `source`，主题覆盖放 `_config.fluid.yml`，不要改 `node_modules/hexo-theme-fluid`。`scripts` 只放 Hexo 插件（会自动加载），维护 CLI 放 `tools`。
- 玻璃主要用于控制和卡片，文章阅读优先；修改 CSS 后核对浅深色、390px 手机导航、搜索、公式和无模糊/减少动态回退。
- Memos 只读公开接口、默认纯文本 DOM，不插入接口内容为 HTML，不加入访问令牌。
- 工程任务先用官方文档与现有项目证据。主代理保留需求判断、规划、调试、风险审查和最终验收；执行器只能处理已限定路径、机械、可回退且有独立验证的小任务。不得委派依赖变更、删除、权限、网络、发布或安全判断。
- GraphFlow 可用时，广泛探索/实现/调试前先 `graphflow_context`，使用当前仓库绝对路径作为 `rootDir`；多步骤先 `graphflow_plan`；修改后 `graphflow_index`。只在压缩上下文不足时扩大文件读取；不可将 home 作为 workspace root。
