# 502 Bad Gateway — 你当前的真实原因

直连 Dify 测试结果：

```json
{"code":"invalid_param","message":"Model is not configured","status":400}
```

**不是** Agent 挂了（`/health` 已是 ok），而是 **Dify 云应用里没有配置可用的大模型**。

## 在 Dify 云控制台修复（必做）

1. 打开你的应用（挂了知识库的那个 **Agent / Chatflow**）
2. 进入 **编排** 画布，点击 **LLM / 大模型** 节点
3. 在右侧选择 **已配置的模型供应商**（OpenAI / 深度求索 / 通义 / 智谱 等）
4. 若列表为空：先到 **设置 → 模型供应商** 添加 API Key 并 **验证通过**
5. 保存并 **重新发布** 应用
6. 确认 **访问 API** 里的 Key 与 `recommend-agent/.env` 中 `DIFY_API_KEY` 一致
7. 重启本机 uvicorn（8001），再在 5174 提问

## 验证 Dify 是否修好

在 `recommend-agent` 目录：

```powershell
.\.venv\Scripts\python.exe -c "import asyncio,httpx; from app.core.config import settings; exec('''
async def t():
  async with httpx.AsyncClient(base_url=settings.dify_base_url,timeout=90) as c:
    r=await c.post(\"/chat-messages\",json={\"inputs\":{},\"query\":\"你好\",\"response_mode\":\"blocking\",\"conversation_id\":\"\",\"user\":\"t\"},headers={\"Authorization\":f\"Bearer {settings.dify_api_key}\"})
    print(r.status_code, r.text[:300])
asyncio.run(t())
''')"
```

应看到 **200** 且 `answer` 有内容，而不是 `Model is not configured`。

## 与定位、高德的关系

- 本问题与 **定位失败无关**
- 修好模型后，若仍无附近餐厅，再处理高德 Key / 演示坐标
