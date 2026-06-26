# API 使用说明

## Method Not Allowed

若看到 `{"detail":"Method Not Allowed"}`，多半是 **用 GET 打开了只支持 POST 的地址**。

| 错误操作 | 正确操作 |
|----------|----------|
| 浏览器打开 `http://127.0.0.1:8001/api/v1/recommend/chat` | 用 **agent-web** `http://127.0.0.1:5174` 点发送 |
| 浏览器打开 `https://api.dify.ai/v1` | Dify 仅供后端调用，不要当网页打开 |
| 对 chat 地址用 GET | 必须 **POST** + JSON |

## 正确调用

```http
POST http://127.0.0.1:8001/api/v1/recommend/chat
Content-Type: application/json

{"message":"过敏点餐要注意什么","enable_nearby_restaurant_search":false}
```

## 可用地址（GET）

- `http://127.0.0.1:8001/health` — 健康检查
- `http://127.0.0.1:8001/docs` — Swagger，在页面里试 POST
- `http://127.0.0.1:8001/api/v1/recommend/chat` — GET 会返回本说明（不再裸 405）

## Dify

- 基址：`https://api.dify.ai/v1`
- 后端自动调用：`POST /chat-messages`（不要自己在浏览器访问）
