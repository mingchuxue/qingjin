# 青衿独立Android源码

本目录只属于com.mingchuxue.qingjin，不与其它App共用修改后的Activity。

1. 根目录运行 `python3 scripts/prepare-android-site.py`，生成不纳入Git的运行时assets。
2. JDK21 / SDK36 / Gradle8.14.3，在本目录运行 `gradle :qingjin:assembleRelease`。
3. 签名沿用外部 `/workspace/android-keystore/keystore.properties`，只由Gradle读取；文件和密钥不得复制进仓库或源码归档。异地重建者需自行安全提供同一签名配置，不能改用debug签名冒充覆盖包。

相机委托系统ACTION_IMAGE_CAPTURE，URI只授予单个随机缓存文件；不申请CAMERA/图库/存储权限。Provider exported=false，仅私有cache允许的扩展名，验证canonical path。正常退出/下次启动清理缓存。文件选择器复制用户授权的contentURI至私有受限URI后再交WebView。旧学习JSON导入保留。

尚需实际真机验证厂商相机和WebView行为。源码静态测试与成功编译不替代真机测试。
