# Dify Integration Guide (aligned with medical-main)

## App Type

```text
Recommended: Agent or Chatflow
API: POST /v1/chat-messages
response_mode: blocking
```

Frontend never stores DIFY_API_KEY; only recommend-agent backend uses it.

## Environment (recommend-agent/.env)

```env
DIFY_BASE_URL=https://api.dify.ai/v1
DIFY_API_KEY=app-xxxxxxxx
DIFY_TIMEOUT_SECONDS=120
DIFY_REQUIRED=true
```

## Knowledge Base / RAG

Create a Dify Knowledge Base and upload:

- `knowledge_base/restaurant_faq.md`
- City dining guides, cuisine notes, FAQ

Connect KB to your Agent/Chatflow. The agent must retrieve before answering.

Backend reads evidence from:

```json
{
  "metadata": {
    "retriever_resources": [
      {
        "dataset_name": "Restaurant Knowledge",
        "document_name": "FAQ",
        "content": "...",
        "score": 0.9
      }
    ]
  }
}
```

Mapped to API field `citations` (same as medical-main).

## LangGraph node (same as medical)

```text
intent -> constraint -> context -> rag (dify_rag_node) -> dish_rank -> ...
```

`dify_rag_node` sends **user original message** as `query` to Dify (not a JSON blob).

Tool name in graph: `dify_rag_tool`

## Recommended system prompt (paste in Dify)

```text
你是餐饮推荐与健康点餐科普助手「小味」。

规则：
- 必须先使用已连接的知识库再回答
- 用中文、简洁友好
- 可结合用户问的「附近、口味、预算」给建议
- 地图上的具体店铺列表由后端高德 POI 提供；你负责知识库层面的美食解释与建议
- 不要编造不存在的餐厅品牌
- 涉及过敏/急症时提示就医
```

## Dify console checklist

1. 创建应用：Agent 或 Chatflow
2. 添加「知识库检索」节点并绑定数据集
3. LLM 回答节点
4. 发布 -> API 访问 -> 复制 Key 到 .env
5. 确认 API 文档为「发送对话消息」chat-messages

## Optional: local fallback

medical-main falls back to local KB when no key; restaurant sets `DIFY_REQUIRED=true` by default (no silent fallback).
