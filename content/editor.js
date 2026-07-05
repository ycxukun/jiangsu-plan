(function(){
'use strict';
const SUPABASE_URL='https://qnspmqsrbjcgrgpqkzgl.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_pVjv5t2S338SsCW98VvwpA_PcpXBL7V';
const AUTH_STORAGE_KEY='js-plan-auth-v1';
const BUCKET='planning-public';
const PLANNER_ROLES=new Set(['admin','consultant','planner']);
const IMAGE_EXTENSIONS=new Set(['jpg','jpeg','png','webp','gif']);
const MAX_IMAGE_BYTES=12*1024*1024;
let auth={accessToken:'',refreshToken:'',user:null};
let profile=null;
let editingId=new URLSearchParams(location.search).get('id')||'';
const $=sel=>document.querySelector(sel);
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function storageJSON(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}}
function loadSavedAuth(){const data=storageJSON(AUTH_STORAGE_KEY,{});if(data?.accessToken&&data?.user)auth={accessToken:data.accessToken,refreshToken:data.refreshToken||'',user:data.user};}
function saveAuth(){localStorage.setItem(AUTH_STORAGE_KEY,JSON.stringify({accessToken:auth.accessToken||'',refreshToken:auth.refreshToken||'',user:auth.user||null}));}
function clearAuth(){localStorage.removeItem(AUTH_STORAGE_KEY);auth={accessToken:'',refreshToken:'',user:null};profile=null;}
function decodeJwtPayload(token){try{const part=String(token||'').split('.')[1];if(!part)return null;const normalized=part.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(part.length/4)*4,'=');return JSON.parse(decodeURIComponent(escape(atob(normalized))));}catch(e){return null;}}
function isTokenExpiringSoon(token){const payload=decodeJwtPayload(token);if(!payload?.exp)return true;return payload.exp<=Math.floor(Date.now()/1000)+90;}
async function refreshSessionIfNeeded(){
  if(!auth.accessToken||!auth.user)return false;
  if(!isTokenExpiringSoon(auth.accessToken))return true;
  if(!auth.refreshToken){clearAuth();updateAccountUI();throw new Error('登录状态已过期，请重新登录。');}
  const res=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:auth.refreshToken})});
  if(!res.ok){clearAuth();updateAccountUI();throw new Error('登录状态已过期，请重新登录。');}
  const data=await res.json();
  auth={accessToken:data.access_token,refreshToken:data.refresh_token||auth.refreshToken,user:data.user||auth.user};
  saveAuth();
  await loadProfile();
  updateAccountUI();
  return true;
}
function authHeaders(extra={}){return {apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.accessToken||SUPABASE_ANON_KEY}`,'Content-Type':'application/json',...extra};}
function publicHeaders(extra={}){return {apikey:SUPABASE_ANON_KEY,'Content-Type':'application/json',...extra};}
async function apiFetch(path,options={}){if(options.auth)await refreshSessionIfNeeded();const res=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...options,headers:options.auth?authHeaders(options.headers||{}):publicHeaders(options.headers||{})});if(!res.ok)throw new Error(await res.text());return res.status===204?null:res.json();}
function normalizeRole(v){return String(v||'').trim().toLowerCase();}
function currentRole(){return normalizeRole(profile?.role||auth.user?.user_metadata?.role||auth.user?.app_metadata?.role||'');}
function isPlanner(){return Boolean(auth.user)&&PLANNER_ROLES.has(currentRole());}
function authorName(){return profile?.display_name||auth.user?.user_metadata?.display_name||auth.user?.email?.split('@')[0]||'规划师';}
async function loadProfile(){
  if(!auth.accessToken||!auth.user){profile=null;return null;}
  try{
    const rows=await apiFetch(`profiles?select=id,email,display_name,role,status&id=eq.${encodeURIComponent(auth.user.id)}`,{auth:true});
    profile=Array.isArray(rows)?rows[0]||null:null;
  }catch(err){console.warn('profile load failed',err);profile=null;}
  return profile;
}
function setStatus(text,isError=false){const el=$('#editorStatus');if(el){el.textContent=text||'';el.classList.toggle('error',Boolean(isError));}}
function updateAccountUI(){
  const pill=$('#accountPill');
  if(!pill)return;
  if(auth.user)pill.textContent=`${auth.user.email?.split('@')[0]||'账号'}｜${isPlanner()?'可发布':'只读'}`;
  else pill.textContent='未登录';
  const disabled=!isPlanner();
  $('#saveDraftBtn').disabled=disabled;
  $('#publishBtn').disabled=disabled;
  $('#uploadCoverBtn').disabled=disabled;
  $('#insertImageBtn').disabled=disabled;
  if(disabled)setStatus('请使用规划师/管理员账号登录后再写文章。',true);
}
function isSafeHttpUrl(url){return /^https?:\/\//i.test(String(url||'').trim());}
function getFileExtension(name){const m=String(name||'').match(/\.([A-Za-z0-9]{1,10})$/);return m?m[1].toLowerCase():'bin';}
function isSafeImage(file){const ext=getFileExtension(file?.name||'');return Boolean(file)&&file.size<=MAX_IMAGE_BYTES&&IMAGE_EXTENSIONS.has(ext)&&String(file.type||'').startsWith('image/');}
function imagePath(file,kind){
  const year=new Date().getFullYear();
  const userId=String(auth.user?.id||'anonymous').replace(/[^A-Za-z0-9_-]/g,'');
  const stamp=Date.now();
  const random=Math.random().toString(36).slice(2,10);
  const ext=getFileExtension(file?.name||'image.webp');
  return `articles/${kind}/${year}/${userId}/${stamp}-${random}.${ext}`;
}
async function uploadImage(file,kind){
  if(!isPlanner())throw new Error('当前账号没有上传权限。');
  if(!isSafeImage(file))throw new Error('只允许上传 12MB 以内的 jpg/png/webp/gif 图片。');
  await refreshSessionIfNeeded();
  const path=imagePath(file,kind);
  const res=await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(path).replace(/%2F/g,'/')}`,{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.accessToken}`,'Content-Type':file.type||'image/jpeg','x-upsert':'true'},body:file});
  if(!res.ok)throw new Error(await res.text());
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
}
function renderInline(raw){
  let text=esc(raw);
  text=text.replace(/!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)/gi,(m,alt,url)=>`<img src="${url}" alt="${esc(alt)}">`);
  text=text.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/gi,(m,label,url)=>`<a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a>`);
  text=text.replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
  return text;
}
function splitTableRow(line){return line.trim().replace(/^\|/,'').replace(/\|$/,'').split('|').map(v=>v.trim());}
function isTableDivider(line){return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line||'');}
function markdownToHtml(md){
  const lines=String(md||'').replace(/\r\n/g,'\n').split('\n');
  const out=[];
  let i=0;
  while(i<lines.length){
    const line=lines[i];
    if(!line.trim()){i++;continue;}
    if(/^\s*---+\s*$/.test(line)){out.push('<hr>');i++;continue;}
    const h=line.match(/^(#{1,3})\s+(.+)$/);
    if(h){out.push(`<h${h[1].length}>${renderInline(h[2])}</h${h[1].length}>`);i++;continue;}
    if(line.trim().startsWith('>')){
      const parts=[];
      while(i<lines.length&&lines[i].trim().startsWith('>')){parts.push(lines[i].replace(/^\s*>\s?/,''));i++;}
      out.push(`<blockquote>${parts.map(renderInline).join('<br>')}</blockquote>`);
      continue;
    }
    if(/^\s*-\s+/.test(line)){
      const parts=[];
      while(i<lines.length&&/^\s*-\s+/.test(lines[i])){parts.push(`<li>${renderInline(lines[i].replace(/^\s*-\s+/,''))}</li>`);i++;}
      out.push(`<ul>${parts.join('')}</ul>`);
      continue;
    }
    if(line.includes('|')&&isTableDivider(lines[i+1])){
      const header=splitTableRow(line);
      i+=2;
      const rows=[];
      while(i<lines.length&&lines[i].includes('|')&&lines[i].trim()){rows.push(splitTableRow(lines[i]));i++;}
      out.push(`<table><thead><tr>${header.map(c=>`<th>${renderInline(c)}</th>`).join('')}</tr></thead><tbody>${rows.map(row=>`<tr>${row.map(c=>`<td>${renderInline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }
    const parts=[];
    while(i<lines.length&&lines[i].trim()&&!/^(#{1,3})\s+/.test(lines[i])&&!/^\s*-\s+/.test(lines[i])&&!lines[i].trim().startsWith('>')&&!/^\s*---+\s*$/.test(lines[i])){
      parts.push(lines[i]);
      i++;
    }
    out.push(`<p>${parts.map(renderInline).join('<br>')}</p>`);
  }
  return out.join('\n')||'<p>开始写正文后，这里会实时生成公众号式预览。</p>';
}
function updatePreview(){
  const title=$('#titleInput').value.trim()||'未命名文章';
  const subtitle=$('#subtitleInput').value.trim();
  const category=$('#categoryInput').value||'志愿填报';
  const cover=$('#coverUrlInput').value.trim();
  $('#previewTitle').textContent=title;
  const sub=$('#previewSubtitle');
  sub.textContent=subtitle;
  sub.classList.toggle('hidden',!subtitle);
  $('#previewCategory').textContent=category;
  $('#previewAuthor').textContent=authorName();
  const img=$('#previewCover');
  if(isSafeHttpUrl(cover)){img.src=cover;img.classList.remove('hidden');}else{img.removeAttribute('src');img.classList.add('hidden');}
  $('#previewBody').innerHTML=markdownToHtml($('#contentInput').value);
}
function currentPayload(status){
  const title=$('#titleInput').value.trim();
  if(!title)throw new Error('请先填写文章标题。');
  const contentMd=$('#contentInput').value.trim();
  if(status==='published'&&!contentMd)throw new Error('发布文章前请先填写正文。');
  const cover=$('#coverUrlInput').value.trim();
  if(cover&&!isSafeHttpUrl(cover))throw new Error('封面图必须是 http 或 https 图片地址。');
  return {
    title,
    subtitle:$('#subtitleInput').value.trim()||null,
    summary:$('#summaryInput').value.trim()||null,
    category:$('#categoryInput').value||'志愿填报',
    cover_url:cover||null,
    content_md:contentMd,
    content_html:markdownToHtml(contentMd),
    status,
    pinned:$('#pinnedInput').value==='true',
    author_id:auth.user.id,
    author_name:authorName(),
    published_at:status==='published'?new Date().toISOString():null
  };
}
function fillForm(post){
  $('#titleInput').value=post.title||'';
  $('#subtitleInput').value=post.subtitle||'';
  $('#summaryInput').value=post.summary||'';
  $('#categoryInput').value=post.category||'志愿填报';
  $('#coverUrlInput').value=post.cover_url||'';
  $('#contentInput').value=post.content_md||'';
  $('#pinnedInput').value=post.pinned?'true':'false';
  $('#previewState').textContent=post.status==='published'?'已发布预览':'草稿预览';
  updatePreview();
}
async function loadPost(){
  if(!editingId)return;
  setStatus('正在读取文章...');
  const rows=await apiFetch(`planning_posts?select=*&id=eq.${encodeURIComponent(editingId)}&limit=1`,{auth:Boolean(auth.user)});
  const post=Array.isArray(rows)?rows[0]:null;
  if(!post)throw new Error('文章不存在，或当前账号没有权限编辑。');
  fillForm(post);
  setStatus('文章已载入。');
}
async function savePost(status){
  if(!isPlanner()){setStatus('当前账号没有发布权限。',true);return;}
  try{
    setStatus(status==='published'?'正在发布文章...':'正在保存草稿...');
    const payload=currentPayload(status);
    const rows=editingId
      ? await apiFetch(`planning_posts?id=eq.${encodeURIComponent(editingId)}`,{method:'PATCH',auth:true,headers:{Prefer:'return=representation'},body:JSON.stringify(payload)})
      : await apiFetch('planning_posts',{method:'POST',auth:true,headers:{Prefer:'return=representation'},body:JSON.stringify(payload)});
    const saved=Array.isArray(rows)?rows[0]:null;
    if(saved?.id)editingId=saved.id;
    fillForm(saved||payload);
    history.replaceState(null,'',`./editor.html?id=${encodeURIComponent(editingId)}`);
    setStatus(status==='published'?'文章已发布。':'草稿已保存。');
  }catch(err){setStatus((status==='published'?'发布失败：':'保存失败：')+err.message,true);}
}
async function handleCoverUpload(){
  try{
    const file=$('#coverFileInput').files?.[0];
    setStatus('正在上传封面...');
    const url=await uploadImage(file,'covers');
    $('#coverUrlInput').value=url;
    updatePreview();
    setStatus('封面已上传。');
  }catch(err){setStatus('封面上传失败：'+err.message,true);}
}
function insertAtCursor(textarea,text){
  const start=textarea.selectionStart||0;
  const end=textarea.selectionEnd||0;
  const before=textarea.value.slice(0,start);
  const after=textarea.value.slice(end);
  textarea.value=before+text+after;
  textarea.focus();
  textarea.selectionStart=textarea.selectionEnd=start+text.length;
}
async function handleBodyImageUpload(){
  try{
    const file=$('#bodyImageInput').files?.[0];
    setStatus('正在上传正文图片...');
    const url=await uploadImage(file,'images');
    insertAtCursor($('#contentInput'),`\n![${file.name.replace(/\.[^.]+$/,'')}](${url})\n`);
    updatePreview();
    setStatus('图片已上传并插入正文。');
  }catch(err){setStatus('正文图片上传失败：'+err.message,true);}
}
async function init(){
  loadSavedAuth();
  if(auth.user)await loadProfile();
  updateAccountUI();
  ['titleInput','subtitleInput','summaryInput','categoryInput','coverUrlInput','contentInput','pinnedInput'].forEach(id=>$('#'+id)?.addEventListener('input',updatePreview));
  $('#saveDraftBtn')?.addEventListener('click',()=>savePost('draft'));
  $('#publishBtn')?.addEventListener('click',()=>savePost('published'));
  $('#uploadCoverBtn')?.addEventListener('click',handleCoverUpload);
  $('#insertImageBtn')?.addEventListener('click',handleBodyImageUpload);
  try{await loadPost();}catch(err){setStatus(err.message,true);}
  updatePreview();
}
init();
})();
