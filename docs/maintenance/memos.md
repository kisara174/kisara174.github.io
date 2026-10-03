# Memos 维护

2026-10-03 实际诊断：

| 检查 | 结果 |
| --- | --- |
| `https://memos.kisara.com.cn/` | HTTP 404，text/plain |
| `https://memos.kisara.com.cn/api/v1/memos?pageSize=10` | HTTP 404，text/plain；未得到成功 JSON/CORS 响应 |
| `https://memos-kisara.zeabur.app/` | HTTP 404，text/plain |
| 已登录 Zeabur 的原 memos 项目 | No services；没有可重启的原服务，页面显示共享集群已退役提示 |

已向网站所有者确认是否有迁移地址或数据库备份。在明确原数据位置之前，不新建空实例、迁移数据库或购买服务器。当前事实不足以确定服务消失的具体过程，也不能确认原数据库已丢失。

## 唯一公开端点

`source/memos/index.md` 的 `#memos-list` 上 `data-memos-endpoint` 保存公开 API。浏览器挂载和健康检查都读取该属性；`source/js/memos.js` 不再保存第二份生产地址。恢复后只修改这一处，并按实际运行版本核对官方 API。不得把令牌或带密码的 URL 写入公开配置。

客户端继续以纯文本展示最多 10 条记录，日期使用北京时间；超时、HTTP 错误、结构错误和重试有明确状态，合法空数组才显示暂无内容。网站构建完全不请求 Memos。外部服务故障不会使原文章无法发布。

## 恢复验收

获得原服务地址或备份后，先确认可恢复的数据、部署版本和必要的服务方案，再执行恢复。API 须公开可读，允许来源 `https://www.kisara.com.cn`；只适配确认的响应结构，不盲目升级版本。

```sh
curl --max-time 20 -D - -o /dev/null -H 'Origin: https://www.kisara.com.cn' 'https://memos.kisara.com.cn/api/v1/memos?pageSize=10'
node --test tests/memos.test.mjs
npm run verify
npm run check:health
```

将命令中的 URL 与唯一配置保持一致。正式 `/memos/` 必须在浏览器中实际读取原公开记录，跨源请求成功，重新加载正常，才能勾选恢复。暂不删除 404 待办；本阶段没有修改 Memos 服务或 DNS。
