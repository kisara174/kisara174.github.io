'use strict';

function parseMemos(data) {
  const list = Array.isArray(data) ? data : data && data.memos;
  if (!Array.isArray(list) || !list.every(item => item && typeof item.content === 'string')) {
    throw new Error('碎碎念服务返回的数据格式异常，请稍后重试。');
  }
  return list;
}

function memoDate(item) {
  const date = item.createTime ? new Date(item.createTime) :
    typeof item.createdTs === 'number' ? new Date(item.createdTs * 1000) : null;
  return date && Number.isFinite(date.getTime()) ? date : null;
}

function renderMemos(container, items) {
  const document = container.ownerDocument;
  container.replaceChildren();
  if (!items.length) {
    container.textContent = '还没有公开发布的碎碎念。';
    return;
  }
  for (const item of items.slice(0, 10)) {
    const card = document.createElement('article');
    card.className = 'memo-card';
    const date = memoDate(item);
    if (date) {
      const time = document.createElement('time');
      time.className = 'memo-time';
      time.setAttribute('datetime', date.toISOString());
      time.textContent = new Intl.DateTimeFormat('zh-CN', {dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Shanghai'}).format(date);
      card.append(time);
    }
    const content = document.createElement('div');
    content.className = 'memo-content';
    content.textContent = item.content;
    card.append(content);
    container.append(card);
  }
}

async function loadMemos({ endpoint, fetchImpl = globalThis.fetch, timeoutMs = 8000 } = {}) {
  let url;
  try { url = new URL(endpoint); } catch { throw new Error('碎碎念接口配置缺失或无效。'); }
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('碎碎念接口必须使用公开的 HTTPS 地址。');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new Error('请求超时，请稍后重试。')), timeoutMs);
  try {
    const response = await fetchImpl(url.href, {
      signal: controller.signal, credentials: 'omit', headers: {Accept:'application/json'},
    });
    if (!response.ok) throw new Error(`碎碎念服务暂时无法访问（HTTP ${response.status}），请稍后重试。`);
    return parseMemos(await response.json());
  } catch (error) {
    if (controller.signal.aborted) throw new Error('连接碎碎念服务超时，请稍后重试。');
    if (error instanceof TypeError) throw new Error('暂时无法连接碎碎念服务，请检查网络或稍后重试。');
    if (error instanceof SyntaxError) throw new Error('碎碎念服务返回的数据格式异常，请稍后重试。');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function mountMemos(container) {
  const document = container.ownerDocument;
  container.setAttribute('aria-busy','true');
  container.textContent = '正在加载碎碎念…';
  try {
    renderMemos(container, await loadMemos({endpoint: container.getAttribute('data-memos-endpoint')}));
  } catch (error) {
    const message = document.createElement('p');
    message.className = 'memo-status';
    message.textContent = error.message;
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'memo-retry';
    retry.textContent = '重新加载';
    retry.addEventListener('click', () => mountMemos(container), {once:true});
    container.replaceChildren(message, retry);
  } finally {
    container.setAttribute('aria-busy','false');
  }
}

if (typeof module !== 'undefined' && module.exports) {
  exports.parseMemos = parseMemos;
  exports.memoDate = memoDate;
  exports.renderMemos = renderMemos;
  exports.loadMemos = loadMemos;
} else {
  const init = () => {
    const container = document.getElementById('memos-list');
    if (container) mountMemos(container);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
}
