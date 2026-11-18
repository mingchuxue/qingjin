// DOM/interaction and stylesheet contracts only: not a browser pixel/visual test.
const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {app,root}=require('./dom-support.cjs');
for(const width of [360,390,430,1440])test(`${width}宽：首/中/末滚动时问AI仅在顶栏正常流，保留按钮、搜索焦点及AI入口`,async()=>{
 let apiCalls=0;const x=await app({setup(w){Object.defineProperty(w,'innerWidth',{value:width,configurable:true});},fetch:async()=>{apiCalls++;throw Error('must not call real service');}});
 try{const d=x.w.document,storageBefore=JSON.parse(x.w.localStorage.getItem('qingjin-v1'));
  for(const scroll of [0,800,12000]){
   await x.go('#/content');Object.defineProperty(x.w,'scrollY',{value:scroll,configurable:true});x.w.dispatchEvent(new x.w.Event('scroll'));
   const action=d.querySelector('#ai-fab');a.equal(d.querySelectorAll('#ai-fab').length,1);a.ok(action.closest('#topbar .top-actions'));a.ok(!action.closest('#main'));a.equal(action.className,'ai-entry');a.equal(action.hidden,false);a.equal(action.type,'button');
   a.equal(d.querySelectorAll('.content-item .chip').length,54);a.equal(d.querySelectorAll('.bottom-nav a').length,5);
   const input=d.querySelector('#q-input');input.focus();a.equal(d.activeElement,input);a.equal(input.getAttribute('aria-label'),input.placeholder);
   action.focus();a.equal(d.activeElement,action);action.click();await new Promise(r=>setTimeout(r,60));a.equal(x.w.location.hash,'#/ai');a.equal(apiCalls,0);
  }
  const stored=JSON.parse(x.w.localStorage.getItem('qingjin-v1'));a.deepEqual(stored.plan,storageBefore.plan);a.deepEqual(stored.favorites,storageBefore.favorites);a.deepEqual(stored.wrong,storageBefore.wrong);a.deepEqual(x.errors,[]);
 }finally{x.dom.window.close();}
});
test('样式契约：问AI无fixed/absolute/bottom浮层，顶栏不透明且保留窄屏空间、底栏和键盘滚动余量',()=>{
 const css=fs.readFileSync(path.join(root,'assets/style.css'),'utf8'),academy=fs.readFileSync(path.join(root,'assets/academy.css'),'utf8');
 const action=css.match(/\.ai-entry\s*\{([^}]+)\}/)[1],header=css.match(/\.topbar\s*\{([^}]+)\}/)[1];
 a.match(action,/position:\s*static/);a.doesNotMatch(action,/position:\s*(fixed|absolute)|\bbottom\s*:|\bz-index\s*:/);a.match(action,/min-height:\s*44px/);a.match(action,/flex:\s*0 0 auto/);a.match(css,/\.ai-entry:focus-visible/);
 a.match(header,/background:\s*var\(--bg\)/);a.match(header,/backdrop-filter:\s*none/);a.doesNotMatch(header,/background:[^;]*(transparent|color-mix)/);
 a.match(css,/\.top-actions \.streak-pill\s*\{\s*display:\s*none/);a.match(css,/flex:\s*1; min-width:\s*0; max-width:\s*460px/);a.match(css,/var\(--bottom\) \+ 24px \+ var\(--safe-b\)/);a.match(css,/scroll-padding-top:/);a.match(css,/padding-left:\s*30px; font-size:\s*16px/);a.doesNotMatch(css,/--fab-space|\.ai-fab/);a.doesNotMatch(academy,/#ai-fab/);
});
test('知识详情问AI继续携带上下文，安静模式不删除正常导航控件',async()=>{
 const x=await app();try{await x.go('#/knowledge/math/ct-math-k-01');const d=x.w.document;x.w.document.documentElement.dataset.quiet='true';const action=d.querySelector('#ai-fab');a.equal(action.hidden,false);action.click();await new Promise(r=>setTimeout(r,60));a.match(d.querySelector('#view').textContent,/分段函数|接点|上下文/);a.deepEqual(x.errors,[]);}finally{x.dom.window.close();}
});
