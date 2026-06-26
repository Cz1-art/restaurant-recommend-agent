# 接入 Dify + 高德（本机已写好配置，需在云端/console 完成两步）

## 当前诊断（本机已测）

| 服务 | 状态 | 原因 |
|------|------|------|
| Agent 8001 | 正常 | /health ok |
| Dify API Key | 已写入 .env | 云返回 **Model is not configured** |
| 高德 AMAP_API_KEY | 已写入 .env | 返回 **USERKEY_PLAT_NOMATCH**（Key 类型不对） |

本地已开启 `DIFY_FALLBACK_ON_ERROR=true`：Dify 未修好前用 `knowledge_base` 回答，不 502。

查看状态：`GET http://127.0.0.1:8001/api/v1/integration/status`

---

## 一、接入 Dify（与 medical-main 相同 API）

1. 登录 https://cloud.dify.ai
2. 打开**挂了知识库**的应用（Agent 或 Chatflow）
3. **设置 → 模型供应商**：添加 DeepSeek / 通义 / OpenAI 等，点 **验证** 成功
4. **编排**：点击 **LLM** 节点 → 选择刚验证的 **模型**
5. 确认有 **知识库检索** 节点并绑定你的数据集
6. **发布** 应用
7. **访问 API** 复制 Key，与 `recommend-agent\.env` 中 `DIFY_API_KEY` 一致
8. 重启 8001 uvicorn

验证：integration/status 里 `dify.cloud_ok` 应为 true。

---

## 二、接入高德（Web 服务 Key）

当前 Key 不能用于服务端「周边搜索」，需新建：

1. 打开 https://console.amap.com/ → 应用管理
2. **创建新应用** → 添加 Key，服务平台选 **「Web 服务」**（不要选 JS API）
3. 勾选 **搜索 / 周边检索** 等相关服务
4. 复制新 Key，替换 `recommend-agent\.env`：

```env
AMAP_API_KEY=新的Web服务Key
AMAP_STATIC_MAP_KEY=新的Web服务Key
```

5. 重启 8001

验证：点前端「演示：北京·天安门」再问附近餐厅，应出现 POI 列表。

---

## 三、本机重启命令

```powershell
cd recommend-agent
.\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8001
```

```powershell
cd agent-web
npm run dev
```

浏览器：http://127.0.0.1:5174（顶部会显示 Dify/高德 接入状态）
