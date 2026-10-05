# Mac 统一发布入口实施计划

> **For agentic workers:** 使用 executing-plans。主代理执行 Git 和发布判断，不委派规划或发布。

**Goal:** 在选择暂存改动后，一条命令检查、提交、推送并观察 Pages 部署。

**Architecture:** Node CLI 包装现有 Git/npm verify/gh，默认预检，显式 --apply 才写入；只读状态入口可以继续观察。

**Tech Stack:** Node 24.21.0 标准库、Git、GitHub CLI；不新增依赖。

**Spec:** [共享设计 A](../specs/2026-10-04-website-phase3-design.md)。

## Global Constraints

保持版本、source/main、原 8 篇 date/URL/正文、Giscus 和 HTTPS。无自动暂存、草稿转正、pull/rebase/reset/force，不创建第二个发布工作流。忽略缓存可以变，未提交的构建输入不能让验证和发布不一致。

## 文件和接口

- 创建 `tools/publish-site.mjs`：命令、预检、执行、状态观察。
- 创建 `tests/publish-site.test.mjs`：假运行器及本地临时 Git 测试。
- 修改 `package.json`：publish:site、publish:status。
- 创建 `docs/maintenance/publishing.md`，修改 README 链接。

`run(command,args,{cwd,timeoutMs}) -> Promise<{code,stdout,stderr}>`：注入运行器，生产用 spawn、shell:false。
`planPublication({root,run}) -> Promise<{head,tree,files,summary}>`。
`publishSite({root,apply,message,timeoutMs=600000},{run}) -> Promise<{stage,sha?,runUrl?,conclusion?}>`；错误含 stage、可用 SHA/runUrl。
`waitForDeployment({sha,timeoutMs},{run}) -> Promise<{runUrl,conclusion}>`。

CLI 导入不得自动操作 Git。repository 固定 kisara174/kisara174.github.io；支持该仓库 HTTPS/SSH origin，其他远端拒绝。

## Task A1：预检与变更选择

- [x] 写失败测试：默认无 add/commit/push；空暂存、错误分支/远端、冲突、未暂存跟踪变化和未跟踪构建输入都停止。
- [x] 本地临时 bare origin 与 source 工作树测试中文/空格文件名；不访问 GitHub。测试运行器只将 remote get-url 的返回值模拟为正式仓库地址，其余 Git 操作在临时本地仓库真实执行；产品不提供绕过远端校验的选项。
- [x] 跑 `node --test tests/publish-site.test.mjs`，记录接口不存在的实际失败。
- [x] 实现 branch/HEAD/remote、status --porcelain=v1 -z、diff --cached --name-only -z、write-tree；路径按 NUL 解析。
- [x] 预检 Node 与 .nvmrc 相符、npm/git 可运行；构建输入含 source/scripts/tools/tests/scaffolds 和根配置/包文件。
- [x] fetch origin source 后要求 ahead=0、behind=0；失败或不一致给出实际下一步，不自动同步。
- [x] 展示暂存清单/摘要/差异，执行 verify；它可写忽略的 public/cache，不改 index/commit/push。
- [x] 复测正常、未跟踪 source 资源与忽略缓存场景；随发布入口原子提交预检和说明。

测试示例：

```js
const calls=[];
await publishSite({root:'/fixture',apply:false}, {
  run: async (command,args,options) => {
    calls.push([command,...args]);
    return fixtureCommandResult(command,args,options);
  }
});
assert.ok(calls.every(c => !['add','commit','push'].includes(c[1])));
```

测试文件的 fixtureCommandResult 按命令/参数返回正常 source、clean工作树、已暂存文章、ahead/behind=0、verify exit0；未知调用 throw，不能吞掉意外写操作。

## Task A2：执行和失效保护

- [x] 失败用例：verify exit1、期间 HEAD/index/工作树变化不 commit；commit 失败不 push；push 失败保留新 SHA。
- [x] 成功用例：fetch→检查→verify→重核对→commit→读取新 SHA→普通 push origin HEAD:source；没有 add/reset/rebase/force。
- [x] 实现 --apply 必须带非空 --message，独立参数交给 git commit -m；未知参数报错。
- [x] verify 后重新读 HEAD、暂存树和工作树，一致才继续；只 commit index，不使用 -a。
- [x] 验证部分暂存但存在未暂存修改会被拒绝；忽略文件变化允许。
- [x] 临时 Git 真实验证两种路径，gh 用假实现；不发布虚构文章。
- [x] 测试通过后补 npm scripts/README，随发布入口原子提交。

错误恢复：commit 前失败修复再跑；push 失败先查看 git log -1/status，使用普通 git push origin HEAD:source，再 publish:status；部署失败保留源码，显示失败 job，不报“已上线”。

## Task A3：按 SHA 观察

- [x] 假 gh 覆盖无run、pending、build/deploy失败、deploy skipped、cancelled、API超时、另一SHA和成功。
- [x] 查询 `gh run list --workflow pages.yml --branch source --event push --commit SHA` 的 JSON；只选确切 SHA。
- [x] build/deploy 两个 job 都 success 才成功；10分钟超时返回 SHA/runUrl。
- [x] publish:status -- --sha 接受40位hex，fetch 后用 git merge-base --is-ancestor SHA origin/source 验证是目标仓库 source 提交，只观察不 commit/push。
- [x] 缺 gh/未认证时 apply 前停止，预检可继续但标明不能观察部署；不提供隐藏令牌。
- [x] 测试及 verify、PR/Linux 与同 SHA 实际 build/deploy 已验收，记录见 publishing.md。

## 用法（实施后）

```sh
npm run publish:draft -- "文章文件名"
git add -- source/_posts/文章文件名.md
npm run publish:site
npm run publish:site -- --apply --message "更新学习笔记"
npm run publish:status -- --sha "$(git rev-parse HEAD)"
```

需要时明确暂存对应图片目录；已跟踪草稿的删除也要暂存。不自动选内容。新增命令已实现。

## 验收与回退

```sh
node --test tests/publish-site.test.mjs
npm run verify
git diff --check
```

验收：临时 Git 测试无网络副作用、默认无提交/push、错误阶段准确、中文路径完整、同一 SHA 的实际 build/deploy 成功。记录实施后的真实测试数量。

回退模块/npm scripts/说明后恢复原 git add/commit/push；已推送内容通过实际提交 revert，不能自动删除历史。现有 pages.yml 不变。

本地验收（2026-10-04）：首次红灯 24 项因接口尚未实现失败；完善冲突、版本与状态观察后，统一 verify 75/75 通过，8 篇文章检查 0 错误。临时 bare Git 仓库验证真实提交和推送，gh 仅在测试中模拟；真实部署验收待下。

上线：PR #11 / source 97dbf32 / Pages 37209802343，实际 publish:status 成功。真实维护记录已通过默认预检和 --apply 执行：source ebae059444bf7eb831dab8e29386cdf95a11b45f，Pages 37212140157 build/deploy 成功，实际提交/普通推送/同SHA部署链验收完成；没有测试文章。
