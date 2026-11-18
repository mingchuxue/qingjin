#!/usr/bin/env python3
"""Read-only runtime verification and isolated local delivery. Never publishes.

Requires a clean committed tree. All reports go to an output directory outside
this repository; safe-write-json rejects content paths. Snapshot invariants run
again after packaging so an accidental variable reuse cannot silently corrupt data.
"""
from __future__ import annotations
import argparse, hashlib, importlib.util, json, pathlib, re, shutil, subprocess, zipfile

REPO = pathlib.Path(__file__).resolve().parent.parent
CERTIFICATE = '8b90b25c6e39f77014da89e2ff903dc159fadb6766c545ac66f40f2b8c2c928a'
SUBJECTS = ['chinese','math','english','physics','chemistry','biology','politics','history','geography']
MODULE_SPEC = importlib.util.spec_from_file_location('qingjin_safe_json', REPO/'scripts/safe-write-json.py')
SAFE_JSON = importlib.util.module_from_spec(MODULE_SPEC)
MODULE_SPEC.loader.exec_module(SAFE_JSON)


def sha(body):
    return hashlib.sha256(body).hexdigest()


def output_directory(value):
    directory = pathlib.Path(value).resolve()
    if directory == REPO or directory.is_relative_to(REPO):
        raise PermissionError('交付目录不能位于源码/运行数据目录内')
    return directory


def runtime_files():
    return sorted([REPO/name for name in ['index.html','manifest.webmanifest','favicon.svg','sw.js']]
                  + [runtime_file for folder in ['assets','data'] for runtime_file in (REPO/folder).rglob('*') if runtime_file.is_file()])


def snapshot():
    return {runtime_file.relative_to(REPO).as_posix(): sha(runtime_file.read_bytes()) for runtime_file in runtime_files()}


def validate_content():
    for category in ['knowledge','questions','methods','conclusions']:
        for subject in SUBJECTS:
            content_file = REPO/'data'/category/(subject+'.json')
            content = json.loads(content_file.read_text())
            if not isinstance(content, list) or not all(isinstance(item,dict) and isinstance(item.get('id'),str) for item in content):
                raise ValueError('内容库必须是带稳定ID的数组：'+str(content_file))


def run(args):
    destination = output_directory(args.out)
    validate_content()
    before = snapshot()
    if subprocess.check_output(['git','status','--porcelain'],cwd=REPO,text=True).strip():
        raise RuntimeError('工作区不干净，先提交再打包，避免源码与APK错位')
    head = subprocess.check_output(['git','rev-parse','HEAD'],cwd=REPO,text=True).strip()
    meta = json.loads((REPO/'data/meta.json').read_text())
    version, code = meta['appVersion'], meta['versionCode']
    if not re.fullmatch(r'\d+\.\d+\.\d+',version):
        raise ValueError('版本格式不正确')
    destination.mkdir(parents=True,exist_ok=True)
    apk_source = pathlib.Path(args.apk).resolve()
    apk_path = destination/('青衿-'+version+'.apk')
    if apk_path.resolve() != apk_source:
        shutil.copy2(apk_source,apk_path)
    build_tools = pathlib.Path(args.build_tools)
    signature = subprocess.check_output([str(build_tools/'apksigner'),'verify','--verbose','--print-certs',str(apk_path)],text=True)
    badging = subprocess.check_output([str(build_tools/'aapt'),'dump','badging',str(apk_path)],text=True)
    if CERTIFICATE not in signature.lower() or "name='com.mingchuxue.qingjin'" not in badging or f"versionCode='{code}'" not in badging or f"versionName='{version}'" not in badging:
        raise RuntimeError('APK包名/版本/原证书不一致')
    (destination/'apk-signature.txt').write_text(signature)
    (destination/'apk-badging.txt').write_text(badging)
    with zipfile.ZipFile(apk_path) as apk_archive:
        packed = {name.removeprefix('assets/site/') for name in apk_archive.namelist() if name.startswith('assets/site/') and not name.endswith('/')}
        if packed != set(before):
            raise RuntimeError('APK内置站点文件集合不一致')
        for relative, digest in before.items():
            committed = subprocess.check_output(['git','show','HEAD:'+relative],cwd=REPO)
            if sha(committed) != digest or apk_archive.read('assets/site/'+relative) != committed:
                raise RuntimeError('APK不匹配已提交内容：'+relative)
    site_zip = destination/f'qingjin-{version}-site.zip'
    with zipfile.ZipFile(site_zip,'w',zipfile.ZIP_DEFLATED) as site_archive:
        for relative in before:
            site_archive.write(REPO/relative,f'qingjin-{version}-site/'+relative)
    source_zip = destination/f'qingjin-{version}-source.zip'
    subprocess.run(['git','archive','--format=zip',f'--prefix=qingjin-{version}/','HEAD','-o',str(source_zip)],cwd=REPO,check=True)
    # No private keys, signing configuration, checkout history or user backups.
    secret_pattern = re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\b(?:sk-[A-Za-z0-9_-]{24,}|gh[pousr]_[A-Za-z0-9]{30,}|AIza[A-Za-z0-9_-]{30,})\b')
    scanned = 0
    for archive_path in [site_zip,source_zip]:
        with zipfile.ZipFile(archive_path) as archive:
            for info in archive.infolist():
                if info.is_dir():
                    continue
                archived_path = pathlib.PurePosixPath(info.filename)
                if (archived_path.suffix.lower() in {'.jks','.keystore','.p12','.pem'} or archived_path.name in {'keystore.properties','.env'} or '.git' in archived_path.parts or 'node_modules' in archived_path.parts or re.search(r'(?:user[-_]?backup|test[-_]?backup).*\.json$',archived_path.name,re.I)):
                    raise RuntimeError('归档有禁止路径：'+info.filename)
                if secret_pattern.search(archive.read(info)):
                    raise RuntimeError('归档疑似凭据，停止：'+info.filename)
                scanned += 1
    verification = {'version':version,'versionCode':code,'packageName':'com.mingchuxue.qingjin','cacheVersion':meta['cacheVersion'],
                    'sourceCommit':head,'apkSha256':sha(apk_path.read_bytes()),'originalSignerSha256':CERTIFICATE,
                    'apkSiteFilesCompared':len(before),'apkMatchesCommittedSite':True,'unexpectedApkSiteFiles':[],
                    'runtimeUnchangedByPackaging':True,'archiveEntriesScanned':scanned,'privateKeyOrCredentialMatches':0,
                    'browserVisualTested':False,'realDeviceTested':False,'realApiTested':False}
    SAFE_JSON.write_json(destination/'artifact-verification.json',verification)
    if before != snapshot():
        raise RuntimeError('打包/报告期间运行数据被改写，交付无效')
    validate_content()
    SAFE_JSON.write_json(destination/'runtime-integrity.json',{'before':before,'after':snapshot(),'unchanged':True})
    artifact_names = [apk_path.name,site_zip.name,source_zip.name]
    (destination/'SHA256SUMS.txt').write_text(''.join(sha((destination/name).read_bytes())+'  '+name+'\n' for name in artifact_names))
    if subprocess.check_output(['git','status','--porcelain'],cwd=REPO,text=True).strip():
        raise RuntimeError('打包改变了工作区，停止交付')
    print(json.dumps(verification,ensure_ascii=False,indent=2))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apk',required=True)
    parser.add_argument('--out',required=True)
    parser.add_argument('--build-tools',default='/workspace/tools/android-sdk/build-tools/36.0.0')
    run(parser.parse_args())
