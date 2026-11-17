# 青衿1.4.1阶段验收（待浏览器/真机）

## 版本及边界
- 网站1.4.1、Android VC10、SW qingjin-v20；原com.mingchuxue.qingjin release签名。
- 本阶段实现的是 **AI识题解答**，不是联网搜题，不承诺真题命中、OCR准确率或标准答案。识别与解题依赖用户配置的联网服务，其余原有离线功能继续可用。
- 2026-11-17（上海时间）实时官方文档：deepseek-flash 对应 DeepSeek-V4.1-Flash-1017，支持视觉；deepseek-v4-pro 不支持视觉。能力仅按官方域名+精确ID自动确认；第三方须按自己的文档手动确认，不能因同名就认定支持。
- 官方来源：
  - https://api-docs.deepseek.com/quick_start/pricing.md
  - https://api-docs.deepseek.com/api/create-chat-completion
  - https://api-docs.deepseek.com/api/list-models
- 系统相机委托无需声明本App的CAMERA权限：
  https://developer.android.com/privacy-and-security/minimize-permission-requests
- 未进行真实服务认证、真实浏览器视觉或Android真机验收。不能把自动测试通过说成以上已完成。

## 本地预览与模拟配置

稳定入口： http://127.0.0.1:8915/#/ai/photo
- 服务端：`PORT=8915 node tests/preview-server.cjs`，运行中。新的端口来源隔离，不读取旧站点的Key。
- 首次进入完成引导（仅测试资料），在设置→AI辅助选择自定义：
  - Base URL：`http://127.0.0.1:8915/mock/v1`
  - model：`mock-text`
  - Key：`sk-qingjin-mock`（公开的本地测试占位值，不是真实凭据）
- 拍照页展开“识题模型”：选择独立视觉服务，地址同上，model=`mock-vision`，Key同上，勾选已确认支持图像，保存。
- 验收样例：`/workspace/qingjin-1.4.1-delivery/fixtures/equation.jpg`（无隐私合成图）。mock固定返回示例2x+1=5，并明确“模拟”，并非真的OCR，不要按识别准确率验收mock。

## 浏览器验收流程（computerUse）
1. 390×844：从AI导师进入拍照页；从相册/文件选择合成图。检查三步工作台、状态提示、配置折叠、无横向溢出。再验844×390与桌面1440px。
2. 未选图点识题，得到明确提示。仅选择图片、旋转90°、设置四边裁剪比例并应用，都不应发AI请求；裁剪只能0–45%，可重新选择恢复原图。
3. 不勾同意直接点识题：必须拦截。勾同意后识题：目的主机/model已显示，mock返回可编辑题干；检查公式、选项/手写不确定提示。重新选图清除旧识题/解答、重新要求同意；删除图片不删除已编辑文字。
4. 修改题干，点“先给提示”→“完整分步解答”。这两次只发送文字到主模型，不再携带图片。填写自己的作答→答案核对（空作答应拦截）。参考答案可编辑。
5. 未勾核对就存错题必须拦截；核对后加入错题，重复点击不能重复。打开错题本，检查AI参考标记、解析、复习、自评。回拍照页→同类练习→结构预览→核对采纳→做题；不能绕过预览直接入库。
6. 默认/切换文本模型：官方deepseek-v4-pro即使手动确认也不能发图；第三方未标视觉不能发图。主模型仍可手动输入文字解题。主模型设置有带显示名的快捷下拉，仍可手输自定义ID；切模型不应改变服务商或Key。
7. 错误模拟：视觉独立model改`too-large`得到413，`bad-params`得到422；错误mock Key得到401；`slow`取消；`timeout`将主超时设10秒等待。题干保持，不能自动写错题。失败后改回model可重试。
8. 选图后切换其它页面再回来：图像仅当前运行内存暂存；刷新清空图片，不应出现自动上传。离开正在生成的拍照页会取消请求。已有学习数据不应因刷新丢失。
9. 导出JSON：不含任一服务的Key、不含图片dataURL；保存的题目和AI参考文字可随学习备份导出。旧1.3/1.4备份恢复仍保留成绩/收藏/错题/计划，不能覆盖Key。新视觉配置只本机保存。
10. 键盘Tab/回车可操作文件、选项、checkbox和按钮；Key是普通text键盘且可粘贴/显隐，截图需遮Key。检查深浅主题、对比度、reduced-motion与离线PWA（拍照处理可本地完成，联网识题需网络）。

## Android候选APK验收
- 用原release签名可覆盖安装旧版，VC10。升级前导出旧数据，覆盖后检查保留，不要卸载再装。
- 相机按钮必须实际拉起系统相机，拍完即使结果Intent无data也能回预览；取消拍摄可重试。未找到相机改文件选择；相册由系统文件选择器单文件授予访问。
- 委托系统相机，不申请CAMERA/图库/全盘权限；系统相机自身权限由系统处理。WebView只读本App随机命名私有临时URI，拒绝任意content/file路径；相机授权完成或取消即撤销。
- 临时原图只位于App cache：压缩完成即按随机文件名清理原图；正常退出清理，异常结束的遗留文件在下次启动清理；cache不进Android自动备份。网页重编码后图像无EXIF/GPS/原文件名。不把原图当聊天附件保存。
- 真机仍需验证厂商相机/provider差异、Android版本、系统WebView、横屏/进出后台。自动化只做原生源码静态约束、实际编译、签名与资源比对；未冒充UI自动化。
- 安卓不允许HTTP明文API（Manifest保持usesCleartextTraffic=false）；本地HTTP mock供浏览器，不能把真机访问本机127.0.0.1等同访问box。真机网络验收需要另行安全可达的HTTPS测试服务，不要关闭TLS验证或提供真实用户Key。

## 自动化与源码重建
- `npm ci && npm test`：模型、DOM、真实无浏览器Canvas、HTTP/SSE mock；测试报告位于交付目录tests.txt。
- 图片最长边1600、≤1.8MB；原图JPEG/PNG/WebP≤12MB，≤4000万像素。HEIC/GIF/PDF、批量图片、自由手绘框选、离线OCR不支持；裁剪为四边比例，旋转90°。
- `python3 scripts/prepare-android-site.py`，然后在android目录用Gradle8.14.3、JDK21、Android SDK36运行`:qingjin:assembleRelease`。原签名由外部`/workspace/android-keystore/keystore.properties`交给Gradle，不在源码/归档中。
- 仅青衿使用独立MainActivity和PhotoProvider，不修改公共壳或其它App模块。

截图目录：`/workspace/qingjin-1.4.1-delivery/screenshots/`（当前待computerUse填充）。建议命名：mobile-photo.jpg、mobile-ocr.jpg、mobile-solution.jpg、mobile-wrong.jpg、landscape.jpg、desktop.jpg、android-camera.jpg、android-preview.jpg。不得把建议文件名说成已有截图。

本次交付为待视觉验收候选；验收反馈后再确认正式线上发布。
