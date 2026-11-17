/* 本地静态预览 + OpenAI 兼容模拟接口。模拟 Key 不是真实凭据，不记录请求正文。 */
const http=require('http'),fs=require('fs'),path=require('path'),ROOT=path.resolve(__dirname,'..');
const port=Number(process.env.PORT||8914);
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(req.method==='OPTIONS'){res.writeHead(204,{'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'Content-Type, Authorization','Access-Control-Allow-Methods':'POST, OPTIONS'});res.end();return;}
 if(req.method==='POST'&&url.pathname==='/mock/v1/chat/completions'){
  let raw='';req.on('data',b=>{raw+=b;if(raw.length>200000)req.destroy()});req.on('end',()=>{
   res.setHeader('Access-Control-Allow-Origin','*');
   if(req.headers.authorization!=='Bearer sk-qingjin-mock'){res.writeHead(401,{'Content-Type':'application/json'});res.end(JSON.stringify({error:{message:'mock: Key invalid'}}));return;}
   let q;try{q=JSON.parse(raw)}catch{res.writeHead(400);res.end('{}');return;}
   if(q.model==='server-error'){res.writeHead(503);res.end('{"error":{"message":"mock temporary failure"}}');return;}
   const prompt=(q.messages||[]).at(-1)?.content||'',subject=(q.messages||[]).map(m=>m.content).join('\n');
   let answer=q.model==='broken'?'{"questions":[{"stem":"结构异常测试"}]}':prompt.includes('仿照')?JSON.stringify({questions:[{type:'single',stem:'若集合 A={1,2}，它的子集共有多少个？',options:['1','2','3','4'],answer:'D',analysis:'每个元素有选或不选两种状态，2×2=4。请自行核对。'},{type:'fill',stem:'计算 2+3。',answer:'5',analysis:'基础加法得 5。这是模拟服务示例，不代表真实模型能力。'}]}):prompt.includes('完整详解')?'## 完整解析（模拟）\n先列条件，再用定义与公式推导。以二元集合为例，每个元素可选或不选，所以共有 $2^2=4$ 个子集。请用原题核对过程，模型示例不保证适用于任何问题。':'## 给你一点提示（模拟）\n1. 先圈出题目条件和所求量。\n2. 回想对应定义，检查适用范围。\n\n你能先写出第一步吗？需要时再点「继续完整讲解」。';
   if(q.model==='xss')answer=JSON.stringify({questions:[{type:'fill',stem:'<img src=x onerror="alert(1)"> 计算 1+1',answer:'2',analysis:'<script>alert(1)</script>这里只应显示文字，不执行。'}]});
   if(!q.stream){res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify({choices:[{message:{content:answer}}]}));return;}
   res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache'});
   const chunks=answer.match(/.{1,9}/gs)||[];let i=0;const timer=setInterval(()=>{if(i===chunks.length){clearInterval(timer);res.end('data: [DONE]\n\n');return;}res.write('data: '+JSON.stringify({choices:[{delta:{content:chunks[i++]}}]})+'\n\n')},q.model==='slow'?300:q.model==='timeout'?35000:45);res.on('close',()=>clearInterval(timer));
  });return;
 }
 if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405);res.end();return;}
 let pathname;try{pathname=decodeURIComponent(url.pathname)}catch{res.writeHead(400);res.end();return;}
 if(pathname.split('/').some(s=>s.startsWith('.'))){res.writeHead(403);res.end();return;}
 const file=path.resolve(ROOT,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
 if(!file.startsWith(ROOT+path.sep)){res.writeHead(403);res.end();return;}
 fs.readFile(file,(err,b)=>{if(err){res.writeHead(404);res.end('Not found');return;}const types={'.html':'text/html;charset=utf-8','.js':'application/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json;charset=utf-8','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});res.end(req.method==='HEAD'?undefined:b)});
});
server.listen(port,'0.0.0.0',()=>console.log(`青衿 1.4 本地预览 http://127.0.0.1:${port}/ ; mock ${port}/mock/v1，Key: sk-qingjin-mock（仅模拟）`));
