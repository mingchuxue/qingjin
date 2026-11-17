const {test}=require('node:test');
const a=require('node:assert/strict');
const {app}=require('./dom-support.cjs');
const mockKey='mock-token-not-real';
const config=(extra={})=>({cfg:{preset:'custom',baseUrl:'https://provider.example/v1',model:'vendor/exact-model-id',apiKey:mockKey,temperature:0,timeout:5,...extra},chats:[],cur:null});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn){for(let i=0;i<80;i++){if(fn())return;await wait(10)}throw Error('mock未完成');}
async function probe(x){await x.go('#/settings');x.w.document.querySelector('#ai-test').click();await until(()=>!x.w.document.querySelector('#ai-test').disabled);return x.w.document.querySelector('#ai-test-res').textContent;}
const reply=(extra={})=>new Response(JSON.stringify({choices:[{message:{content:'连通'},finish_reason:'stop',...extra}]}),{headers:{'Content-Type':'application/json'}});

test('新装DeepSeek预设使用文档中的当前ID；旧配置不静默迁移',async()=>{
 const x=await app();try{await x.go('#/settings');const d=x.w.document;a.equal(d.querySelector('#ai-base').value,'https://api.deepseek.com');a.equal(d.querySelector('#ai-model').value,'deepseek-flash');a.equal(d.querySelector('#ai-key').type,'text');}finally{x.dom.window.close()}
 const old=config({preset:'deepseek',baseUrl:'https://api.deepseek.com/v1',model:'deepseek-chat'});const y=await app({ai:old});try{await y.go('#/settings');const d=y.w.document;a.equal(d.querySelector('#ai-base').value,old.cfg.baseUrl);a.equal(d.querySelector('#ai-model').value,'deepseek-chat');a.match(d.querySelector('#view').textContent,/旧版官方模型名/);a.equal(JSON.parse(y.w.localStorage.getItem('qingjin-ai-v1')).cfg.model,'deepseek-chat');}finally{y.dom.window.close()}
});

test('根地址、v1、完整endpoint和query均正确拼接，不擅自增加v1',async()=>{
 for(const [base,want] of [
  ['https://provider.example','https://provider.example/chat/completions'],
  ['https://provider.example/v1/','https://provider.example/v1/chat/completions'],
  ['https://provider.example/v1/chat/completions/','https://provider.example/v1/chat/completions'],
  ['https://provider.example/v1/chat/completions?api-version=mock','https://provider.example/v1/chat/completions?api-version=mock'],
  ['https://provider.example/v1?route=mock#local','https://provider.example/v1/chat/completions?route=mock']]){
  let request;const x=await app({ai:config({baseUrl:base}),fetch:async(url,opts)=>{request={url,body:JSON.parse(opts.body)};return reply()}});try{a.match(await probe(x),/连接成功/);a.equal(request.url,want);a.equal(request.body.model,'vendor/exact-model-id');a.equal(request.body.stream,false);a.equal(request.body.max_tokens,256);a.equal(request.body.temperature,0);a.equal(request.body.messages[0].role,'user');a.equal('thinking' in request.body,false);a.deepEqual(x.errors,[]);}finally{x.dom.window.close()}
 }
});

test('HTTP200但思考耗尽token：连接测试报告未完成，不误报未接通或冒充最终答案',async()=>{
 const x=await app({ai:config(),fetch:async()=>reply({message:{content:'',reasoning_content:'mock思考内容'},finish_reason:'length'})});try{const text=await probe(x);a.match(text,/测试未完成.*接口已响应.*token 上限/);a.doesNotMatch(text,/连接失败|连接成功|mock思考内容/);a.deepEqual(x.errors,[]);}finally{x.dom.window.close()}
});

test('流式只返回思考不作为最终答案；普通对话temperature=0保留',async()=>{
 let payload;const x=await app({ai:config(),fetch:async(url,opts)=>{payload=JSON.parse(opts.body);return new Response('data: '+JSON.stringify({choices:[{delta:{reasoning_content:'仅思考'},finish_reason:'length'}]})+'\n\ndata: [DONE]\n\n')}});try{await x.go('#/ai');const d=x.w.document;d.querySelector('#ai-text').value='mock问题';d.querySelector('#ai-send').click();await until(()=>d.querySelector('.ai-err'));a.match(d.querySelector('.ai-err').textContent,/接口已响应.*token 上限/);a.equal(payload.temperature,0);a.equal(payload.stream,true);a.equal('max_tokens' in payload,false);a.deepEqual(x.errors,[]);}finally{x.dom.window.close()}
});

test('不兼容协议或错误地址在发送前说明，不泄露配置、不发网络请求',async()=>{
 for(const baseUrl of ['https://provider.example/anthropic','https://provider.example/v1/messages','https://provider.example/v1/responses','not-a-url','file:///mock','https://name:password@provider.example/v1']){
  let requests=0;const x=await app({ai:config({baseUrl}),fetch:async()=>{requests++;return reply()}});try{const text=await probe(x);a.match(text,/连接失败.*(Base URL|Chat Completions)/);a.equal(requests,0);a.doesNotMatch(text,/password|mock-token-not-real/);a.deepEqual(x.errors,[]);}finally{x.dom.window.close()}
 }
});

test('422显示参数错误、404不误导必须v1，错误正文Key仍脱敏',async()=>{
 for(const status of [422,404]){const x=await app({ai:config(),fetch:async()=>new Response(JSON.stringify({error:{message:'mock rejected '+mockKey}}),{status})});try{const text=await probe(x);a.match(text,new RegExp(String(status)));if(status===422)a.match(text,/请求参数被拒绝/);else a.match(text,/精确 model ID/);a.doesNotMatch(text,/一般以 \/v1|mock-token-not-real/);a.deepEqual(x.errors,[]);}finally{x.dom.window.close()}}
});

test('模拟Android原生SocketTimeout映射为超时而非CORS',async()=>{
 const x=await app({ai:config(),setup:w=>{w.__AppBridge={httpStream:id=>queueMicrotask(()=>w.__appHttp(id,'error','SocketTimeoutException')),httpAbort:()=>{}}}});try{const text=await probe(x);a.match(text,/原生网络.*超时/);a.doesNotMatch(text,/CORS/);a.deepEqual(x.errors,[]);}finally{x.dom.window.close()}
});

test('模拟Android桥SSE错误立即reject而非悬挂到timeout，旧HTTP错误状态仍保留',async()=>{
 for(const status of [200,401]){let aborts=0;const x=await app({ai:config(),setup:w=>{w.__AppBridge={httpStream:id=>queueMicrotask(()=>{w.__appHttp(id,'status',String(status));const body=JSON.stringify({error:{message:'mock '+mockKey}});w.__appHttp(id,'data',status===200?'data: '+body+'\n\n':body);w.__appHttp(id,'end','')}),httpAbort:()=>{aborts++}}}});try{const text=await probe(x);a.match(text,status===200?/服务商返回错误/:/401/);a.doesNotMatch(text,/超时|mock-token-not-real/);a.equal(aborts,status===200?1:0);a.deepEqual(x.errors,[]);}finally{x.dom.window.close()}}
});
