(function(){
'use strict';
const SUPABASE_URL='https://qnspmqsrbjcgrgpqkzgl.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_pVjv5t2S338SsCW98VvwpA_PcpXBL7V';
const AUTH_STORAGE_KEY='js-plan-auth-v1';
const BUCKET='planning-public';
const MAX_FILE_BYTES=100*1024*1024;
const SAFE_EXTENSIONS=new Set(['pdf','doc','docx','ppt','pptx','xls','xlsx','csv','txt','md','jpg','jpeg','png','webp','gif','zip','rar','7z']);
const FALLBACK_ITEMS=[
  {id:'sample-1',title:'江苏新高考志愿填报系统使用说明',category:'讲座资料',summary:'示例资料：用于演示图文区列表、分类筛选与在线查看/下载入口。正式资料请登录后上传。',file_url:'',file_name:'示例资料',created_at:new Date().toISOString(),published:true,source:'sample'},
  {id:'sample-2',title:'中外合作项目核对清单',category:'中外合作',summary:'示例资料：后续可上传 PDF、Word、Excel、PPT、图片或压缩包等公开资料，供所有访问用户查看。',file_url:'',file_name:'示例资料',created_at:new Date().toISOString(),published:true,source:'sample'}
];
let auth={accessToken:'',refreshToken:'',expiresAt:0,user:null};
let refreshPromise=null;
let items=[];
let selectedItem=null;
const $=sel=>document.querySelector(sel);
function esc(s){return String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function storageJSON(key,fallback){try{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;}catch(e){return fallback;}}
function jwtPayload(token){
  try{
    const part=String(token||'').split('.')[1];
    if(!part)return null;
    const base64=part.replace(/-/g,'+').replace(/_/g,'/');
    return JSON.parse(atob(base64.padEnd(Math.ceil(base64.length/4)*4,'=')));
  }catch(e){return null;}
}
function tokenExpiresAt(token){return Number(jwtPayload(token)?.exp||0);}
function loadSavedAuth(){const data=storageJSON(AUTH_STORAGE_KEY,{}); if(data?.accessToken&&data?.user)auth={accessToken:data.accessToken,refreshToken:data.refreshToken||'',expiresAt:Number(data.expiresAt||tokenExpiresAt(data.accessToken)||0),user:data.user};}
function saveAuth(){localStorage.setItem(AUTH_STORAGE_KEY,JSON.stringify({accessToken:auth.accessToken||'',refreshToken:auth.refreshToken||'',expiresAt:auth.expiresAt||0,user:auth.user||null}));}
function clearAuth(){localStorage.removeItem(AUTH_STORAGE_KEY);auth={accessToken:'',refreshToken:'',expiresAt:0,user:null};}
function authHeaders(extra={}){return {apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.accessToken||SUPABASE_ANON_KEY}`,'Content-Type':'application/json',...extra};}
function publicHeaders(extra={}){return {apikey:SUPABASE_ANON_KEY,'Content-Type':'application/json',...extra};}
function authExpiredMessage(){return '登录状态已过期，请重新登录后再上传。';}
function isAuthExpiredError(text){return /exp claim|jwt expired|invalid jwt|session.*expired/i.test(String(text||''));}
function tokenNeedsRefresh(){const exp=Number(auth.expiresAt||tokenExpiresAt(auth.accessToken)||0);return !exp||exp*1000<Date.now()+60000;}
async function refreshAuthSession(){
  if(!auth.refreshToken)throw new Error(authExpiredMessage());
  const res=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:auth.refreshToken})});
  if(!res.ok){clearAuth();updateAccountUI();throw new Error(authExpiredMessage());}
  const data=await res.json();
  auth={accessToken:data.access_token||'',refreshToken:data.refresh_token||auth.refreshToken,expiresAt:Number(data.expires_at||0)||Math.floor(Date.now()/1000)+Number(data.expires_in||3600),user:data.user||auth.user};
  saveAuth();
  updateAccountUI();
}
async function ensureFreshAuth(){
  if(!auth.accessToken||!auth.user)throw new Error('请先登录后再上传。');
  if(!tokenNeedsRefresh())return;
  if(!refreshPromise)refreshPromise=refreshAuthSession().finally(()=>{refreshPromise=null;});
  await refreshPromise;
}
async function apiFetch(path,options={}){
  if(options.auth)await ensureFreshAuth();
  const doFetch=()=>fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...options,headers:options.auth?authHeaders(options.headers||{}):publicHeaders(options.headers||{})});
  let res=await doFetch();
  if(!res.ok&&options.auth){const text=await res.text();if(isAuthExpiredError(text)&&auth.refreshToken){await refreshAuthSession();res=await doFetch();if(!res.ok)throw new Error(await res.text());}else{throw new Error(text);}}
  if(!res.ok)throw new Error(await res.text());
  return res.status===204?null:res.json();
}
function setStatus(text,isError=false){const el=$('#uploadStatus'); if(el){el.textContent=text||''; el.classList.toggle('danger',Boolean(isError));}}
function updateAccountUI(){const pill=$('#accountPill');const logout=$('#logoutBtn');const login=$('#loginArea');const uploadBtn=$('#uploadBtn');if(auth.user){pill.textContent=`已登录：${(auth.user.email||'账号').split('@')[0]}`;logout.classList.remove('hidden');login.innerHTML='<span class="status">当前账号可上传公开资料。</span>';if(uploadBtn)uploadBtn.disabled=false;}else{pill.textContent='未登录';logout.classList.add('hidden');login.innerHTML='<input id="loginEmail" type="email" placeholder="邮箱"><input id="loginPwd" type="password" placeholder="密码"><button id="loginBtn" class="btn primary" type="button">登录</button>';if(uploadBtn)uploadBtn.disabled=true;$('#loginBtn')?.addEventListener('click',login);}}
async function login(){const email=$('#loginEmail')?.value.trim();const password=$('#loginPwd')?.value;if(!email||!password){setStatus('请先输入邮箱和密码。',true);return;}try{setStatus('正在登录...');const res=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});if(!res.ok)throw new Error(await res.text());const data=await res.json();auth={accessToken:data.access_token,refreshToken:data.refresh_token||'',expiresAt:Number(data.expires_at||0)||Math.floor(Date.now()/1000)+Number(data.expires_in||3600),user:data.user};saveAuth();updateAccountUI();setStatus('登录成功，可以上传公开文件。');}catch(err){setStatus('登录失败：'+err.message,true);}}
function logout(){clearAuth();updateAccountUI();setStatus('已退出登录。');}
function getFileExtension(name){const m=String(name||'').match(/\.([A-Za-z0-9]{1,10})$/);return m?m[1].toLowerCase():'bin';}
function isSafePublicFile(file){const ext=getFileExtension(file?.name||'');return SAFE_EXTENSIONS.has(ext);}
function createSafeStoragePath(file){const year=new Date().getFullYear();const userId=String(auth.user?.id||'anonymous').replace(/[^A-Za-z0-9_-]/g,'');const stamp=Date.now();const random=Math.random().toString(36).slice(2,10);const ext=getFileExtension(file?.name||'document.bin');return `files/${year}/${userId}/${stamp}-${random}.${ext}`;}
function formatSize(n){if(!n&&n!==0)return '—'; if(n<1024)return `${n}B`; if(n<1024*1024)return `${Math.round(n/1024)}KB`; return `${(n/1024/1024).toFixed(1)}MB`;}
function shortDate(v){try{return new Date(v).toLocaleDateString('zh-CN');}catch(e){return '—';}}
function fileKind(x){const mime=String(x?.mime_type||'').toLowerCase();const ext=getFileExtension(x?.file_name||x?.file_path||'');if(mime.includes('pdf')||ext==='pdf')return 'PDF';if(mime.startsWith('image/')||['jpg','jpeg','png','webp','gif'].includes(ext))return '图片';if(mime.startsWith('video/'))return '视频';if(mime.startsWith('audio/'))return '音频';if(['doc','docx'].includes(ext))return 'Word';if(['ppt','pptx'].includes(ext))return 'PPT';if(['xls','xlsx','csv'].includes(ext))return '表格';if(['zip','rar','7z'].includes(ext))return '压缩包';if(['txt','md'].includes(ext)||mime.startsWith('text/'))return '文本';return '文件';}
function canInlinePreview(x){const mime=String(x?.mime_type||'').toLowerCase();const ext=getFileExtension(x?.file_name||x?.file_path||'');return mime.includes('pdf')||ext==='pdf'||mime.startsWith('image/')||['jpg','jpeg','png','webp','gif'].includes(ext)||mime.startsWith('video/')||mime.startsWith('audio/')||['txt','md','csv'].includes(ext)||mime.startsWith('text/');}
async function loadItems(){const list=$('#articleList');list.innerHTML='<div class="article-card">正在读取资料...</div>';try{const rows=await apiFetch('planning_articles?select=*&published=eq.true&order=created_at.desc');items=Array.isArray(rows)?rows:[];if(!items.length)items=FALLBACK_ITEMS;renderList();}catch(err){items=FALLBACK_ITEMS;renderList(`<b>资料库暂未连通。</b>请先在 Supabase 执行新版 supabase/planning_content_schema.sql；当前显示本地示例。错误：${esc(err.message)}`);}}
function filteredItems(){const q=($('#searchInput')?.value||'').trim().toLowerCase();const cat=$('#categoryFilter')?.value||'';return items.filter(x=>{const okCat=!cat||x.category===cat;const text=[x.title,x.summary,x.category,x.file_name,x.mime_type,fileKind(x)].join(' ').toLowerCase();return okCat&&(!q||text.includes(q));});}
function renderList(warning=''){const list=$('#articleList');const rows=filteredItems();if(!rows.length){list.innerHTML=`${warning?`<div class="notice">${warning}</div>`:''}<div class="article-card">没有符合条件的资料。</div>`;return;}list.innerHTML=`${warning?`<div class="notice">${warning}</div>`:''}${rows.map(x=>`<article class="article-card"><div class="article-head"><div><h3>${esc(x.title||'未命名资料')}</h3><div class="article-meta"><span class="tag green">${esc(x.category||'未分类')}</span><span class="tag">${esc(fileKind(x))}</span><span class="tag">${esc(shortDate(x.created_at))}</span><span class="tag">${esc(formatSize(x.file_size))}</span>${x.source==='sample'?'<span class="tag">示例</span>':''}</div></div></div><p>${esc(x.summary||'暂无摘要。')}</p><div class="file-name">${esc(x.file_name||'未关联文件')}</div><div class="article-actions">${x.file_url?`<button class="btn primary" type="button" data-view-id="${esc(x.id)}">${canInlinePreview(x)?'在线查看':'查看详情'}</button><a class="btn" href="${esc(x.file_url)}" target="_blank" rel="noopener" download>下载/新窗口</a>`:'<span class="status">示例卡片暂无文件。</span>'}</div></article>`).join('')}`;document.querySelectorAll('[data-view-id]').forEach(btn=>btn.addEventListener('click',()=>showFile(btn.dataset.viewId)));}
async function showFile(id){selectedItem=items.find(x=>String(x.id)===String(id));if(!selectedItem||!selectedItem.file_url)return;$('#viewerTitle').textContent=selectedItem.title||'文件在线查看';const link=$('#openPdfLink');link.href=selectedItem.file_url;link.textContent='新窗口打开/下载';link.classList.remove('hidden');const mime=String(selectedItem.mime_type||'').toLowerCase();const ext=getFileExtension(selectedItem.file_name||selectedItem.file_path||'');const url=esc(selectedItem.file_url);const title=esc(selectedItem.title||'文件');if(mime.includes('pdf')||ext==='pdf'){$('#viewerBody').innerHTML=`<iframe src="${url}#toolbar=1&navpanes=0" title="${title}" loading="lazy"></iframe>`;return;}if(mime.startsWith('image/')||['jpg','jpeg','png','webp','gif'].includes(ext)){$('#viewerBody').innerHTML=`<div class="media-preview"><img src="${url}" alt="${title}"></div>`;return;}if(mime.startsWith('video/')){$('#viewerBody').innerHTML=`<div class="media-preview"><video src="${url}" controls preload="metadata"></video></div>`;return;}if(mime.startsWith('audio/')){$('#viewerBody').innerHTML=`<div class="media-preview"><audio src="${url}" controls></audio></div>`;return;}if(['txt','md','csv'].includes(ext)||mime.startsWith('text/')){try{const res=await fetch(selectedItem.file_url);const text=await res.text();$('#viewerBody').innerHTML=`<pre class="text-preview">${esc(text).slice(0,120000)}</pre>`;}catch(e){$('#viewerBody').innerHTML=`<div class="empty"><div><b>文本预览失败</b><span>请点击右上角新窗口打开或下载文件。</span></div></div>`;}return;}$('#viewerBody').innerHTML=`<div class="empty"><div><b>${esc(fileKind(selectedItem))}暂不支持嵌入预览</b><span>Word、PPT、Excel、压缩包等文件已公开发布，可点击右上角“新窗口打开/下载”。</span></div></div>`;}
async function uploadFile(file,path){
  await ensureFreshAuth();
  const url=`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(path).replace(/%2F/g,'/')}`;
  const doUpload=()=>fetch(url,{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.accessToken}`,'Content-Type':file.type||'application/octet-stream','x-upsert':'true'},body:file});
  let res=await doUpload();
  if(!res.ok){const text=await res.text();if(isAuthExpiredError(text)&&auth.refreshToken){await refreshAuthSession();res=await doUpload();if(!res.ok)throw new Error(await res.text());}else{throw new Error(text);}}
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
}
async function handleUpload(event){event.preventDefault();if(!auth.accessToken||!auth.user){setStatus('请先登录后再上传。',true);return;}const file=$('#fileInput').files?.[0];const title=$('#titleInput').value.trim();const category=$('#categoryInput').value;const summary=$('#summaryInput').value.trim();if(!title||!file){setStatus('请填写标题并选择文件。',true);return;}if(file.size>MAX_FILE_BYTES){setStatus(`文件过大：当前 ${formatSize(file.size)}，建议控制在 100MB 以内。`,true);return;}if(!isSafePublicFile(file)){setStatus('为保证公开资料区安全，当前只允许 PDF、Word、PPT、Excel、CSV、TXT、Markdown、常见图片和压缩包。',true);return;}try{setStatus('正在检查登录状态...');await ensureFreshAuth();setStatus('正在上传文件...');$('#progressBar').style.width='30%';const path=createSafeStoragePath(file);const publicUrl=await uploadFile(file,path);$('#progressBar').style.width='72%';setStatus('文件已上传，正在写入公开资料库...');await apiFetch('planning_articles',{method:'POST',auth:true,headers:{Prefer:'return=representation'},body:JSON.stringify({title,category,summary,file_url:publicUrl,file_path:path,file_name:file.name,mime_type:file.type||'application/octet-stream',file_size:file.size,published:true,created_by:auth.user.id})});$('#progressBar').style.width='100%';setStatus('上传成功，资料已公开发布。');event.target.reset();setTimeout(()=>{$('#progressBar').style.width='0';},800);await loadItems();}catch(err){$('#progressBar').style.width='0';if(String(err.message||'').includes(authExpiredMessage())){setStatus('上传失败：登录状态已过期，请退出后重新登录再上传。',true);return;}setStatus('上传失败：'+err.message+'。请确认已执行最新版 supabase/planning_content_schema.sql，并创建 planning-public 公开 bucket；如果是旧 bucket，请确认 allowed_mime_types 已放开为 null。',true);}}
function init(){loadSavedAuth();updateAccountUI();$('#logoutBtn')?.addEventListener('click',logout);$('#uploadForm')?.addEventListener('submit',handleUpload);$('#searchInput')?.addEventListener('input',()=>renderList());$('#categoryFilter')?.addEventListener('change',()=>renderList());$('#refreshBtn')?.addEventListener('click',loadItems);loadItems();}
init();
})();
