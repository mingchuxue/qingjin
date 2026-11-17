/* 青衿 · 可审计学习事件模型。无网络、无 Key、无 DOM 依赖。 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.QingjinCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const PREFIX='qingjin-academy-v1:';
const DAY=86400000;
const id=()=>globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+Math.random().toString(36).slice(2);
const date=t=>new Date((t??Date.now())+8*3600000).toISOString().slice(0,10);
function shift(d,n){return date(Date.parse(d+'T00:00:00+08:00')+n*DAY);}
function monday(d){const day=new Date(d+'T12:00:00+08:00').getUTCDay();return shift(d,-((day+6)%7));}
const bounded=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
const text=(s,n=300)=>String(s??'').slice(0,n);
function validOp(o){return o&&typeof o==='object'&&typeof o.id==='string'&&o.id.length<=300&&['study','task','pref','wrong','goal'].includes(o.type)&&Number.isFinite(o.at)&&o.at>=0;}
class Store{
 constructor(storage,now=()=>Date.now()){this.storage=storage;this.now=now;}
 ops(){const a=[];for(let i=0;i<this.storage.length;i++){const k=this.storage.key(i);if(!k?.startsWith(PREFIX+'op:'))continue;try{const o=JSON.parse(this.storage.getItem(k));if(validOp(o))a.push(o);}catch{}}
 return a.sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id));}
 put(o){if(!validOp(o))throw Error('学习事件格式不正确');const k=PREFIX+'op:'+o.id;if(this.storage.getItem(k))return false;
 this.storage.setItem(k,JSON.stringify(o));return true;}
 append(type,data,opid){const last=this.ops().reduce((n,o)=>Math.max(n,o.at),0);return this.put({id:opid||id(),type,at:Math.max(this.now(),last+0.001),...data});}
 study(e){const at=e.at??this.now();if(!['answer','review','focus','card'].includes(e.kind))throw Error('未知学习事件');
 return this.put({id:text(e.id,280),type:'study',at,kind:e.kind,qid:text(e.qid,100),subject:text(e.subject,30),correct:e.correct===true,seconds:bounded(e.seconds,0,14400),day:date(at),source:text(e.source,60),review:!!e.review});}
 task(t){if(!t.id||!t.title?.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(t.date))throw Error('请填写任务名称与日期');
 const value={id:text(t.id,100),title:text(t.title.trim(),100),date:t.date,period:t.period==='week'?'week':'day',kind:['answer','review','focus','manual'].includes(t.kind)?t.kind:'manual',subject:text(t.subject||'all',30),target:bounded(t.target,1,600),budget:bounded(t.budget,0,600),status:['open','done','skip','deleted'].includes(t.status)?t.status:'open',order:Number(t.order)||0,created:t.created??this.now()};
 this.append('task',{taskId:value.id,value});return value;}
 tasks(){const m=new Map();for(const o of this.ops())if(o.type==='task'&&o.value?.id)m.set(o.value.id,o.value);return [...m.values()].filter(t=>t.status!=='deleted').sort((a,b)=>a.order-b.order||a.created-b.created);}
 pref(key,value){if(['game','motion','quiet'].includes(key))this.append('pref',{key,value:!!value});}
 prefs(){const p={game:true,motion:true,quiet:false};for(const o of this.ops())if(o.type==='pref'&&o.key in p)p[o.key]=!!o.value;return p;}
 wrong(qid,patch){const clean={};if('tags'in patch)clean.tags=[...new Set(String(patch.tags).split(/[,，\s]+/).filter(Boolean).map(s=>text(s,20)))].slice(0,8);if('note'in patch)clean.note=text(patch.note,2000);if('reason'in patch)clean.reason=text(patch.reason,30);if('mastered'in patch)clean.mastered=!!patch.mastered;this.append('wrong',{qid:text(qid,100),patch:clean});}
 wrongMeta(qid){let p={tags:[]};for(const o of this.ops())if(o.type==='wrong'&&o.qid===qid)p={...p,...o.patch};return p;}
 events(){return this.ops().filter(o=>o.type==='study');}
 progress(t){const end=t.period==='week'?shift(monday(t.date),7):shift(t.date,1);const start=t.period==='week'?monday(t.date):t.date;
 const events=this.events().filter(e=>e.day>=start&&e.day<end&&e.at>=t.created&&(t.subject==='all'||t.subject===e.subject));
 let n=0;if(t.kind==='focus')n=events.filter(e=>e.kind==='focus').reduce((n,e)=>n+e.seconds/60,0);else n=new Set(events.filter(e=>e.kind===t.kind||(t.kind==='review'&&e.review)).map(e=>e.kind==='focus'?e.id:e.day+':'+e.qid)).size;
 return {value:Math.min(t.target,Math.floor(n)),done:t.status==='done'||(t.kind!=='manual'&&n>=t.target),skipped:t.status==='skip'};}
 ledger(){const events=this.events(),out=[],seen=new Set();for(const e of events){let key,points=0,label;
 if(e.kind==='answer'||e.kind==='review'){key=e.day+':answer:'+e.qid;points=5;label='有效练习';}
 else if(e.kind==='focus'){key=e.id;points=Math.floor(e.seconds/60);label='前台专注';}
 else {key=e.day+':card:'+e.qid;points=2;label='结论回顾';}
 if(!seen.has(key)&&points>0){seen.add(key);out.push({id:key,at:e.at,day:e.day,points,label,source:e.qid||e.source});}}
 // 挑战只看真实事件，同一日/周确定性领取，无额外写入和可重复领取按钮。
 const days=[...new Set(events.map(e=>e.day))];for(const d of days){const n=new Set(events.filter(e=>e.day===d&&(e.kind==='answer'||e.kind==='review')).map(e=>e.qid)).size;if(n>=10)out.push({id:'daily:'+d,day:d,at:Date.parse(d+'T12:00:00+08:00'),points:15,label:'日挑战 · 练透十题'});}
 for(const w of [...new Set(days.map(monday))]){const min=events.filter(e=>e.kind==='focus'&&monday(e.day)===w).reduce((s,e)=>s+e.seconds/60,0);if(min>=120)out.push({id:'weekly:'+w,day:w,at:Date.parse(w+'T12:00:00+08:00'),points:30,label:'周挑战 · 静心两小时'});}
 return out.sort((a,b)=>b.at-a.at);}
 stats(day=date(this.now())){const events=this.events(),daily=events.filter(e=>e.day===day),answers=events.filter(e=>e.kind==='answer'||e.kind==='review'),points=this.ledger().reduce((s,e)=>s+e.points,0);return {points,level:1+Math.floor(Math.sqrt(points/50)),answers:answers.length,correct:answers.filter(e=>e.correct).length,todayAnswers:daily.filter(e=>['answer','review'].includes(e.kind)).length,uniqueToday:new Set(daily.filter(e=>['answer','review'].includes(e.kind)).map(e=>e.qid)).size,minutes:Math.floor(events.filter(e=>e.kind==='focus').reduce((s,e)=>s+e.seconds,0)/60),todayMinutes:Math.floor(daily.filter(e=>e.kind==='focus').reduce((s,e)=>s+e.seconds,0)/60)};}
 migrate(state){for(const t of state.plan?.custom||[]){if(!t.id||!t.title)continue;this.put({id:'migrate:task:'+t.id,type:'task',at:1,taskId:t.id,value:{id:t.id,title:t.title,date:t.date||date(),period:'day',kind:'manual',subject:'all',target:1,budget:0,status:state.plan?.checked?.[(t.date||date())+':'+t.id]?'done':'open',order:0,created:1}});}}
 backup(){return {schema:1,ops:this.ops(),focus:this.readFocus()};}
 restore(b){if(!b||b.schema!==1||!Array.isArray(b.ops)||b.ops.length>100000||!b.ops.every(validOp))throw Error('成长备份不完整，未导入');
 for(const o of b.ops)this.put(o); // 合并，不覆盖其它标签页和已有事件
 if(b.focus&&typeof b.focus.id==='string')this.writeFocus(normalizeFocus(b.focus));}
 readFocus(){try{return normalizeFocus(JSON.parse(this.storage.getItem(PREFIX+'focus')||'null'));}catch{return null;}}
 writeFocus(f){this.storage.setItem(PREFIX+'focus',JSON.stringify(f));}
}
function normalizeFocus(f){if(!f||typeof f!=='object'||!f.id)return null;return {id:text(f.id,100),mode:f.mode==='break'?'break':'focus',subject:text(f.subject||'all',30),target:bounded(f.target,60,3600),elapsed:bounded(f.elapsed,0,3600),lastAt:Number(f.lastAt)||0,buckets:Object.fromEntries(Object.entries(f.buckets||{}).filter(([k,v])=>/^\d{4}-\d{2}-\d{2}$/.test(k)&&Number.isFinite(v)&&v>=0).map(([k,v])=>[k,Math.min(v,3600)])),done:!!f.done};}
class Focus{
 constructor(store){this.store=store;this.state=store.readFocus();this.running=false;this.last=0;}
 create(minutes=25,subject='all',mode='focus'){this.state={id:id(),mode,subject,target:bounded(minutes,1,60)*60,elapsed:0,buckets:{},done:false};this.running=false;this.store.writeFocus(this.state);}
 start(now){if(!this.state||this.state.done)this.create();this.last=now;this.running=true;}
 tick(now,visible=true){if(!this.running||!this.state||this.state.done)return false;const dt=now-this.last;this.last=now;
 if(!visible||dt<0||dt>2500){this.pause();return false;} // 系统休眠/后台不计入，要求手动恢复
 const f=this.state,add=Math.min(dt/1000,f.target-f.elapsed);f.elapsed+=add;f.lastAt=now;const day=date(now);f.buckets[day]=(f.buckets[day]||0)+add;this.store.writeFocus(f);if(f.elapsed>=f.target){this.finish();return true;}return false;}
 pause(){this.running=false;if(this.state)this.store.writeFocus(this.state);}
 finish(){const f=this.state;if(!f||f.done)return false;this.running=false; // 先写事件再写结束标志，崩溃后重试同一 id 也不会重复
 if(f.mode==='focus')for(const [day,seconds]of Object.entries(f.buckets)){if(seconds>=1)this.store.study({id:'focus:'+f.id+':'+day,kind:'focus',subject:f.subject,seconds,at:Math.min(f.lastAt||this.store.now(),Date.parse(day+'T23:59:59+08:00')),source:'专注阶段'});}
 f.done=true;this.store.writeFocus(f);return true;}
 remaining(){return Math.max(0,Math.ceil((this.state?.target||1500)-(this.state?.elapsed||0)));}
}
// 只接受可实际评分的单选/填空。所有字符串仍须由展示层转义，不能当可信 HTML。
function parseQuestions(raw,subject,allowedSubjects){let s=String(raw).trim();s=s.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'');const j=JSON.parse(s);const arr=Array.isArray(j)?j:j.questions;if(!Array.isArray(arr)||arr.length<1||arr.length>10)throw Error('应返回含 1–10 题的 questions 数组');
 return arr.map(q=>{if(!q||!['single','fill'].includes(q.type)||typeof q.stem!=='string'||!q.stem.trim()||q.stem.length>8000||typeof q.answer!=='string'||!q.answer.trim()||q.answer.length>2000)throw Error('题型、题干或答案结构不完整');
 if(q.type==='single'&&(!Array.isArray(q.options)||q.options.length!==4||!q.options.every(o=>typeof o==='string'&&o.length<2000)||!/^([A-D])$/.test(q.answer)))throw Error('单选题须有四个选项与 A–D 答案');
 if(!allowedSubjects.includes(subject))throw Error('未知学科');return {subject,type:q.type,stem:q.stem,options:q.type==='single'?q.options:[],answer:q.answer,analysis:typeof q.analysis==='string'?q.analysis:'请自行核对答案与推理。',knowledgeIds:[],methodIds:[],difficulty:2,score:5};});}
// 三方合并：仅提交当前标签页相对读取基线的变化，保留其它标签页的独立记录。
function mergeState(base,local,remote,key='') {
 const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 if(equal(local,base))return remote;
 if(equal(remote,base))return local;
 if(Array.isArray(local)&&Array.isArray(remote)){
  const b=Array.isArray(base)?base:[];
  if([...local,...remote].every(x=>typeof x==='string'))return [...new Set([...remote.filter(x=>!b.includes(x)||local.includes(x)),...local.filter(x=>!b.includes(x))])];
  const identity=x=>x&&typeof x==='object'&&(x.id||x.qid||x.at);
  if([...b,...local,...remote].every(identity)){
   const bm=new Map(b.map(x=>[identity(x),x])),lm=new Map(local.map(x=>[identity(x),x])),rm=new Map(remote.map(x=>[identity(x),x]));
   for(const [k,v] of lm)rm.set(k,mergeState(bm.get(k),v,rm.get(k)));
   for(const k of bm.keys())if(!lm.has(k))rm.delete(k);
   return [...rm.values()];
  }
  return local;
 }
 if(local&&remote&&typeof local==='object'&&typeof remote==='object'&&!Array.isArray(local)&&!Array.isArray(remote)){
  const out={...remote};for(const k of new Set([...Object.keys(base||{}),...Object.keys(local)])){
   if(!(k in local)){if(base&&k in base)delete out[k];}
   else out[k]=mergeState(base?.[k],local[k],remote[k],k);
  }return out;
 }
 if(['correct','wrong','time','times'].includes(key)&&[local,remote].every(Number.isFinite))return Math.max(0,remote+local-(Number(base)||0));
 return local;
}
return {Store,Focus,date,shift,monday,id,PREFIX,parseQuestions,validOp,mergeState};
});
