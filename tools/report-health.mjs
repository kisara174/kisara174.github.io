import {readFile,appendFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const marker='<!-- website-health:v1 -->';
const title='网站健康检查异常';
function validate(report){
 if(report?.schemaVersion!==1||!Number.isFinite(Date.parse(report.checkedAt))||!Array.isArray(report.checks)||!report.checks.length)throw new Error('健康报告无效。');
 const ids=new Set();
 for(const item of report.checks){
  let url;try{url=new URL(item.url);}catch{throw new Error('健康报告 URL 无效。');}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||typeof item.id!=='string'||!item.id||item.id.length>300||/[\x00-\x1f]/u.test(item.id)||ids.has(item.id)||!['pass','fail','warn'].includes(item.status)||typeof item.code!=='string'||!/^[A-Z][A-Z0-9_]{0,79}$/.test(item.code))throw new Error('健康报告字段无效。');
  ids.add(item.id);
 }
}
function fingerprint(report){return report.checks.filter(c=>c.status!=='pass').map(c=>[c.id,c.code]).sort((a,b)=>a[0].localeCompare(b[0]));}
function body(report,failed,runUrl){
 const line=value=>String(value).replaceAll('|','\\|').replaceAll('<','&lt;').replaceAll('>','&gt;');
 const checks=report.checks.filter(c=>c.status!=='pass');
 return `${marker}\n<!-- website-health-state:${JSON.stringify(failed)} -->\n\n${checks.length?'网站巡检发现异常。':'此前记录的异常已恢复。'}\n\n检查时间：${report.checkedAt}\n\n`+(checks.length?'| 检查 | 结果 | 地址 |\n| --- | --- | --- |\n'+checks.map(c=>`| ${line(c.id)} | ${c.code} | ${line(c.url)} |`).join('\n')+'\n\n':'')+(runUrl?`[查看巡检记录](${runUrl})\n`:'');
}
export async function reportHealth(report,{api,repository,runUrl}={}){
 validate(report);
 if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository||''))throw new Error('仓库配置无效。');
 if(runUrl&&!/^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/actions\/runs\/\d+$/.test(runUrl))throw new Error('运行链接无效。');
 const prefix=`/repos/${repository}/issues`;let issue;
 for(let page=1;;page++){
  const list=await api('GET',`${prefix}?state=all&per_page=100&page=${page}`);
  if(!Array.isArray(list))throw new Error('GitHub Issue 响应无效。');
  issue=list.find(i=>!i.pull_request&&i.title===title&&typeof i.body==='string'&&i.body.includes(marker));
  if(issue||list.length<100)break;
 }
 const failed=fingerprint(report),current=JSON.stringify(failed);
 const desiredState=failed.length?'open':'closed';
 if(!issue){if(!failed.length)return {action:'quiet'};const created=await api('POST',prefix,{title,body:body(report,failed,runUrl)});return {action:'created',issue:created.number};}
 let previous;try{previous=JSON.parse(issue.body.match(/<!-- website-health-state:(.*?) -->/s)?.[1]);}catch{throw new Error('已有健康 Issue 的状态记录无效，请先核对。');}
 if(!Array.isArray(previous))throw new Error('已有健康 Issue 缺少状态记录，请先核对。');
 if(JSON.stringify(previous)===current&&issue.state===desiredState)return {action:'quiet',issue:issue.number};
 const event=createHash('sha256').update(JSON.stringify([issue.body,issue.state,current,desiredState])).digest('hex');
 const eventMarker=`<!-- website-health-event:${event} -->`;
 let recorded=false;
 for(let page=1;;page++){
  const comments=await api('GET',`${prefix}/${issue.number}/comments?per_page=100&page=${page}`);
  if(!Array.isArray(comments))throw new Error('GitHub 评论响应无效。');
  if(comments.some(c=>typeof c.body==='string'&&c.body.includes(eventMarker))){recorded=true;break;}
  if(comments.length<100)break;
 }
 // Comment before updating persisted state so a failed PATCH can retry without repeating it.
 if(!recorded)await api('POST',`${prefix}/${issue.number}/comments`,{body:`${eventMarker}\n${body(report,failed,runUrl)}`});
 await api('PATCH',`${prefix}/${issue.number}`,{state:desiredState,body:body(report,failed,runUrl)});
 return {action:desiredState==='closed'?'recovered':'updated',issue:issue.number};
}
async function githubApi(method,path,payload){
 if(!process.env.GITHUB_TOKEN)throw new Error('缺少 GitHub 工作流令牌。');
 const response=await fetch('https://api.github.com'+path,{method,headers:{Accept:'application/vnd.github+json',Authorization:`Bearer ${process.env.GITHUB_TOKEN}`,'X-GitHub-Api-Version':'2022-11-28','Content-Type':'application/json'},...(payload?{body:JSON.stringify(payload)}:{}),signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new Error(`GitHub API ${method} 请求失败（HTTP ${response.status}）。`);
 return response.json();
}
async function main(){
 const args=process.argv.slice(2);if(args.length!==1)throw new Error('用法：node tools/report-health.mjs 报告路径');
 const report=JSON.parse(await readFile(resolve(args[0]),'utf8'));
 const result=await reportHealth(report,{api:githubApi,repository:process.env.GITHUB_REPOSITORY,runUrl:`https://github.com/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`});
 const message=`健康记录：${result.action}${result.issue?`，Issue #${result.issue}`:''}\n`;console.log(message);
 if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,message);
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=1;});
