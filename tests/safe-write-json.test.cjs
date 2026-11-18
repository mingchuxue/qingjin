const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('os'),cp=require('child_process');
const root=path.resolve(__dirname,'..'),script=path.join(root,'scripts/safe-write-json.py');
test('安全写入拒绝覆盖题库和方法JSON，只允许写到交付目录',()=>{
  const meta={version:'1.5.1',apkSha256:'abc',versionCode:12};
  const payload=JSON.stringify(meta);
  const targets=['data/methods/chinese.json','data/knowledge/math.json','data/questions/english.json','data/textbook.json','assets/app.js'];
  const before=Object.fromEntries(targets.map(f=>[f,fs.readFileSync(path.join(root,f))]));
  for(const rel of targets){
    a.throws(()=>cp.execFileSync('python3',[script,path.join(root,rel),'--stdin'],{input:payload,encoding:'utf8'}),/拒绝写入/);
    a.deepEqual(fs.readFileSync(path.join(root,rel)),before[rel]);
  }
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'qingjin-delivery-'));
  const out=path.join(dir,'artifact-verification.json');
  cp.execFileSync('python3',[script,out,'--stdin'],{input:payload,encoding:'utf8'});
  a.deepEqual(JSON.parse(fs.readFileSync(out,'utf8')),meta);
  fs.rmSync(dir,{recursive:true,force:true});
});
