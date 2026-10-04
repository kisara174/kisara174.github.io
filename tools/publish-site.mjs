import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';

const repository = 'kisara174/kisara174.github.io';
const validOrigin = /^(?:https:\/\/github\.com\/kisara174\/kisara174\.github\.io(?:\.git)?\/?|git@github\.com:kisara174\/kisara174\.github\.io(?:\.git)?)$/;
const validSha = /^[a-f0-9]{40}$/i;

export function run(command, args, { cwd, timeoutMs = 600000 } = {}) {
  return new Promise(resolveResult => {
    const child = spawn(command, args, { cwd, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '', timedOut = false;
    child.stdout.on('data', data => { stdout += data; });
    child.stderr.on('data', data => { stderr += data; });
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, timeoutMs);
    child.on('error', error => { clearTimeout(timer); resolveResult({ code: 1, stdout, stderr: error.message }); });
    child.on('close', code => {
      clearTimeout(timer);
      resolveResult({ code: timedOut ? 124 : code ?? 1, stdout, stderr: timedOut ? 'Command timed out\n' + stderr : stderr });
    });
  });
}
function fail(stage, message, details = {}) {
  return Object.assign(new Error(message), { stage, ...details });
}
async function command(runner, root, stage, name, args, details = {}) {
  const out = await runner(name, args, { cwd: root });
  if (out.code !== 0) throw fail(stage, name + ' failed: ' + (out.stderr || out.stdout), details);
  return out.stdout;
}
async function checkOrigin(root, runner) {
  const origin = (await command(runner, root, 'preflight', 'git', ['remote', 'get-url', 'origin'])).trim();
  if (!validOrigin.test(origin)) throw fail('preflight', 'origin 必须指向 ' + repository);
}
function statusEntries(raw) {
  const parts = raw.split('\0'), entries = [];
  for (let i = 0; i < parts.length && parts[i]; i++) {
    const code = parts[i].slice(0, 2), path = parts[i].slice(3);
    entries.push({ code, path });
    if (/[RC]/.test(code)) i++; // Porcelain -z puts the original rename path in the next field.
  }
  return entries;
}
function isBuildInput(path) {
  return /^(?:source|scripts|tools|tests|scaffolds)\//.test(path) ||
    /^(?:_config[^/]*|package(?:-lock)?\.json|\.nvmrc|\.npmrc|themes\/)/.test(path);
}
async function snapshot(root, runner) {
  const git = args => command(runner, root, 'preflight', 'git', args);
  const head = (await git(['rev-parse', 'HEAD'])).trim();
  const status = await git(['status', '--porcelain=v1', '-z', '--untracked-files=all']);
  const entries = statusEntries(status);
  for (const entry of entries) {
    if (entry.code.includes('U') || ['AA', 'DD'].includes(entry.code)) throw fail('preflight', 'Git 存在冲突: ' + JSON.stringify(entry.path));
    if (entry.code !== '??' && entry.code[1] !== ' ') throw fail('preflight', '存在未暂存 tracked/unstaged 改动: ' + JSON.stringify(entry.path));
    if (entry.code === '??' && isBuildInput(entry.path)) throw fail('preflight', '存在未跟踪 untracked 构建输入: ' + JSON.stringify(entry.path));
  }
  const tree = (await git(['write-tree'])).trim();
  const files = (await git(['diff', '--cached', '--name-only', '-z'])).split('\0').filter(Boolean);
  if (!files.length) throw fail('preflight', '没有暂存 staged 改动；请明确 git add 要发布的文件。');
  return { head, tree, status, files };
}
export async function planPublication({ root, run: runner = run }) {
  const required = (await readFile(resolve(root, '.nvmrc'), 'utf8')).trim().replace(/^v/, '');
  if (process.versions.node !== required) throw fail('preflight', 'Node 需要 ' + required + '；当前 ' + process.versions.node);
  await command(runner, root, 'preflight', 'npm', ['--version']);
  await checkOrigin(root, runner);
  const branch = (await command(runner, root, 'preflight', 'git', ['branch', '--show-current'])).trim();
  if (branch !== 'source') throw fail('preflight', '请在 source 分支发布；当前 ' + (branch || 'detached HEAD'));
  const state = await snapshot(root, runner);
  await command(runner, root, 'preflight', 'git', ['fetch', 'origin', 'source']);
  const [ahead, behind] = (await command(runner, root, 'preflight', 'git', ['rev-list', '--left-right', '--count', 'HEAD...origin/source'])).trim().split(/\s+/).map(Number);
  if (ahead || behind) throw fail('preflight', 'source ahead=' + ahead + ', behind=' + behind + '。先检查 git log/status 并手动同步或推送已有提交，再运行预检。');
  const summary = await command(runner, root, 'preflight', 'git', ['diff', '--cached', '--stat']);
  const diff = await command(runner, root, 'preflight', 'git', ['diff', '--cached', '--no-ext-diff', '--no-textconv']);
  return { ...state, summary, diff };
}
async function ghReady(root, runner) {
  try { await command(runner, root, 'preflight', 'gh', ['auth', 'status']); return true; }
  catch { return false; }
}
export async function waitForDeployment({ sha, timeoutMs = 600000, pollMs = 5000, root }, { run: runner = run } = {}) {
  if (!validSha.test(sha || '')) throw fail('deploy', '需要 40 位提交 SHA', { sha });
  const deadline = Date.now() + timeoutMs;
  let runUrl;
  do {
    const remaining = Math.max(1, deadline - Date.now());
    const query = await runner('gh', ['run', 'list', '--repo', repository, '--workflow', 'pages.yml', '--branch', 'source', '--event', 'push', '--commit', sha, '--json', 'databaseId,headSha,status,conclusion,url'], { cwd: root, timeoutMs: remaining });
    if (query.code !== 0) throw fail('deploy', 'gh 查询失败: ' + query.stderr, { sha, runUrl });
    let runs;
    try { runs = JSON.parse(query.stdout); } catch { throw fail('deploy', 'gh 返回无效 JSON', { sha, runUrl }); }
    const matching = runs.find(item => item.headSha?.toLowerCase() === sha.toLowerCase());
    if (matching) {
      runUrl = matching.url;
      const detail = await runner('gh', ['run', 'view', String(matching.databaseId), '--repo', repository, '--json', 'headSha,status,conclusion,url,jobs'], { cwd: root, timeoutMs: Math.max(1, deadline - Date.now()) });
      if (detail.code !== 0) throw fail('deploy', 'gh 部署详情读取失败: ' + detail.stderr, { sha, runUrl });
      let deployment;
      try { deployment = JSON.parse(detail.stdout); } catch { throw fail('deploy', 'gh 返回无效部署 JSON', { sha, runUrl }); }
      if (deployment.headSha?.toLowerCase() !== sha.toLowerCase()) throw fail('deploy', '部署 SHA 不匹配', { sha, runUrl });
      if (deployment.status === 'completed') {
        const jobs = deployment.jobs || [];
        const successful = ['build', 'deploy'].every(name => jobs.some(job => job.name === name && job.conclusion === 'success'));
        if (deployment.conclusion === 'success' && successful) return { runUrl, conclusion: 'success' };
        throw fail('deploy', '部署未成功: ' + deployment.conclusion + '; ' + jobs.map(job => job.name + '=' + job.conclusion).join(', '), { sha, runUrl });
      }
    }
    if (Date.now() < deadline) await sleep(Math.min(pollMs, deadline - Date.now()));
  } while (Date.now() < deadline);
  throw fail('deploy', '等待部署超时；可使用 publish:status 继续观察。', { sha, runUrl });
}
export async function publishSite({ root, apply = false, message, timeoutMs = 600000, onProgress = () => {} }, { run: runner = run } = {}) {
  if (apply && (typeof message !== 'string' || !message.trim())) throw fail('preflight', '--apply 需要非空 --message 提交说明');
  const plan = await planPublication({ root, run: runner });
  const canObserve = await ghReady(root, runner);
  if (apply && !canObserve) throw fail('preflight', 'gh 未安装或未认证，请先 gh auth login。尚未提交。');
  onProgress(plan.summary + '\n' + plan.diff);
  if (!canObserve) onProgress('gh 未认证：本次可预检，不能观察部署。');
  await command(runner, root, 'verify', 'npm', ['run', 'verify']);
  let after;
  try { after = await snapshot(root, runner); }
  catch (error) { throw fail('verify', '验证期间工作区变化: ' + error.message); }
  if (['head', 'tree', 'status'].some(key => plan[key] !== after[key])) throw fail('verify', '验证期间 HEAD/index/工作区 changed 变化，请重新预检。');
  if (!apply) return { stage: 'verified', ...plan, canObserve };
  await command(runner, root, 'commit', 'git', ['commit', '-m', message]);
  const sha = (await command(runner, root, 'commit', 'git', ['rev-parse', 'HEAD'])).trim();
  onProgress('已提交 SHA: ' + sha);
  await command(runner, root, 'push', 'git', ['push', 'origin', 'HEAD:source'], { sha });
  onProgress('已推送，正在观察同一 SHA 的 build/deploy。');
  const deployment = await waitForDeployment({ sha, timeoutMs, root }, { run: runner });
  return { stage: 'deployed', sha, ...deployment };
}
export async function observePublication({ root, sha, timeoutMs }, { run: runner = run } = {}) {
  if (!validSha.test(sha || '')) throw fail('preflight', '需要 40 位提交 SHA');
  await checkOrigin(root, runner);
  await command(runner, root, 'preflight', 'git', ['fetch', 'origin', 'source']);
  await command(runner, root, 'preflight', 'git', ['merge-base', '--is-ancestor', sha, 'origin/source']);
  return { stage: 'deployed', sha, ...await waitForDeployment({ root, sha, timeoutMs }, { run: runner }) };
}
async function cli(args) {
  const root = process.cwd();
  const status = args[0] === 'status';
  if (status) args = args.slice(1);
  const options = { root, onProgress: text => console.log(text) };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!status && arg === '--apply') options.apply = true;
    else if ((!status && arg === '--message') || (status && arg === '--sha')) {
      if (!args[i + 1] || args[i + 1].startsWith('--')) throw fail('preflight', arg + ' 缺少值');
      options[arg === '--sha' ? 'sha' : 'message'] = args[++i];
    } else throw fail('preflight', '未知参数: ' + arg);
  }
  const out = status ? await observePublication(options) : await publishSite(options);
  console.log(out.stage === 'verified' ? '预检通过；使用 --apply --message 明确提交并发布。' : '部署成功: ' + out.sha + '\n' + out.runUrl);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  cli(process.argv.slice(2)).catch(error => {
    console.error('停止 [' + (error.stage || 'preflight') + ']: ' + error.message);
    if (error.sha) console.error('SHA: ' + error.sha);
    if (error.runUrl) console.error('部署: ' + error.runUrl);
    process.exitCode = 1;
  });
}
