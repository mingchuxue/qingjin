const {test}=require('node:test'),a=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const repo=path.resolve(__dirname,'..');
test('交付工具拒绝源码内输出，导入/校验不写入运行JSON',()=>{
 const file=path.join(repo,'data/methods/chinese.json'),before=fs.readFileSync(file);
 const python=`import importlib.util,pathlib\nspec=importlib.util.spec_from_file_location('delivery',${JSON.stringify(path.join(repo,'scripts/package-delivery.py'))})\nmodule=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)\nmodule.validate_content()\nfor target in [module.REPO,module.REPO/'data',module.REPO/'data/methods',module.REPO/'assets']:\n try:module.output_directory(target)\n except PermissionError:pass\n else:raise AssertionError('must reject runtime path')\nassert module.output_directory(module.REPO.parent/'qingjin-1.5.2-delivery') != module.REPO\n`;
 cp.execFileSync('python3',['-c',python]);a.deepEqual(fs.readFileSync(file),before);a.ok(Array.isArray(JSON.parse(before)));
});
