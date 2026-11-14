/* 院校/专业组/专业主数据：分片按“字段名只存一次”的表格格式保存，这里还原成原来的对象数组。
   兼容旧格式分片（DB_PARTS），浏览器缓存里新旧混用时也能正确合并。 */
(function(){
  var MISS='\u0000~';
  function obj(keys,vals){var o={};for(var i=0;i<keys.length;i++){if(vals[i]!==MISS)o[keys[i]]=vals[i];}return o;}
  var out=[];
  (window.DB_PARTS||[]).forEach(function(p){out=out.concat(p);});
  (window.CDB_PARTS||[]).forEach(function(p){
    var SK=p.K[0],GK=p.K[1],MK=p.K[2];
    p.S.forEach(function(s){
      var school=obj(SK,s[0]);
      if(s[1]){school.groups=s[1].map(function(g){var go=obj(GK,g[0]);if(g[1])go.majors=g[1].map(function(m){return obj(MK,m);});return go;});}
      out.push(school);
    });
  });
  window.DB=out;
  window.CDB_PARTS=[];
})();
