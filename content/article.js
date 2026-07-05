(function(){
'use strict';
const SUPABASE_URL='https://qnspmqsrbjcgrgpqkzgl.supabase.co';
const SUPABASE_ANON_KEY='sb_publishable_pVjv5t2S338SsCW98VvwpA_PcpXBL7V';
const AUTH_STORAGE_KEY='js-plan-auth-v1';
const PLANNER_ROLES=new Set(['admin','consultant','planner']);
let auth={accessToken:'',refreshToken:'',user:null};
let profile=null;
const postId=new URLSearchParams(location.search).get('id')||'';
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
  if(!auth.refreshToken){clearAuth();throw new Error('登录状态已过期。');}
  const res=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:{apikey:SUPABASE_ANON_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:auth.refreshToken})});
  if(!res.ok){clearAuth();throw new Error('登录状态已过期。');}
  const data=await res.json();
  auth={accessToken:data.access_token,refreshToken:data.refresh_token||auth.refreshToken,user:data.user||auth.user};
  saveAuth();
  await loadProfile();
  return true;
}
function authHeaders(extra={}){return {apikey:SUPABASE_ANON_KEY,Authorization:`Bearer ${auth.accessToken||SUPABASE_ANON_KEY}`,'Content-Type':'application/json',...extra};}
function publicHeaders(extra={}){return {apikey:SUPABASE_ANON_KEY,'Content-Type':'application/json',...extra};}
async function apiFetch(path,options={}){if(options.auth)await refreshSessionIfNeeded();const res=await fetch(`${SUPABASE_URL}/rest/v1/${path}`,{...options,headers:options.auth?authHeaders(options.headers||{}):publicHeaders(options.headers||{})});if(!res.ok)throw new Error(await res.text());return res.status===204?null:res.json();}
function normalizeRole(v){return String(v||'').trim().toLowerCase();}
function currentRole(){return normalizeRole(profile?.role||auth.user?.user_metadata?.role||auth.user?.app_metadata?.role||'');}
function isPlanner(){return Boolean(auth.user)&&PLANNER_ROLES.has(currentRole());}
async function loadProfile(){
  if(!auth.accessToken||!auth.user){profile=null;return null;}
  try{
    const rows=await apiFetch(`profiles?select=id,email,display_name,role,status&id=eq.${encodeURIComponent(auth.user.id)}`,{auth:true});
    profile=Array.isArray(rows)?rows[0]||null:null;
  }catch(err){console.warn('profile load failed',err);profile=null;}
  return profile;
}
function isSafeHttpUrl(url){return /^https?:\/\//i.test(String(url||'').trim());}
function shortDate(v){try{return new Date(v).toLocaleString('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false});}catch(e){return '—';}}
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
  return out.join('\n')||'<p>这篇文章暂时没有正文。</p>';
}
function showError(message){
  $('#articleTitle').textContent='文章无法打开';
  $('#articleTime').textContent='读取失败';
  $('#articleBody').innerHTML=`<p>${esc(message)}</p>`;
}
function renderPost(post){
  document.title=`${post.title||'文章详情'}｜升学规划资讯中心`;
  $('#articleTitle').textContent=post.title||'未命名文章';
  const subtitle=$('#articleSubtitle');
  subtitle.textContent=post.subtitle||'';
  subtitle.classList.toggle('hidden',!post.subtitle);
  $('#articleCategory').textContent=post.category||'资讯';
  $('#articleAuthor').textContent=post.author_name||'好生涯早规划';
  $('#articleTime').textContent=shortDate(post.published_at||post.created_at);
  const status=$('#articleStatus');
  status.textContent=post.status==='published'?'已发布':'草稿预览';
  status.classList.toggle('hidden',post.status==='published');
  const cover=$('#articleCover');
  if(isSafeHttpUrl(post.cover_url)){cover.src=post.cover_url;cover.classList.remove('hidden');}else{cover.removeAttribute('src');cover.classList.add('hidden');}
  $('#articleBody').innerHTML=markdownToHtml(post.content_md||'');
  const edit=$('#editPostBtn');
  if(isPlanner()){edit.href=`./editor.html?id=${encodeURIComponent(post.id)}`;edit.classList.remove('hidden');}
}
async function init(){
  if(!postId){showError('缺少文章 id。');return;}
  loadSavedAuth();
  if(auth.user)await loadProfile();
  try{
    const rows=await apiFetch(`planning_posts?select=*&id=eq.${encodeURIComponent(postId)}&limit=1`,{auth:Boolean(auth.user)});
    const post=Array.isArray(rows)?rows[0]:null;
    if(!post){showError('文章不存在，或尚未发布。');return;}
    renderPost(post);
  }catch(err){showError('读取失败：'+err.message);}
}
init();
})();
