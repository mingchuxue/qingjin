// 只列运行资源，不包含测试、源码管理或任何凭据。同步版本后运行此脚本。
const fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
function files(dir){return fs.readdirSync(path.join(root,dir),{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(dir+'/'+e.name):[dir+'/'+e.name])}
const list=['./','./index.html','./favicon.svg','./manifest.webmanifest',...files('assets').filter(p=>/\.(?:js|css|woff2?|ttf)$/.test(p)).map(p=>'./'+p),...files('data').filter(p=>p.endsWith('.json')).map(p=>'./'+p)];
let s=fs.readFileSync(path.join(root,'sw.js'),'utf8');s=s.replace(/const VER = "[^"]+"/,'const VER = "qingjin-v18"').replace(/const PRECACHE = \[[\s\S]*?\];/,'const PRECACHE = '+JSON.stringify(list,null,2)+';');fs.writeFileSync(path.join(root,'sw.js'),s);console.log('预缓存资源',list.length);
