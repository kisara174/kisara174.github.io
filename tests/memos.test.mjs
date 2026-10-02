import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHTML } from 'linkedom';
import { parseMemos, memoDate, renderMemos, loadMemos } from '../source/js/memos.js';

test('accepts current and legacy list responses', () => {
  const items = [{content: '一条笔记'}];
  assert.deepEqual(parseMemos({memos: items}), items);
  assert.deepEqual(parseMemos(items), items);
  assert.deepEqual(parseMemos({memos: []}), []);
});
test('rejects malformed responses and nontext content', () => {
  for (const value of [{error: 'failed'}, {memos: {}}, {memos: [{content: {html: true}}]}]) assert.throws(() => parseMemos(value), /格式/);
});
test('supports ISO and legacy timestamp dates', () => {
  const expected = new Date('2026-01-20T00:41:22+08:00');
  assert.equal(memoDate({createTime: expected.toISOString()}).getTime(), expected.getTime());
  assert.equal(memoDate({createdTs: expected.getTime()/1000}).getTime(), expected.getTime());
  assert.equal(memoDate({createTime:'broken'}), null);
});
test('renders hostile HTML as literal text and retains newlines', () => {
  const {document} = parseHTML('<div id="list"></div>');
  const list = document.getElementById('list');
  const content = '<img src=x onerror=alert(1)>\n<script>alert(1)</script>';
  renderMemos(list, [{content,createdTs: 1768840882}]);
  assert.equal(list.querySelector('.memo-content').textContent, content);
  assert.equal(list.querySelector('img,script'), null);
  assert.match(list.querySelector('time').getAttribute('datetime'), /^2026-/);
});
test('replaces the loading state with an explicit empty state', () => {
  const {document} = parseHTML('<div id="list">加载中</div>');
  const list = document.getElementById('list');
  renderMemos(list, []);
  assert.match(list.textContent, /还没有公开/);
  assert.doesNotMatch(list.textContent, /加载中/);
});
test('fetches only the public endpoint without credentials', async () => {
  let requested;
  const list = await loadMemos({fetchImpl: async (url, options) => {
    requested = {url, options}; return {ok:true,json:async()=>({memos:[{content:'笔记'}]})};
  }});
  assert.equal(list[0].content,'笔记');
  assert.equal(requested.url, 'https://memos.kisara.com.cn/api/v1/memos?pageSize=10');
  assert.equal(requested.options.credentials,'omit');
});
test('reports actual HTTP failures rather than assuming anonymous access', async () => {
  await assert.rejects(loadMemos({fetchImpl:async()=>({ok:false,status:404})}), /404/);
});
test('aborts a stalled request and reports timeout', async () => {
  let aborted = false;
  const fetchImpl = (_, {signal}) => new Promise((resolve,reject) => {
    signal.addEventListener('abort', () => {aborted=true; reject(signal.reason);}, {once:true});
  });
  await assert.rejects(loadMemos({fetchImpl,timeoutMs:10}), /超时/);
  assert.equal(aborted,true);
});
test('validates JSON response structure before rendering', async () => {
  await assert.rejects(loadMemos({fetchImpl:async()=>({ok:true,json:async()=>({message:'bad'})})}), /格式/);
});
test('network failure leaves a precise, recoverable error', async () => {
  await assert.rejects(loadMemos({fetchImpl:async()=>{throw new TypeError('Failed to fetch');}}), /网络|服务/);
});
