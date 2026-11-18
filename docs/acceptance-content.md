# 1.5.1 修复后最短浏览器验收（待父代理执行）
预览：`http://127.0.0.1:8916/`（沿用，已`Cache-Control: no-cache`）。如需重启：`PORT=8916 node tests/preview-server.cjs`。版本 1.5.1 / VC12 / SW qingjin-v22。手机390×844、桌面1440宽各走一遍，不使用真实Key、不发送真实试题/私人图片。

1. `#/content`：9科，每科2个专题，18知识/18方法/18条件结论/36原创题；明确非真题，卡片不溢出，键盘能访问链接。
2. `#/knowledge/math/ct-math-k-01`：适用前提、推理、易错点、目录关联免责声明、方法和两道题。开始练习，填`3/4`应正确。回到首页「最近练习」应出现该次有效提交，不得写「还没有练习记录」。`#/stats`顶部「有效提交（单题，含自评）」与热力图次数必须一致（均为1，若仅此一次）。展开 `#/conclusions/chinese/ct-chinese-c-01`、`politics/ct-politics-c-01`、`history/ct-history-c-02` 的「查看解答」，应看到完整解析。刷新后旧成绩/收藏/计划/错题仍在。
3. `#/conclusions/chinese/ct-chinese-c-01`、`#/conclusions/politics/ct-politics-c-01`、`#/conclusions/history/ct-history-c-02`：有条件、推导、完整例题/解析；不把教学自拟诗句/史料当原文，法律条款有范围和抓取超时说明。
4. `#/textbook/english/en-x2-1-1`：英语技能关联可见，注明主题/技能迁移，不能误认为该单元专讲所有语法。检查地理新专题有条件而非背口诀。
0. 顶栏搜索占位应为完整短句「搜索知识、题目」，不得出现「搜索知识点、结论、教材、」这种半截逗号。内容页（#/content）最后一张专题卡片的按钮不被「问AI」挡住，底部导航可点。
5. `#/sources`：来源资源3条，可作答真题**0**；不是3套卷或0练习。筛2026+北京+英语应1条，历史或已核验应0；搜索/重置有效。原始页面/PDF是外链，没有候选开始作答按钮；标准答案/版权显示待核，不声称PDF完整原卷或已核验。
6. 旧功能回归：计划创建/完成、错题搜索/重做、成长账本、专注暂停恢复；AI未配置仍可普通练习；拍照选图/预览/删除和未同意不发送；可用旧mock地址`http://127.0.0.1:8916/mock/v1`、模型`vision-mock`、固定模拟Key`sk-qingjin-mock`（仅本地模拟）。真实API和真机仍另测。
7. 备份导出→恢复一个测试备份（不要真实用户备份）；查看旧ID记录保留。PWA加载一次后离线刷新`#/sources`/`#/content`及新题，SW为qingjin-v21，不清理其他App缓存。
8. APK覆盖安装1.4.1或未发布的1.5.0：应显示1.5.1 VC12，原release证书不变。、旧资料/AI配置仍保留、无需联网可看新专题与来源索引元数据；外链在外部浏览器打开；相机/原生流式桥留真机验证。

截图保存`/workspace/qingjin-content-delivery/screenshots/`，建议`390-content.png`、`390-sources.png`、`390-new-practice.png`、`1440-content.png`、`1440-sources.png`。本轮执行者未操作浏览器，不把DOM测试当视觉/真机实测。
