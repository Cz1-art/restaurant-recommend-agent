# Dify 依赖说明

## 流水线（地图 + Dify）

1. 高德：附近餐厅 POI、美食 POI（`USE_ORDERING_MENU=false` 时不读小程序菜单）
2. **Dify**：`dify_synthesis` 节点把 POI JSON 发给 `POST /v1/chat-messages`，由你的工作流生成中文推荐
3. `compose`：Dify 话术 + 地图列表 + 引用 citations

## .env 必填

```env
DIFY_BASE_URL=https://api.dify.ai/v1
DIFY_API_KEY=app-xxxx
DIFY_REQUIRED=true
```

未配置 Key 且 `DIFY_REQUIRED=true` 时返回 `503 dify_api_key_not_configured`（不再静默本地降级）。

## Dify 应用建议

- 类型：Agent 或 Chatflow（与 medical 相同 `chat-messages`）
- 系统提示：只根据用户消息里的 JSON 事实推荐，禁止编造店名
- 可挂知识库：餐饮 FAQ、城市美食指南（RAG 会出现在 `citations`）

## 重启

修改 .env 后重启 uvicorn :8001
