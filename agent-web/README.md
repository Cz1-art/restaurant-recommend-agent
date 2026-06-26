# 餐饮推荐 Agent Web（对齐 medical-main 前端结构）

## 结构（与 medical-main 一致）

- `src/api/http.ts` — 统一请求
- `src/api/chat.ts` — 问答 API
- `src/views/ChatView.vue` — 主界面
- `src/router.ts` + `App.vue` + `styles.css`
- Vite 代理 `/api`、`/health` → 8001；`/ordering` → 3000（菜品图）

## 推荐启动方式

双击或在 PowerShell 执行项目根目录：

```powershell
.\start-all.ps1
```

然后打开 **http://127.0.0.1:5174**

## 单独启动前端

```powershell
cd agent-web
.\start-dev.ps1
```

## 常见问题

| 现象 | 处理 |
|------|------|
| ERR_CONNECTION_REFUSED 5174 | 运行 `agent-web\start-dev.ps1`，不要关窗口 |
| 页面提示 Agent 未连接 | 启动 `recommend-agent` 的 uvicorn 8001 |
| 无推荐菜品 | 启动 `smart-ordering-system` 的 `node app.js` 3000 |
