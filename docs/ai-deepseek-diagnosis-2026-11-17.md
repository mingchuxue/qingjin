# DeepSeek V4.1 接入调查（本地待确认补丁）

调查时间：2026-11-17，Asia/Shanghai。未读取真实用户 Key，未调用认证后的真实模型服务，未操作浏览器/桌面。所有 API 调用均为 mock。用户尚未提供服务商、Base URL、精确 model ID 和错误内容，因此不能确定其具体失败根因。

## 官方实时文档确认

- 官方已有 **DeepSeek-V4.1-Flash-1017**。OpenAI 格式 Base URL 为 `https://api.deepseek.com`，API model ID 为 **`deepseek-flash`**；`DeepSeekV4.1` 是未被官方文档列为 API ID 的显示写法，不能直接等同精确 ID。
- 当前另一文档模型为 `deepseek-v4-pro`（DeepSeek-V4-Pro-0813）。不要将它称为 V4.1 Pro。
- 官方更新日志 2026-04-24 公告旧 `deepseek-chat`、`deepseek-reasoner` 名称将在 2026-07-24 停用。当前模型文档未再将它们作为当前 ID 列出；本次未用真实 Key 验证旧名现在返回哪种错误。
- `deepseek-v4-flash`、`deepseek-v4-flash-vision-exp` 当前文档注明兼容路由到 V4.1 Flash；不能把这些别名与前述两个旧 ID 混为一谈。
- 官方支持 system/user/assistant、Chat Completions 流式和非流式、`max_tokens`。思考模式默认开启；temperature 在思考模式被忽略，并非必然报错。App 不发 tools，不能把未回传历史 reasoning_content 当作本次已证实问题。

实时来源：
1. https://api-docs.deepseek.com/
2. https://api-docs.deepseek.com/quick_start/pricing.md
3. https://api-docs.deepseek.com/api/list-models
4. https://api-docs.deepseek.com/updates
5. https://api-docs.deepseek.com/api/create-chat-completion
6. https://api-docs.deepseek.com/guides/thinking_mode
7. https://api-docs.deepseek.com/quick_start/error_codes

## 1.4.0 HEAD ed44ef8 已确认问题

1. 旧预设/默认值仍为 `/v1` + `deepseek-chat/deepseek-reasoner`，模型提示落后于当前官方文档。**不能据此断言 `/v1` 已不可用**，文档推荐根地址与旧路径实际拒绝是两回事。
2. 模型输入为普通 text + datalist，没有请求白名单，能直接填写任意第三方精确 ID。点击某个服务商预设会重置不在预设列表中的当前模型；应先选预设，再改精确 ID/地址，或使用自定义。
3. 原 URL 构造器只加 `/chat/completions`，不会自动再加 `/v1`。常规根地址、`/v1`、完整 `/chat/completions` 都不会重复；但带 query 的完整 endpoint 会拼错。
4. 连接测试固定 `max_tokens:16`，默认思考可能耗尽此总输出预算，HTTP200 仅有 reasoning_content/finish_reason=length 时被报为“连接失败：AI没有返回内容”。已用相同 mock 对 HEAD 和补丁各跑一次：HEAD 复现该误报；补丁正确显示“测试未完成：接口已响应…token上限”。这能解释一类假失败，但不是已经确认用户遇到的原因。
5. temperature=0 被 `||0.7` 改写。422 参数错误没有专门提示，404 提示误导 Base URL 一般必须 `/v1`。
6. Android Java 桥保留请求 URL/model/body 和 HTTP 状态，不改模型名。HTTP>=400 的响应体仍交给 JS 映射。网络异常只发送异常类名：SocketTimeoutException 原先也显示为泛化网络/CORS；JS 原生回调 onChunk 的解析异常原先可能逃逸并悬挂至超时。

## 本地已修改（未提交、未发布、未打新APK）

- 新装/主动选择 DeepSeek 预设改为根地址 + `deepseek-flash/deepseek-v4-pro`；旧保存配置不自动改写，旧官方 ID 给出公告提示。
- 设置明确显示“显示名不等于精确 model ID”、第三方需使用对应服务商地址/Key/ID；Key 继续为普通 text 键盘且不进备份。
- 按 URL pathname 拼接 endpoint，保留 query，避免 endpoint 重复；明显的 Anthropic/Messages/Responses 地址在发请求前说明不兼容。没有新增这些协议支持。
- 测试预算增至256（仍可能不够思考，绝不保证任何模型一定成功）；对有响应但未产生最终答案/思考截断单独提示，不再当成完全未接通，也不把纯思考冒充最终答案。
- temperature=0 保留、422/404提示修正、原生超时分类和流内错误立即收敛。
- 未改公共 Android Java，未动其它 App。Java 固定连接20秒/读取120秒仍是边界，App可配置10–300秒不覆盖该原生上限。

## 用户当前版本填写规则

官方账号：自定义或 DeepSeek → Base URL `https://api.deepseek.com` → model `deepseek-flash` → 填该官方账号创建的 Key → 保存。模型框可手输，不必等待新 APK 才能输入新 ID。旧版“测试连接”若报空内容，不能据此认定完全未连通；还需看正常对话与具体错误。

第三方：按第三方 **OpenAI Chat Completions** 文档填写 Base URL（可能含 `/v1`，不能自行删改）、它发的 Key、它给出的精确 model ID；如提供 `/models`，取 `data[].id` 而非 `name`。仅凭“DeepSeekV4.1”无法判断第三方 ID。此 App 当前不是 Anthropic Messages/Responses 客户端。

温度在官方思考模式可能无效；超时是无数据闲置超时，官方思考/排队和网络抖动会影响等待。不能以加长超时修复 401/402/404/422。

错误码：400格式、401认证、402余额、422参数、429频率/并发/QPS、500服务器、503过载、504网关超时；404应查路径与模型ID，403一般查权限/策略（后两项不是该官方错误码页面当前列出的条目）。网页 fetch 网络错误无法仅凭浏览器错误区分CORS、网络与TLS；原生桥不受浏览器CORS限制，但仍可能网络/TLS/超时失败。

仍缺：官方/第三方、Base URL（去掉敏感query）、精确 model ID、错误码及错误截图/文字、发生于网页还是安卓、普通对话还是仅测试连接。不需要用户发送 Key。

## 验证与交付边界

- `npm test`：45项通过（原37项+8项兼容性mock测试），包括旧配置保留、5种URL、普通/流式、0温度、思考截断、错误参数、Key脱敏、原生超时/流内错误/HTTP401。
- HEAD 对照实验复现16-token误判；不是实际 DeepSeek 服务连接测试。
- 未真实浏览器、未真机、未用真实 Key、未认证请求官方 `/models`；模型列表是当前官方公开文档中的示例与模型说明。
- 版本仍1.4.0/VC9，SW仍v19；本次补丁未发布，现有线上站点/交付APK/源码归档仍为原1.4版本。后续确认发布前应更新缓存版本并重新打包/归档，不可宣称现有APK已包含此补丁。
