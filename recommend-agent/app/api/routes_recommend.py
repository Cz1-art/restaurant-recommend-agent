from fastapi import APIRouter

from app.schemas.recommend import RecommendChatRequest, RecommendChatResponse
from app.services.multi_agent_recommend_service import MultiAgentRecommendService

router = APIRouter()
from app.core.config import settings
import httpx


@router.get("/integration/status")
async def integration_status() -> dict:
    """Check Dify + Amap configuration (for agent-web diagnostics)."""
    dify = {"configured": bool(settings.dify_api_key), "cloud_ok": False, "message": ""}
    if settings.dify_api_key:
        try:
            async with httpx.AsyncClient(base_url=settings.dify_base_url, timeout=25) as c:
                r = await c.post(
                    "/chat-messages",
                    json={
                        "inputs": {},
                        "query": "ping",
                        "response_mode": "blocking",
                        "conversation_id": "",
                        "user": "health-check",
                    },
                    headers={"Authorization": f"Bearer {settings.dify_api_key}"},
                )
            if r.status_code == 200:
                dify["cloud_ok"] = True
                dify["message"] = "Dify 已接通"
            else:
                try:
                    body = r.json()
                    dify["message"] = body.get("message") or r.text[:200]
                except Exception:
                    dify["message"] = r.text[:200]
        except Exception as e:
            dify["message"] = str(e)
    amap = {
        "configured": bool(settings.amap_api_key),
        "hint": "Key 类型须为高德「Web 服务」并开通 Place 周边检索",
    }
    return {
        "dify": dify,
        "amap": amap,
        "local_kb": True,
        "dify_fallback_on_error": getattr(settings, "dify_fallback_on_error", False),
        "fix_dify": "Dify 云 → 应用编排 → LLM 节点 → 选择模型供应商 → 发布",
        "fix_amap": "高德开放平台 → 应用管理 → 创建 Web 服务 Key → 更新 AMAP_API_KEY",
        "llm_bridge": getattr(settings, "use_dify_llm_bridge", False),
        "deepseek_configured": bool(getattr(settings, "deepseek_api_key", "")),
    }





@router.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@router.get("/recommend/chat")
async def recommend_chat_help() -> dict:
    """Avoid 405 when opening chat URL in browser (GET)."""
    return {
        "error": "Method Not Allowed for GET",
        "hint": "问答请使用 POST，不要用浏览器直接打开本地址",
        "method": "POST",
        "path": "/api/v1/recommend/chat",
        "body_example": {
            "message": "附近有什么好吃的餐厅？",
            "enable_nearby_restaurant_search": true,
            "location": {"longitude": 116.397, "latitude": 39.909},
        },
        "docs": "http://127.0.0.1:8001/docs",
        "frontend": "http://127.0.0.1:5174",
    }


@router.post("/recommend/chat", response_model=RecommendChatResponse)
async def recommend_chat(payload: RecommendChatRequest) -> RecommendChatResponse:
    return await MultiAgentRecommendService().answer(payload)
