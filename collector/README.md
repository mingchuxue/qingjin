# 青衿公开考试资源候选收集器

这是**候选发现/元数据归档工具，不是自动灌入真题的爬虫**。不能把页面公开、官方转载或搜索命中当作复制许可/标准答案核验。

## 本轮真实状态（2026-11-18，UTC+8）
- 3个手工检索确认存在的公开资源：考试院评析目录、教育部转载全国卷评析报道、北京考试报英语评析版面（附版面PDF链接）。不是3套试卷。
- `state/network-trial-2026-11-18.json`：仅一轮共5次HTTP请求（含robots），教育考试网目录读取200/25115字节，保存SHA256但**不保存正文**；教育部robots请求500；北京考试报robots发生URLError，原因未进一步确认。未跳过TLS/访问控制，也未再次刷请求。
- 首轮目录链接发现8条导航/栏目URL，人工筛除并收窄路径规则，证据见`state/triage-2026-11-18.json`。剩余3条候选，只有1条有本收集器成功读取元数据/哈希；其他2条仍是人工公开研究链接。
- **核验原题0道，核验可作答真题0道**；权利未核清，未复制/分发试卷正文、第三方解析或PDF文件。当前生产练习1163道全部精编/原创（旧1127+本轮原创36）。

## 父代理后续例行任务操作
```sh
cd /workspace/qingjin
# 默认完全离线：能检查已有状态，不会请求网站
python3 collector/collect.py
# 显式联网，一轮有限请求；建议每天至多一次，不要循环重试
python3 collector/collect.py --network
python3 -m unittest discover -s collector/tests -v
```
不要由脚本建cron/routine、自动提交、自动合并、发布或改`data/`。父代理自行创建例行任务时只运行上述一轮命令，读取`state/last-run.json`、`state/state.json`；汇报新增元数据/失败，**不要把候选当入库真题**。不联网或失败不改变生产数据；已成功状态保留。默认成功源24小时内不重复；失败按1h/2h/4h…上限24h退避，429/503尊重Retry-After（60s—24h）。重试发生在后续例行运行，不当轮连刷。

## 请求约束
- `sources.json`显式白名单主机/种子/正文路径规则；单轮最多6次请求，含robots；请求间隔至少3秒、超时15秒、最大响应1.5MB。
- 遵守robots；404/410视为无规则但仍只取元数据；HTML假robots、403/500/不明规则均保守跳过。尊重Crawl-delay，超过30秒则本轮跳过而不是长时间挂起。
- 不用cookies、登录、付费接口；不降级HTTPS、不跨主机重定向、不接受URL认证信息/认证参数；发现链接仅同主机、每页最多8条，不递归抓全站。
- 只存链接、标题、来源类别、年份/地区/学科（不明为null）、题号（未拆分为null）、发现/获取日期、校验/答案出处/权利字段、正文哈希。不存原文/付费解析/PDF；当前即便许可清晰，也仍需另行人工合法获取，不自动归档正文。
- 规范化URL去重；响应SHA256重复标记duplicateOf并从uniqueCandidateCount排除；题干NFKC/空白归一化指纹用于人工暂存去重。不同原始来源仍可保留溯源别名，不能当成独立试题数。
- flock防多进程并发；每源完成原子替换+fsync检查点。不得删除state来绕过退避。状态损坏会报错，先人工恢复，不覆盖旧数据。

## 候选 → 人工核验 → 可入库（**不自动入库**）
1. 审查原始网页/PDF，填准确年份/地区/学科/题号，原文SHA256、获取日期。无法确认就保留candidate；搜索摘要/第三方题目截图不能替代原卷核对。
2. 分别确认原题使用权及解析使用权：公开发布不等于授权。可使用public-domain / licensed / written-permission；原创解析可标original-explanation，**不能用原创解析的权利替代原题许可**。填证据URL，权利不明则只留链接。
3. 独立核验题干/选项/答案，记录答案出处URL、reviewer、reviewedAt、originalVerified/answerVerified=true。结构检查器不能代替真实性、计算或法律判断。
4. 人工准备JSON（字段见`review.py:validate`），执行：
```sh
python3 collector/review.py collector/candidate-manual.json --out collector/reviewed/经审核稳定ID.json
```
闸门验证字段/白名单来源/答案/许可、计算规范化题干指纹并去重，仅写reviewed或exports，拒绝写生产目录。没有核验材料不要为了通过闸门随便填true。
5. 审校者检查暂存条目和许可证后，**另开明确的人工内容变更**：转换成既有question结构，稳定ID，sourceKind=verified-exam；将核验/权利/答案元数据置于question.provenance（reviewStatus保持ready-for-manual-import）；knowledgeIds/methodIds必须有效；完整解析，数理另算；再向`data/exam-sources.json.verifiedQuestionIds`显式列入ID。通过全套数据/DOM/离线/旧存档测试后才能发布。当前未执行这一步，数组为空。

## 当前公开来源
- https://gaokao.neea.edu.cn/html1/folder/1510/811-1.htm
- http://www.moe.gov.cn/jyb_xwfb/xw_zt/moe_357/2026/2026_zt08/mtbd/202606/t20260610_1440059.html
- https://bjksb.bjeea.cn/html/ksb/gaozhaozhuanban/2026/0922/88359.html
- 报刊版面PDF（只链接、未读取/核验原卷）：https://bjksb.bjeea.cn/uploads/soft/260922/1908%E6%9C%9F13%E7%89%88.pdf

扩充白名单需要逐站核对公开可访问范围/robots/条款和许可，不能仅换一个域名无限爬取；不明年份、地区、题号、答案必须留空。
