import http from 'node:http';
import https from 'node:https';
import {readFile,mkdir,writeFile,appendFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {parseHTML} from 'linkedom';

function errorCode(error){
 const codes={ERR_TLS_CERT_ALTNAME_INVALID:'CERT_HOSTNAME',CERT_HAS_EXPIRED:'CERT_EXPIRED',DEPTH_ZERO_SELF_SIGNED_CERT:'CERT_UNTRUSTED',UNABLE_TO_VERIFY_LEAF_SIGNATURE:'CERT_UNTRUSTED',ENOTFOUND:'DNS_ERROR',ECONNREFUSED:'CONNECT_ERROR',ECONNRESET:'CONNECT_ERROR',ETIMEDOUT:'TIMEOUT'};
 if(codes[error.code])return codes[error.code];
 return ['TIMEOUT','REDIRECT_LIMIT','CONTENT_TOO_LARGE','PROTOCOL_INVALID'].includes(error.code)?error.code:'NETWORK_ERROR';
}
export async function requestUrl(input,{address,timeoutMs=10000,maxRedirects=5}={}){
 const deadline=Date.now()+timeoutMs;let url=new URL(input);
 for(let hop=0;hop<=maxRedirects;hop++){
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Object.assign(new Error('Invalid protocol'),{code:'PROTOCOL_INVALID'});
  const remaining=deadline-Date.now();if(remaining<=0)throw Object.assign(new Error('Timeout'),{code:'TIMEOUT'});
  const response=await new Promise((done,reject)=>{
   const options={agent:false,headers:{Accept:'text/html, application/json, application/xml, text/css, text/javascript','User-Agent':'Kisara-Website-Health/1.0'}};
   if(address){options.family=4;options.autoSelectFamily=false;options.lookup=(_,opts,cb)=>cb(null,address,4);options.servername=url.hostname;}
   const req=(url.protocol==='https:'?https:http).get(url,options,res=>{
    const certificate=res.socket?.getPeerCertificate?.();
    let length=0;const chunks=[];
    res.on('data',chunk=>{length+=chunk.length;if(length>2*1024*1024)req.destroy(Object.assign(new Error('Large body'),{code:'CONTENT_TOO_LARGE'}));else chunks.push(chunk);});
    res.on('error',reject);
    res.on('end',()=>done({statusCode:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString('utf8'),url:url.href,certificate}));
   });
   const timer=setTimeout(()=>req.destroy(Object.assign(new Error('Timeout'),{code:'TIMEOUT'})),remaining);
   req.on('error',reject);req.on('close',()=>clearTimeout(timer));
  });
  if([301,302,303,307,308].includes(response.statusCode)&&response.headers.location){
   if(hop===maxRedirects)throw Object.assign(new Error('Redirect limit'),{code:'REDIRECT_LIMIT'});
   const next=new URL(response.headers.location,url);
   if(address&&next.hostname!==url.hostname)throw Object.assign(new Error('Origin changed host'),{code:'PROTOCOL_INVALID'});
   url=next;continue;
  }
  return response;
 }
}
function contentValid(target,response){
 const type=response.headers['content-type']||'',body=response.body;
 if(target.kind==='html'){
  const {document}=parseHTML(body);
  if(!type.includes('text/html')||!document.querySelector('title')?.textContent.trim()||!body.includes('Kisara'))return false;
  if(target.canonical){
   const canonical=document.querySelector('link[rel="canonical"]')?.getAttribute('href')||document.querySelector('meta[property="og:url"]')?.getAttribute('content');
   if(!canonical)return false;
   try{const actual=new URL(canonical,response.url);actual.pathname=actual.pathname.replace(/\/index\.html$/, '/');if(actual.href!==new URL(target.canonical).href)return false;}catch{return false;}
  }
  return true;
 }
 if(target.kind==='xml'){return /(?:xml)/i.test(type)&&/^\s*(?:<\?xml[^>]*>\s*)?<search\b/.test(body)&&body.includes('<entry>')&&body.includes('</entry>')&&/<\/search>\s*$/.test(body);}
 if(target.kind==='css')return /text\/css/i.test(type)&&body.includes('.');
 return true;
}
export async function checkTarget(target,{transport=requestUrl,timeoutMs=10000,now=new Date()}={}){
 const base={id:target.id,url:target.url};
 for(let attempt=0;attempt<2;attempt++){
  let result;
  try{
   const response=await transport(target.url,{address:target.address,timeoutMs,maxRedirects:5});
   result={...base,status:'pass',code:'OK',httpStatus:response.statusCode};
   if(response.statusCode!==200)result={...result,status:'fail',code:`HTTP_${response.statusCode}`};
   else if(target.expectedUrl&&new URL(response.url).href!==new URL(target.expectedUrl).href)result={...result,status:'fail',code:'REDIRECT_INVALID'};
   else if(!contentValid(target,response))result={...result,status:'fail',code:'CONTENT_INVALID'};
   else if(target.kind==='tls'){
    const expires=Date.parse(response.certificate?.valid_to);
    if(!Number.isFinite(expires))result={...result,status:'fail',code:'CERT_MISSING'};
    else{result.expiresAt=new Date(expires).toISOString();const remaining=expires-new Date(now).getTime();if(remaining<=0)result={...result,status:'fail',code:'CERT_EXPIRED'};else if(remaining<21*86400000)result={...result,status:'warn',code:'CERT_EXPIRING'};}
   }
  }catch(e){result={...base,status:'fail',code:errorCode(e)};}
  if(result.status!=='fail'||attempt===1)return result;
 }
}
export async function runChecks(targets,options={}){
 const checks=new Array(targets.length);let cursor=0;
 await Promise.all(Array.from({length:Math.min(4,targets.length)},async()=>{while(cursor<targets.length){const i=cursor++;checks[i]=await checkTarget(targets[i],options);}}));
 return {schemaVersion:1,checkedAt:new Date(options.now||Date.now()).toISOString(),checks};
}
export async function siteTargets(root=process.cwd()){
 const baseline=JSON.parse(await readFile(resolve(root,'docs/maintenance/baseline.json'),'utf8'));
 const base=baseline.siteUrl;const host=new URL(base).hostname,apex=host.startsWith('www.')?host.slice(4):host;
 const targets=[...baseline.requiredPaths,...baseline.articlePaths].map(path=>({id:`page:${path}`,url:new URL(path,base).href,canonical:new URL(path,base).href,kind:'html'}));
 targets.push({id:'search',url:new URL(baseline.searchIndex,base).href,kind:'xml'},{id:'css',url:new URL('/css/custom.css',base).href,kind:'css'});
 for(const url of [`http://${host}/`,`http://${apex}/`,`https://${apex}/`])targets.push({id:`redirect:${url}`,url,kind:'redirect',expectedUrl:new URL('/',base).href});
 targets.push({id:'redirect:query',url:`http://${host}/archives/?utm_source=health-check`,kind:'redirect',expectedUrl:`${base}/archives/?utm_source=health-check`},{id:'tls:edge',url:`${base}/`,kind:'tls'},{id:'tls:origin',url:`${base}/`,kind:'tls',address:'185.199.108.153'});
 return targets;
}
export function summary(report){
 const failed=report.checks.filter(c=>c.status!=='pass');
 return `### 网站健康检查\n\n站点状态：${failed.length?'存在异常':'全部通过'}；${report.checks.length-failed.length}/${report.checks.length} 项通过。\n\n| 项目 | 状态 | 结果 |\n| --- | --- | --- |\n`+report.checks.map(c=>`| ${c.id.replaceAll('|','\\|')} | ${c.status} | ${c.code} |`).join('\n')+'\n';
}
async function main(){
 const args=process.argv.slice(2);if(args.length!==2||args[0]!=='--output')throw new Error('用法：node tools/check-health.mjs --output .cache/website-health.json');
 const report=await runChecks(await siteTargets());const output=resolve(args[1]);await mkdir(dirname(output),{recursive:true});await writeFile(output,JSON.stringify(report,null,2)+'\n');
 const text=summary(report);console.log(text);if(process.env.GITHUB_STEP_SUMMARY)await appendFile(process.env.GITHUB_STEP_SUMMARY,text);
 process.exitCode=report.checks.some(c=>c.status!=='pass')?1:0;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(e=>{console.error(e.message);process.exitCode=2;});
