---
title: 碎碎念
layout: page
---

<!-- 容器 -->
<div id="memos"></div>

<!-- 引入 Memos 样式与脚本 -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/memos-vue@latest/dist/style.css">
<script type="module">
  import { init } from 'https://cdn.jsdelivr.net/npm/memos-vue@latest/dist/memos-vue.js'
  init({
    el: '#memos',
    host: 'https://memos-kisara.zeabur.app', // <-- 换成你的 Zeabur 域名
    limit: 10,
    creatorId: 1, // 第一个注册的用户 ID 是 1
  })
</script>

<style>
/* 这里的 CSS 可以让说说列表也带上你的玻璃质感 */
#memos {
  padding: 20px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.3);
}
.memos-item {
  background: rgba(255, 255, 255, 0.4) !important;
  border-radius: 12px !important;
  margin-bottom: 15px !important;
}
</style>
