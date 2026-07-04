(function(){
  'use strict';
  var STORAGE_KEY='js-plan-bg-theme-v1';
  var THEMES=[
    {value:'eye',label:'护眼'},
    {value:'paper',label:'羊皮纸'},
    {value:'glass',label:'玻璃浅色'},
    {value:'warm',label:'暖色'}
  ];
  function validTheme(value){
    return THEMES.some(function(item){return item.value===value;})?value:'eye';
  }
  function savedTheme(){
    try{return validTheme(localStorage.getItem(STORAGE_KEY)||'eye');}
    catch(e){return 'eye';}
  }
  function applyTheme(value){
    var theme=validTheme(value);
    document.body.setAttribute('data-bg-theme',theme);
    try{localStorage.setItem(STORAGE_KEY,theme);}catch(e){}
    var select=document.getElementById('bgThemeSelect');
    if(select)select.value=theme;
  }
  function buildSwitcher(){
    if(document.getElementById('bgThemeSwitcher'))return;
    var wrap=document.createElement('label');
    wrap.id='bgThemeSwitcher';
    wrap.className='theme-switcher';
    wrap.innerHTML='<span>背景</span><select id="bgThemeSelect" aria-label="背景主题">'+THEMES.map(function(item){
      return '<option value="'+item.value+'">'+item.label+'</option>';
    }).join('')+'</select>';
    document.body.appendChild(wrap);
    var select=document.getElementById('bgThemeSelect');
    select.addEventListener('change',function(){applyTheme(select.value);});
    applyTheme(savedTheme());
  }
  function init(){
    applyTheme(savedTheme());
    buildSwitcher();
  }
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',init);
  }else{
    init();
  }
})();
