---
title: 碎碎念
layout: page
---

<div id="memos-list">正在连接云端碎碎念...</div>

<script>
  const memoOpts = {
    host: 'https://memos.kisara.com.cn', 
    limit: 10
  };

  async function fetchMemos() {
    // 尝试新版 API 路径 (v1/memos)
    const url = `${memoOpts.host}/api/v1/memos?pageSize=${memoOpts.limit}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('API 响应异常: ' + response.status);
      
      const data = await response.json();
      // 新版 Memos 返回的数据在 data.memos 中
      const list = data.memos || data; 
      
      let html = '';
      list.forEach(item => {
        // 兼容新版字符串时间格式和旧版时间戳格式
        let dateStr = item.createTime ? new Date(item.createTime).toLocaleString() : new Date(item.createdTs * 1000).toLocaleString();
        
        html += `
          <div style="padding:20px; background:rgba(255,255,255,0.3); border-radius:15px; margin-bottom:20px; backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.2); box-shadow: 0 4px 6px rgba(0,0,0,0.05);">
            <div style="font-size:0.85em; color:#4dcaff; font-weight:bold; margin-bottom:10px; display:flex; align-items:center;">
              <span style="margin-right:8px;">#</span> ${dateStr}
            </div>
            <div style="line-height:1.7; color:#333; font-size:15px;">${formatContent(item.content)}</div>
          </div>`;
      });
      
      document.getElementById('memos-list').innerHTML = html || '还没有公开发布的说说哦';
    } catch (err) {
      console.error(err);
      document.getElementById('memos-list').innerHTML = "读取失败，请确保 Memos 后台已开启【允许匿名访问】。";
    }
  }

  // 简单的内容处理（防止 HTML 注入）
  function formatContent(content) {
    return content.replace(/\n/g, '<br>');
  }
  
  window.onload = fetchMemos;
</script>
