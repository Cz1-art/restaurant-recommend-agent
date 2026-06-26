# Scheme A 落地说明

## 1. 复制服务到风味餐厅项目

将整个 `restaurant-recommend-agent` 文件夹复制到：

`风味餐厅智能推荐点餐系统/recommend-agent/`

## 2. 启动顺序

```powershell
# 终端 1：Express 点餐 API（必须先起）
cd smart-ordering-system
npm run init-db
npm start

# 终端 2：Python 多智能体服务
cd recommend-agent
python -m venv .venv
.\.venv\Scripts\pip install -e .
copy .env.example .env
# 编辑 .env：ORDERING_API_BASE_URL=http://127.0.0.1:3000/api
# 可选 DIFY_API_KEY=app-xxx
.\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

健康检查：`http://127.0.0.1:8001/health`  
对话：`POST http://127.0.0.1:8001/api/v1/recommend/chat`  
`{"message":"推荐几道辣的菜"}`

## 3. Express 接入（小程序仍调 /api/chat）

在 `smart-ordering-system/.env` 增加：

```env
RECOMMEND_AGENT_URL=http://127.0.0.1:8001
USE_RECOMMEND_AGENT=true
```

在 `routes/chat.js` 的 `router.post('/')` 开头增加：

```javascript
const { callRecommendAgent } = require('../integrations/recommend_agent_client');

if (process.env.USE_RECOMMEND_AGENT === 'true' && process.env.RECOMMEND_AGENT_URL) {
  const agent = await callRecommendAgent({
    baseUrl: process.env.RECOMMEND_AGENT_URL,
    message: req.body.message,
    history: req.body.history,
    authHeader: req.headers.authorization,
  });
  return res.json({
    code: 0,
    data: {
      reply: agent.reply,
      recommended_dishes: agent.recommended_dishes,
      tool_calls: agent.tool_calls,
      timestamp: new Date().toISOString(),
    },
  });
}
```

把 `integrations/recommend_agent_client.js` 复制到 `smart-ordering-system/integrations/`。

未开启 `USE_RECOMMEND_AGENT` 时，行为与原来 SiliconFlow / 规则回复一致。

## 4. Dify（可选）

与 medical-main 相同：`DIFY_BASE_URL` + `DIFY_API_KEY`，走 `rag_node`。  
未配置则使用 `knowledge_base/*.md` 本地降级。

## 5. 架构（方案 A）

```text
微信小程序 → Express :3000 /api/chat
                ↓ (代理)
         recommend-agent :8001 LangGraph
                ↓ HTTP Tool
         Express /api/dishes, /recommend/guess
                ↓
            SQLite
```

## 6. 与 medical-main 对照

| medical | restaurant |
|---------|------------|
| symptom_node | intent_node |
| triage_node | constraint_node |
| dify_rag_node | rag_node |
| medicine_node | dish_rank_node |
| department_node | pairing_node |
| place_node | restaurant_node |
| safety_node | compose_node |
