import {access,readFile,writeFile,mkdir,copyFile,unlink,lstat,realpath,stat} from 'node:fs/promises';
import {constants} from 'node:fs';
import {basename,dirname,extname,join,relative,resolve,sep} from 'node:path';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const root=await realpath(process.cwd());
const [command,name,...args]=process.argv.slice(2);
function stem(value){
 if(typeof value!=='string'||!value.trim()||/[\/\\\x00-\x1f]/u.test(value)||/^[.-]/u.test(value.trim())) throw new Error('请输入标题或文章文件名，不能以点或短横线开头，也不能含路径或控制字符。');
 const result=value.trim().replace(/\.md$/i,'').normalize('NFC').replace(/[^\p{L}\p{N}_-]+/gu,'-').replace(/^-+|-+$/g,'');
 if(!result)throw new Error('标题没有可用的文件名字符。');
 return result;
}
async function safePath(...parts){
 const target=resolve(root,...parts),rel=relative(root,target);
 if(rel==='..'||rel.startsWith(`..${sep}`)||rel.startsWith(sep))throw new Error('路径超出项目目录。');
 let current=root;
 for(const part of rel.split(sep)){
  current=join(current,part);
  try{if((await lstat(current)).isSymbolicLink())throw new Error('目标路径不能经过符号链接。');}catch(e){if(e.code!=='ENOENT')throw e;}
 }
 return target;
}
async function exists(file){try{await access(file);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}}
async function main(){
 await access(join(root,'_config.yml'));await access(join(root,'package.json'));
 const slug=stem(name),draft=await safePath('source','_drafts',slug+'.md'),post=await safePath('source','_posts',slug+'.md');
 if(command==='draft'){
  let template='post';
  if(args.length){if(args.length!==2||args[0]!=='--template'||!['post','note'].includes(args[1]))throw new Error('模板只能选择 post 或 note。');template=args[1];}
  const extra=template==='note'?await readFile(new URL('./templates/note.md',import.meta.url),'utf8'):'';
  if(await exists(draft)||await exists(post))throw new Error('同名草稿或文章已经存在，请换一个标题。');
  const result=spawnSync(process.execPath,[require.resolve('hexo/bin/hexo'),'new','draft',name,'--path',slug+'.md'],{cwd:root,env:{...process.env,TZ:'Asia/Shanghai'},encoding:'utf8',shell:false});
  if(result.error)throw result.error;
  if(result.status!==0)throw new Error(result.stderr||result.stdout||'创建草稿失败。');
  if(extra)await writeFile(draft,(await readFile(draft,'utf8'))+'\n'+extra);
  console.log(`已创建草稿：source/_drafts/${slug}.md\n用 npm run preview 预览。`);
 }else if(command==='publish'){
  if(args.length)throw new Error('转正式文章只接受一个草稿文件名。');
  if(!await exists(draft))throw new Error('指定草稿不存在。');
  if(await exists(post))throw new Error('正式文章已经存在，未覆盖。');
  await mkdir(dirname(post),{recursive:true});
  await copyFile(draft,post,constants.COPYFILE_EXCL);
  try{await unlink(draft);}catch(e){await unlink(post);throw e;}
  console.log(`已转为正式文章：source/_posts/${slug}.md\n原日期和内容已保留。运行 npm run verify 后再提交和推送。`);
 }else if(command==='image'){
  if(args.length!==1)throw new Error('用法：npm run image -- "文章文件名" "/绝对路径/图片.png"');
  if(!await exists(draft)&&!await exists(post))throw new Error('指定草稿或文章不存在。');
  const original=resolve(args[0]),extension=extname(original).toLowerCase();
  if(!['.png','.jpg','.jpeg','.webp','.avif'].includes(extension))throw new Error('图片格式须为 png、jpg、jpeg、webp 或 avif。');
  const info=await stat(original);if(!info.isFile())throw new Error('图片路径不是文件。');
  const imageName=basename(original);if(/[\x00-\x1f]/u.test(imageName))throw new Error('图片文件名不能含控制字符。');
  const destination=await safePath('source','img','posts',slug,imageName);
  await mkdir(dirname(destination),{recursive:true});
  await copyFile(original,destination,constants.COPYFILE_EXCL);
  const url=`/img/posts/${encodeURIComponent(slug)}/${encodeURIComponent(imageName)}`;
  console.log(`![图片](${url})`);
  if(info.size>2*1024*1024)console.error('提示：图片超过 2 MiB，可压缩后再导入；原图没有修改。');
 }else throw new Error('用法：draft 标题 [--template note] | publish 草稿名 | image 文章名 图片路径');
}
try{await main();}catch(e){console.error(e.code==='EEXIST'?'目标图片已经存在，未覆盖。':e.message);process.exitCode=1;}
