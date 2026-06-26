# 知识库索引（已上传 Dify 后对照）

| 文件 | 用途 |
|------|------|
| restaurant_faq.md | 点餐 FAQ、助手能力 |
| dining_safety_rules.md | 回答边界、过敏、诚实推荐 |
| common_dining_qa.md | 辣/清淡/预算/聚餐科普 |
| city_food_guide.md | 菜系与选店原则 |
| allergy_and_emergency_dining.md | 过敏与就餐急症 |

## Dify API（与 medical-main 相同）

```env
DIFY_BASE_URL=https://api.dify.ai/v1
DIFY_API_KEY=app-（在 Dify 应用「访问 API」中复制，须与已挂知识库的应用一致）
```

请求路径：`POST {DIFY_BASE_URL}/chat-messages`

## 验证

1. 重启 recommend-agent（改 .env 后）
2. `POST http://127.0.0.1:8001/api/v1/recommend/chat` body: `{"message":"过敏点餐要注意什么"}`
3. 响应中 `citations` 应有知识库片段；`tool_calls` 含 `dify_rag_tool`
