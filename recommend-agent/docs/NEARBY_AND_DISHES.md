# 餐饮推荐 Agent（类 medical-main）

## 流水线节点

1. intent — 附近餐厅 / 本店推荐 / 查菜 / 搭配
2. constraint — 辣度、预算等
3. context — HTTP 调 Express 菜品与推荐榜
4. rag — Dify 或本地知识库
5. dish_rank — 本店好吃菜品（SQL 结果二次筛选）
6. pairing — 套餐搭配
7. nearby_restaurant — 高德 POI 附近餐饮（需经纬度 + AMAP_API_KEY）
8. restaurant — 本店档案
9. compose — 汇总「附近餐厅 + 本店菜品」

## 能力 1：附近好吃的餐厅

- 请求体：`location: { longitude, latitude }`，或 `enable_nearby_restaurant_search: true`
- 消息含「附近、好吃、餐厅」等也会自动触发
- 配置 `recommend-agent/.env` 中 `AMAP_API_KEY`（与 medical 相同高德 Web 服务 Key）

## 能力 2：好吃的菜品

- 始终从 Express `dishes` / `recommend` API 拉取，**不编造菜名**
- 返回 `recommended_dishes` 供小程序做卡片加购

## 小程序后续

在 `pages/chat/chat.js` 的 `post('/chat')` 中增加：
`wx.getLocation` 得到经纬度传入 `location`，并设 `enable_nearby_restaurant_search: true`
