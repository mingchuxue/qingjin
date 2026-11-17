"""只复制运行时站点到青衿独立Android源码包；不包含日志、Key或测试数据。"""
import pathlib, shutil
root=pathlib.Path(__file__).resolve().parent.parent
dest=root/'android/qingjin/siteAssets/site'
dest.mkdir(parents=True,exist_ok=True)
for name in ['index.html','manifest.webmanifest','favicon.svg','sw.js']:
    shutil.copy2(root/name,dest/name)
for name in ['assets','data']:
    shutil.copytree(root/name,dest/name,dirs_exist_ok=True)
print(dest)
