(function(){
'use strict';
const SUPABASE_URL='https://qnspmqsrbjcgrgpqkzgl.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_pVjv5t2S338SsCW98VvwpA_PcpXBL7V';
const AUTH_STORAGE_KEY='js-plan-auth-v1';
const BUCKET='planning-public';
const MAX_FILE_BYTES=100*1024*1024;
const SAFE_EXTENSIONS=new Set(['pdf','doc','docx','ppt','pptx','xls','xlsx','csv','txt','md','jpg','jpeg','png','webp','gif','zip','rar','7z']);
const MODULES=['中外合作','志愿填报','政策解读','院校研究','专业研究','提前批','讲座资料','表格数据'];
const PLANNER_ROLES=new Set(['admin','consultant','planner']);
const FALLBACK_FILES=[
  {id:'sample-1',title:'江苏新高考志愿填报系统使用说明',category:'志愿填报',summary:'示例资料：用于演示资料列表、分类筛选与在线查看/下载入口。正式资料请登录后上传。',file_url:'',file_name:'示例资料',created_at:new Date().toISOString(),published:true,source:'sample'},
  {id:'sample-2',title:'中外合作项目核对清单',category:'中外合作',summary:'示例资料：后续可上传 PDF、Word、Excel、PPT、图片或压缩包等公开资料，供所有访问用户查看。',file_url:'',file_name:'示例资料',created_at:new Date(Date.now()-3600000).toISOString(),published:true,source:'sample'},
  {id:'sample-3',title:'综评强基报名材料清单',category:'政策解读',summary:'示例资料。',file_url:'',file_name:'示例资料',created_at:new Date(Date.now()-7200000).toISOString(),published:true,source:'sample'}
];
const FALLBACK_POSTS=[
  {id:'post-sample-1',title:'如何使用升学资讯中心发布图文',subtitle:'Markdown 图文发布示例',category:'志愿填报',summary:'这是本地示例。执行新版 Supabase SQL 后，规划师可以在线保存草稿、发布文章，并上传封面图和正文图片。',cover_url:'',content_md:'',status:'published',pinned:true,author_name:'好生涯早规划',published_at:new Date().toISOString(),created_at:new Date().toISOString(),source:'sample'},
  {id:'post-sample-2',title:'中外合作项目核对清单怎么读',subtitle:'适合家长快速判断项目风险',category:'中外合作',summary:'文章列表会展示封面、标题、摘要、分类和时间；点击后进入公众号式详情页。',cover_url:'',content_md:'',status:'published',pinned:false,author_name:'好生涯早规划',published_at:new Date(Date.now()-3600000).toISOString(),created_at:new Date(Date.now()-3600000).toISOString(),source:'sample'}
];
let auth={accessToken:'',refreshToken:'',user:null};
let profile=null;
let files=[];
let posts=[];
let selectedItem=null;
let activeCategory='';
let viewMode='posts';
let loadingFiles=false;
let loadingPosts=false;
let fileWarning='';
let postWarning='';
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
  if(!auth.refreshToken){clearAuth();updateAccountUI();throw new Error('登录状态已过期，请退出后重新登录。');}
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
function setStatus(text,isError=false){const el=$('#uploadStatus');if(el){el.textContent=text||'';el.classList.toggle('danger',Boolean(isError));}}
function normalizeRole(v){return String(v||'').trim().toLowerCase();}
function currentRole(){return normalizeRole(profile?.role||auth.user?.user_metadata?.role||auth.user?.app_metadata?.role||'');}
function isPlanner(){return Boolean(auth.user)&&PLANNER_ROLES.has(currentRole());}
function roleLabel(){const role=currentRole();if(role==='admin')return '管理员';if(role==='consultant'||role==='planner')return '规划师';return auth.user?'家长/学生':'未登录';}
async function loadProfile(){
  if(!auth.accessToken||!auth.user){profile=null;return null;}
  try{
    const rows=await apiFetch(`profiles?select=id,email,display_name,role,status&id=eq.${encodeURIComponent(auth.user.id)}`,{auth:true});
    profile=Array.isArray(rows)?rows[0]||null:null;
  }catch(err){console.warn('profile load failed',err);profile=null;}
  return profile;
}
function closeUploadRow(){const row=$('#uploadRow');if(row)row.classList.remove('open');}
function updateAccountUI(){
  const pill=$('#accountPill');
  const logout=$('#logoutBtn');
  const loginArea=$('#loginArea');
  const uploadBtn=$('#uploadBtn');
  const toggleUploadBtn=$('#toggleUploadBtn');
  const loginEntryBtn=$('#loginEntryBtn');
  const writePostBtn=$('#writePostBtn');
  const planner=isPlanner();
  if(auth.user){
    pill.textContent=`已登录：${(auth.user.email||'账号').split('@')[0]}｜${roleLabel()}`;
    logout?.classList.remove('hidden');
    loginEntryBtn?.classList.add('hidden');
    toggleUploadBtn?.classList.toggle('hidden',!planner);
    writePostBtn?.classList.toggle('hidden',!planner);
    if(loginArea)loginArea.innerHTML=planner?'<span class="status">规划师端：可上传资料、发布图文、删除内容。</span>':'<span class="status">当前账号为家长/学生端，仅可查看资料和文章。</span>';
    if(uploadBtn)uploadBtn.disabled=!planner;
    if(!planner)closeUploadRow();
  }else{
    pill.textContent='未登录';
    logout?.classList.add('hidden');
    loginEntryBtn?.classList.remove('hidden');
    toggleUploadBtn?.classList.add('hidden');
    writePostBtn?.classList.add('hidden');
    closeUploadRow();
    if(loginArea)loginArea.innerHTML='<input id="loginEmail" type="email" placeholder="规划师邮箱"><input id="loginPwd" type="password" placeholder="密码"><button id="inlineLoginBtn" class="btn primary" type="button">登录</button><span class="status">只有规划师端账号可上传、发布和删除。</span>';
    if(uploadBtn)uploadBtn.disabled=true;
    $('#inlineLoginBtn')?.addEventListener('click',login);
  }
}
async function login(){
  const email=$('#loginEmail')?.value.trim();
  const password=$('#loginPwd')?.value;
  if(!email||!password){setStatus('请先输入邮箱和密码。',true);return;}
  try{
    setStatus('正在登录...');
    const res=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    if(!res.ok)throw new Error(await res.text());
    const data=await res.json();
    auth={accessToken:data.access_token,refreshToken:data.refresh_token||'',user:data.user};
    saveAuth();
    await loadProfile();
    updateAccountUI();
    setStatus(isPlanner()?'登录成功，可以上传资料和发布文章。':'登录成功，当前账号仅可查看内容。');
    await loadAll();
  }catch(err){setStatus('登录失败：'+err.message,true);}
}
function logout(){clearAuth();updateAccountUI();setStatus('已退出登录。');loadAll();}
function getFileExtension(name){const m=String(name||'').match(/\.([A-Za-z0-9]{1,10})$/);return m?m[1].toLowerCase():'bin';}
function isSafePublicFile(file){const ext=getFileExtension(file?.name||'');return SAFE_EXTENSIONS.has(ext);}
function createSafeStoragePath(file){const year=new Date().getFullYear();const userId=String(auth.user?.id||'anonymous').replace(/[^A-Za-z0-9_-]/g,'');const stamp=Date.now();const random=Math.random().toString(36).slice(2,10);const ext=getFileExtension(file?.name||'document.bin');return `files/${year}/${userId}/${stamp}-${random}.${ext}`;}
function formatSize(n){if(!n&&n!==0)return '—';if(n<1024)return `${n}B`;if(n<1024*1024)return `${Math.round(n/1024)}KB`;return `${(n/1024/1024).toFixed(1)}MB`;}
function shortDate(v){try{return new Date(v).toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});}catch(e){return '—';}}
function fileKind(x){const mime=String(x?.mime_type||'').toLowerCase();const ext=getFileExtension(x?.file_name||x?.file_path||'');if(mime.includes('pdf')||ext==='pdf')return 'PDF';if(mime.startsWith('image/')||['jpg','jpeg','png','webp','gif'].includes(ext))return '图片';if(mime.startsWith('video/'))return '视频';if(mime.startsWith('audio/'))return '音频';if(['doc','docx'].includes(ext))return 'Word';if(['ppt','pptx'].includes(ext))return 'PPT';if(['xls','xlsx','csv'].includes(ext))return '表格';if(['zip','rar','7z'].includes(ext))return '压缩包';if(['txt','md'].includes(ext)||mime.startsWith('text/'))return '文本';return '文件';}
function canInlinePreview(x){const mime=String(x?.mime_type||'').toLowerCase();const ext=getFileExtension(x?.file_name||x?.file_path||'');return mime.includes('pdf')||ext==='pdf'||mime.startsWith('image/')||['jpg','jpeg','png','webp','gif'].includes(ext)||mime.startsWith('video/')||mime.startsWith('audio/')||['txt','md','csv'].includes(ext)||mime.startsWith('text/');}
function itemCategory(x){return String(x?.category||'其他文件').trim()||'其他文件';}
function activeRows(){return viewMode==='posts'?posts:files;}
function allModules(){
  const seen=new Set(MODULES);
  activeRows().forEach(x=>{const cat=itemCategory(x);if(cat&&!seen.has(cat))seen.add(cat);});
  return [...seen];
}
function rowsForCategory(cat){return activeRows().filter(x=>!cat||itemCategory(x)===cat);}
function latestForCategory(cat){return rowsForCategory(cat).sort((a,b)=>new Date((b.published_at||b.created_at)||0)-new Date((a.published_at||a.created_at)||0))[0]||null;}
function renderModules(){
  const strip=$('#moduleStrip');
  if(!strip)return;
  const loading=viewMode==='posts'?loadingPosts:loadingFiles;
  strip.innerHTML=allModules().map(cat=>{
    const count=rowsForCategory(cat).length;
    const latest=latestForCategory(cat);
    const latestText=loading?'读取中':latest?shortDate(latest.published_at||latest.created_at):'暂无';
    const countText=loading?'…':count;
    return `<button class="module-card ${activeCategory===cat?'active':''}" type="button" data-module="${esc(cat)}"><b>${esc(cat)}</b><span><em>${countText}</em><small>${esc(latestText)}</small></span></button>`;
  }).join('');
  document.querySelectorAll('[data-module]').forEach(btn=>btn.addEventListener('click',()=>{
    activeCategory=btn.dataset.module||'';
    const select=$('#categoryFilter');
    if(select)select.value=activeCategory;
    renderModules();
    renderList();
  }));
}
async function loadFiles(){
  loadingFiles=true;
  renderModules();
  try{
    const rows=await apiFetch('planning_articles?select=*&published=eq.true&order=created_at.desc');
    files=Array.isArray(rows)?rows:[];
    if(!files.length)files=FALLBACK_FILES;
    fileWarning='';
  }catch(err){
    files=FALLBACK_FILES;
    fileWarning=`<b>资料库暂未连通。</b>当前显示本地示例。错误：${esc(err.message)}`;
  }finally{
    loadingFiles=false;
    renderModules();
    renderList();
  }
}
async function loadPosts(){
  loadingPosts=true;
  renderModules();
  try{
    const query=isPlanner()
      ? 'planning_posts?select=*&order=pinned.desc,published_at.desc,created_at.desc'
      : 'planning_posts?select=*&status=eq.published&order=pinned.desc,published_at.desc,created_at.desc';
    const rows=await apiFetch(query,{auth:isPlanner()});
    posts=Array.isArray(rows)?rows:[];
    if(!posts.length)posts=FALLBACK_POSTS;
    postWarning='';
  }catch(err){
    posts=FALLBACK_POSTS;
    postWarning=`<b>图文文章表暂未连通。</b>当前显示本地示例。请执行新版 supabase/planning_content_schema.sql。错误：${esc(err.message)}`;
  }finally{
    loadingPosts=false;
    renderModules();
    renderList();
  }
}
async function loadAll(){
  const list=$('#articleList');
  if(list)list.innerHTML='<div class="empty">正在读取内容...</div>';
  await Promise.allSettled([loadPosts(),loadFiles()]);
}
function filteredRows(){
  const q=($('#searchInput')?.value||'').trim().toLowerCase();
  const cat=activeCategory||$('#categoryFilter')?.value||'';
  return activeRows().filter(x=>{
    const okCat=!cat||itemCategory(x)===cat;
    const text=viewMode==='posts'
      ? [x.title,x.subtitle,x.summary,x.category,x.author_name,x.status].join(' ').toLowerCase()
      : [x.title,x.summary,x.category,x.file_name,x.mime_type,fileKind(x)].join(' ').toLowerCase();
    return okCat&&(!q||text.includes(q));
  }).sort((a,b)=>{
    if(Boolean(b.pinned)!==Boolean(a.pinned))return Number(Boolean(b.pinned))-Number(Boolean(a.pinned));
    return new Date((b.published_at||b.created_at)||0)-new Date((a.published_at||a.created_at)||0);
  });
}
function renderPostList(rows,warning){
  const list=$('#articleList');
  list.className='article-list posts';
  if(!rows.length){
    list.innerHTML=`${warning?`<div class="notice">${warning}</div>`:''}<div class="empty">没有符合条件的图文文章。</div>`;
    return;
  }
  list.innerHTML=`${warning?`<div class="notice">${warning}</div>`:''}${rows.map(post=>{
    const id=esc(post.id);
    const title=esc(post.title||'未命名文章');
    const summary=esc(post.summary||post.subtitle||'暂无摘要');
    const cover=String(post.cover_url||'').trim();
    const coverHtml=/^https?:\/\//i.test(cover)?`<img src="${esc(cover)}" alt="${title}">`:'图文文章';
    const status=post.status==='published'?'已发布':'草稿';
    const editBtn=isPlanner()&&!String(post.id||'').startsWith('post-sample-')?`<a class="btn" href="./editor.html?id=${id}">编辑</a><button class="delete-file-btn" type="button" data-delete-post-id="${id}">删除</button>`:'';
    return `<article class="post-card"><a class="post-cover" href="./article.html?id=${id}">${coverHtml}</a><div class="post-info"><div class="post-meta"><span class="post-tag">${esc(post.category||'资讯')}</span>${post.pinned?'<span class="post-tag">置顶</span>':''}<span>${esc(status)}</span></div><h3>${title}</h3><p>${summary}</p><div class="post-meta"><span>${esc(post.author_name||'好生涯早规划')}</span><span>${esc(shortDate(post.published_at||post.created_at))}</span></div></div><div class="post-card-actions"><a class="btn blue" href="./article.html?id=${id}">阅读</a><span>${editBtn}</span></div></article>`;
  }).join('')}`;
  document.querySelectorAll('[data-delete-post-id]').forEach(btn=>btn.addEventListener('click',()=>deletePost(btn.dataset.deletePostId)));
}
function renderFileList(rows,warning){
  const list=$('#articleList');
  list.className='article-list';
  if(!rows.length){
    list.innerHTML=`${warning?`<div class="notice">${warning}</div>`:''}<div class="empty">没有符合条件的资料。</div>`;
    return;
  }
  list.innerHTML=`${warning?`<div class="notice">${warning}</div>`:''}${rows.map(x=>{
    const title=esc(x.title||x.file_name||'未命名资料');
    const id=esc(x.id);
    const deleteBtn=isPlanner()&&!String(x.id||'').startsWith('sample-')?`<button class="delete-file-btn" type="button" data-delete-id="${id}">删除</button>`:'';
    return `<div class="content-row"><button class="content-open" type="button" data-view-id="${id}" title="${title}">${title}</button><time class="content-time">${esc(shortDate(x.created_at))}</time>${deleteBtn}</div>`;
  }).join('')}`;
  document.querySelectorAll('[data-view-id]').forEach(row=>row.addEventListener('click',()=>{
    const item=files.find(x=>String(x.id)===String(row.dataset.viewId));
    if(!item?.file_url)return showFile(row.dataset.viewId);
    if(canInlinePreview(item))return showFile(row.dataset.viewId);
    window.open(item.file_url,'_blank','noopener');
  }));
  document.querySelectorAll('[data-delete-id]').forEach(btn=>btn.addEventListener('click',()=>deleteArticle(btn.dataset.deleteId)));
}
function renderList(){
  const list=$('#articleList');
  if(!list)return;
  const rows=filteredRows();
  const titleBase=activeCategory||$('#categoryFilter')?.value||'全部模块';
  const titleEl=$('#sectionTitle');
  const countEl=$('#sectionCount');
  const shell=$('#contentShell');
  shell?.classList.toggle('posts-mode',viewMode==='posts');
  $('#postsTab')?.classList.toggle('active',viewMode==='posts');
  $('#filesTab')?.classList.toggle('active',viewMode==='files');
  if(titleEl)titleEl.textContent=(viewMode==='posts'?'图文文章｜':'资料文件｜')+titleBase;
  if(countEl)countEl.textContent=`${rows.length} 条`;
  if(viewMode==='posts')renderPostList(rows,postWarning);
  else renderFileList(rows,fileWarning);
}
function setViewMode(mode){
  viewMode=mode;
  renderModules();
  renderList();
}
async function showFile(id){
  selectedItem=files.find(x=>String(x.id)===String(id));
  if(!selectedItem||!selectedItem.file_url)return;
  $('#viewerTitle').textContent=selectedItem.title||'文件在线查看';
  const link=$('#openPdfLink');
  link.href=selectedItem.file_url;
  link.textContent='新窗口打开/下载';
  link.classList.remove('hidden');
  const mime=String(selectedItem.mime_type||'').toLowerCase();
  const ext=getFileExtension(selectedItem.file_name||selectedItem.file_path||'');
  const url=esc(selectedItem.file_url);
  const title=esc(selectedItem.title||'文件');
  if(mime.includes('pdf')||ext==='pdf'){$('#viewerBody').innerHTML=`<iframe src="${url}#toolbar=1&navpanes=0" title="${title}" loading="lazy"></iframe>`;return;}
  if(mime.startsWith('image/')||['jpg','jpeg','png','webp','gif'].includes(ext)){$('#viewerBody').innerHTML=`<div class="media-preview"><img src="${url}" alt="${title}"></div>`;return;}
  if(mime.startsWith('video/')){$('#viewerBody').innerHTML='<div class="media-preview"><video src="'+url+'" controls preload="metadata"></video></div>';return;}
  if(mime.startsWith('audio/')){$('#viewerBody').innerHTML='<div class="media-preview"><audio src="'+url+'" controls></audio></div>';return;}
  if(['txt','md','csv'].includes(ext)||mime.startsWith('text/')){
    try{const res=await fetch(selectedItem.file_url);const text=await res.text();$('#viewerBody').innerHTML=`<pre class="text-preview">${esc(text).slice(0,120000)}</pre>`;}
    catch(e){$('#viewerBody').innerHTML='<div class="empty"><div><b>文本预览失败</b><span>请点击右上角新窗口打开或下载文件。</span></div></div>';}
    return;
  }
  $('#viewerBody').innerHTML=`<div class="empty"><div><b>${esc(fileKind(selectedItem))}暂不支持嵌入预览</b><span>Word、PPT、Excel、压缩包等文件已公开发布，可点击右上角“新窗口打开/下载”。</span></div></div>`;
}
async function deleteStorageObject(path){
  if(!path)return;
  await refreshSessionIfNeeded();
  const encoded=String(path).split('/').map(encodeURIComponent).join('/');
  const res=await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encoded}`,{method:'DELETE',headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.accessToken}`}});
  if(!res.ok&&res.status!==404)throw new Error(await res.text());
}
async function deleteArticle(id){
  if(!isPlanner()){setStatus('当前账号没有删除权限。',true);return;}
  const item=files.find(x=>String(x.id)===String(id));
  if(!item)return;
  if(!confirm(`确定删除“${item.title||item.file_name||'这份资料'}”吗？删除后公开列表不再显示。`))return;
  try{
    setStatus('正在删除资料...');
    await apiFetch(`planning_articles?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',auth:true});
    try{await deleteStorageObject(item.file_path);}catch(err){console.warn('storage delete failed',err);}
    files=files.filter(x=>String(x.id)!==String(id));
    if(selectedItem&&String(selectedItem.id)===String(id)){
      selectedItem=null;
      $('#viewerTitle').textContent='文件预览';
      $('#openPdfLink').classList.add('hidden');
      $('#viewerBody').innerHTML='<div class="empty">选择左侧文件查看。</div>';
    }
    renderModules();
    renderList();
    setStatus('资料已删除。');
  }catch(err){setStatus('删除失败：'+err.message,true);}
}
async function deletePost(id){
  if(!isPlanner()){setStatus('当前账号没有删除权限。',true);return;}
  const post=posts.find(x=>String(x.id)===String(id));
  if(!post)return;
  if(!confirm(`确定删除文章“${post.title||'未命名文章'}”吗？`))return;
  try{
    setStatus('正在删除文章...');
    await apiFetch(`planning_posts?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',auth:true});
    posts=posts.filter(x=>String(x.id)!==String(id));
    renderModules();
    renderList();
    setStatus('文章已删除。');
  }catch(err){setStatus('删除文章失败：'+err.message,true);}
}
async function uploadFile(file,path){
  await refreshSessionIfNeeded();
  const res=await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${encodeURIComponent(path).replace(/%2F/g,'/')}`,{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.accessToken}`,'Content-Type':file.type||'application/octet-stream','x-upsert':'true'},body:file});
  if(!res.ok)throw new Error(await res.text());
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path.split('/').map(encodeURIComponent).join('/')}`;
}
async function handleUpload(event){
  event.preventDefault();
  if(!auth.accessToken||!auth.user){setStatus('请先登录规划师端后再上传。',true);return;}
  if(!isPlanner()){setStatus('当前账号没有上传权限。请使用规划师端账号。',true);return;}
  try{await refreshSessionIfNeeded();}catch(err){setStatus(err.message,true);return;}
  const file=$('#fileInput').files?.[0];
  const title=$('#titleInput').value.trim();
  const category=$('#categoryInput').value;
  const summary=$('#summaryInput').value.trim();
  if(!title||!file){setStatus('请填写标题并选择文件。',true);return;}
  if(file.size>MAX_FILE_BYTES){setStatus(`文件过大：当前 ${formatSize(file.size)}，建议控制在 100MB 以内。`,true);return;}
  if(!isSafePublicFile(file)){setStatus('为保证公开资料区安全，当前只允许 PDF、Word、PPT、Excel、CSV、TXT、Markdown、常见图片和压缩包。',true);return;}
  try{
    setStatus('正在上传文件...');
    $('#progressBar').style.width='30%';
    const path=createSafeStoragePath(file);
    const publicUrl=await uploadFile(file,path);
    $('#progressBar').style.width='72%';
    setStatus('文件已上传，正在写入公开资料库...');
    await apiFetch('planning_articles',{method:'POST',auth:true,headers:{Prefer:'return=representation'},body:JSON.stringify({title,category,summary,file_url:publicUrl,file_path:path,file_name:file.name,mime_type:file.type||'application/octet-stream',file_size:file.size,published:true,created_by:auth.user.id})});
    $('#progressBar').style.width='100%';
    setStatus('上传成功，资料已公开发布。');
    event.target.reset();
    activeCategory=category;
    viewMode='files';
    const select=$('#categoryFilter');
    if(select)select.value=category;
    setTimeout(()=>{$('#progressBar').style.width='0';},800);
    await loadFiles();
  }catch(err){
    $('#progressBar').style.width='0';
    setStatus('上传失败：'+err.message+'。请确认已执行最新版 supabase/planning_content_schema.sql，并创建 planning-public 公开 bucket；如果是旧 bucket，请确认 allowed_mime_types 已放开为 null。',true);
  }
}
async function init(){
  loadSavedAuth();
  if(auth.user)await loadProfile();
  updateAccountUI();
  $('#logoutBtn')?.addEventListener('click',logout);
  $('#toggleUploadBtn')?.addEventListener('click',()=>$('#uploadRow')?.classList.toggle('open'));
  $('#uploadForm')?.addEventListener('submit',handleUpload);
  $('#searchInput')?.addEventListener('input',renderList);
  $('#categoryFilter')?.addEventListener('change',event=>{activeCategory=event.target.value||'';renderModules();renderList();});
  $('#clearFilterBtn')?.addEventListener('click',()=>{activeCategory='';const select=$('#categoryFilter');if(select)select.value='';const search=$('#searchInput');if(search)search.value='';renderModules();renderList();});
  $('#refreshBtn')?.addEventListener('click',loadAll);
  $('#postsTab')?.addEventListener('click',()=>setViewMode('posts'));
  $('#filesTab')?.addEventListener('click',()=>setViewMode('files'));
  await loadAll();
}
init();
})();
