# 🍜 风味餐厅智能推荐 Agent

基于**多智能体流水线**的餐饮推荐系统，接入高德地图 POI 和 Dify 知识库，实现周边餐厅搜索、美食推荐与智能问答。

## 🏗 架构

```
用户 → agent-web (Vue3) → recommend-agent (FastAPI + LangGraph)
                              ├── Dify 云 (知识库 RAG + LLM)
                              ├── DeepSeek (Dify 桥接降级)
                              ├── 高德地图 (周边 POI 搜索)
                              └── 本地知识库 (降级兜底)
```

### 多智能体流水线（9 节点）

```
intent → constraint → context → dify_rag → dish_rank
  → pairing → nearby_restaurant → restaurant → compose
```

| 节点 | 功能 |
|------|------|
| intent | 意图识别（附近餐厅 / 菜品推荐 / 搭配建议） |
| constraint | 提取约束（口味、预算、人数等） |
| context | 地图模式开关、上下文组装 |
| dify_rag | 调用 Dify 知识库检索 |
| dish_rank | 高德美食 POI 排序 |
| pairing | 菜品搭配规则 |
| nearby_restaurant | 高德周边餐厅搜索 |
| restaurant | 门店信息输出 |
| compose | 汇总回复 |

## 📁 项目结构

```
风味餐厅智能推荐点餐系统/
├── recommend-agent/        # FastAPI + LangGraph 后端
│   ├── app/
│   │   ├── agents/         # 多智能体流水线（节点 + 图）
│   │   ├── api/            # REST API 路由
│   │   ├── core/           # 配置管理
│   │   ├── schemas/        # Pydantic 数据模型
│   │   └── services/       # Dify、高德、DeepSeek 服务层
│   ├── knowledge_base/     # 本地知识库（降级用）
│   ├── Dockerfile
│   └── requirements.txt
├── agent-web/              # Vue3 + Vite 前端
│   ├── src/
│   │   ├── views/          # ChatView 聊天界面
│   │   └── api/            # HTTP 请求封装
│   └── vite.config.ts
├── smart-ordering-system/  # Express + SQLite 点餐后端（可选）
├── mymenu-main/            # 微信小程序（可选）
├── docker-compose.yml      # 一键部署编排
├── nginx.conf              # Nginx 反代配置
├── deploy.sh               # 服务器部署脚本
└── .env.example            # 环境变量模板
```

## 🚀 快速开始

### 本地开发

```powershell
# 1. 启动后端
cd recommend-agent
pip install -r requirements.txt
python -m uvicorn app.main:app --host 127.0.0.1 --port 8001

# 2. 启动前端
cd agent-web
npm install
npm run dev

# 3. 浏览器访问
# http://127.0.0.1:5174
```

### 环境变量

复制 `.env.example` 为 `.env`，填入以下 Key：

| 变量 | 说明 | 获取方式 |
|------|------|----------|
| `DIFY_API_KEY` | Dify 应用 Key | Dify 云控制台 → 应用 → API 访问 |
| `AMAP_API_KEY` | 高德 Web 服务 Key | 高德开放平台 → 应用管理 → Web 服务 |
| `DEEPSEEK_API_KEY` | DeepSeek Key | DeepSeek 开放平台 |

### Docker 部署

```bash
# 1. 配置环境
cp .env.example .env
vim .env

# 2. 一键启动
bash deploy.sh
```

服务端口：
- `:80` → 前端 + API（Nginx 反代）
- `:8001` → Agent 后端（仅内网）

## 🔌 API 端点

| 方法 | 路径 | 说明 |
|------|------|------|
| `GET` | `/health` | 健康检查 |
| `POST` | `/api/v1/recommend/chat` | 推荐问答 |
| `GET` | `/api/v1/integration/status` | 集成状态诊断 |

### 问答请求

```json
POST /api/v1/recommend/chat
{
  "message": "推荐附近好吃的川菜馆",
  "location": { "lat": "39.9042", "lng": "116.4074" },
  "enable_nearby": true
}
```

### 集成状态

```json
GET /api/v1/integration/status
{
  "dify": { "configured": true, "cloud_ok": true },
  "amap": { "configured": true },
  "llm_bridge": true,
  "deepseek_configured": true
}
```

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 后端框架 | FastAPI + Uvicorn |
| 智能体编排 | LangGraph |
| 前端 | Vue 3 + Vite + TypeScript |
| 知识库 | Dify Cloud (advanced-chat) |
| LLM | Dify 云端模型 / DeepSeek 桥接 |
| 地图 | 高德 Web 服务 API |
| 部署 | Docker + Nginx |

## 📝 Dify 配置指引

1. 在 [Dify 云](https://cloud.dify.ai) 创建应用（advanced-chat 模式）
2. 上传知识库文档（`knowledge_base/` 目录下的 `.md` 文件）
3. 编排中添加 LLM 节点，配置模型供应商
4. 发布应用，复制 API Key 到 `.env`

## 🌐 高德 Key 配置

1. 注册 [高德开放平台](https://lbs.amap.com/) 账号
2. 创建应用 → 添加 Key → 选择 **Web 服务** 类型
3. 复制 Key 到 `.env` 的 `AMAP_API_KEY`

## 📄 License

MIT
