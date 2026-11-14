/* 专业详情：各分片里学校级、组级重复字段只存一份，这里展开还原成每个专业一条完整记录。
   兼容旧格式分片（MAJOR_DETAIL_PARTS），浏览器缓存里新旧混用时也能正确合并。 */
(function(){
  var out={};
  (window.MAJOR_DETAIL_PARTS||[]).forEach(function(p){Object.assign(out,p);});
  (window.MAJOR_DETAIL_CPARTS||[]).forEach(function(p){
    var S=p.S||{},G=p.G||{},R=p.R||{};
    Object.keys(R).forEach(function(k){
      var r=R[k],o=Object.assign({},S[r['~s']]||{},G[r['~g']]||{});
      Object.keys(r).forEach(function(f){if(f!=='~s'&&f!=='~g')o[f]=r[f];});
      out[k]=o;
    });
  });
  window.MAJOR_DETAILS=out;
  window.MAJOR_DETAIL_CPARTS=[];
})();
