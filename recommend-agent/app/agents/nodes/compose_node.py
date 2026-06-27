from typing import Any

from app.agents.state import RestaurantAgentState
from app.core.config import settings


async def compose_node(state: RestaurantAgentState) -> dict[str, Any]:
    parts: list[str] = []
    notices: list[str] = []

    dify_resp = state.get("dify_response") or {}
    meta = dify_resp.get("metadata") or {}

    dify_text = (state.get("rag_answer") or "").strip()
    if dify_text:
        parts.append(dify_text)

    # 只在用户问附近/周边/推荐餐厅时才显示 POI
    msg = (state.get("query") or "").lower()
    ask_nearby = any(w in msg for w in ["附近", "周边", "旁边", "推荐餐厅", "川菜馆", "火锅", "好吃的", "nearly"])

    nearby = state.get("nearby_restaurants") or []
    recommended_foods: list[dict[str, Any]] = []
    if ask_nearby and nearby:
        lines = []
        for i, r in enumerate(nearby[:3], 1):
            dist = r.get("distance_m")
            d = f" \u00b7 \u7ea6{dist}m" if dist else ""
            lines.append(f"{i}. {r.get('name')}{d}")
        parts.append("\u3010\u9644\u8fd1\u9910\u5385\u3011\n" + "\n".join(lines))

    if not parts:
        parts.append("\u60a8\u597d\uff0c\u6211\u662f\u5c0f\u5473\u70b9\u9910\u52a9\u624b\u3002\u8bf7\u8bf4\u660e\u53e3\u5473\u504f\u597d\u548c\u9884\u7b97\u3002")

    final = "\n\n".join(parts).strip()
    return {
        "final_answer": final,
        "recommended_dishes": [],
        "recommended_foods": recommended_foods,
        "integration_notices": notices,
        "tool_calls": [
            *state.get("tool_calls", []),
            {"tool_name": "response_composer", "reason": "\u6c47\u603b\u56de\u7b54\u3002", "success": True},
        ],
    }
