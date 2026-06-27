from typing import Any

from app.agents.state import RestaurantAgentState
from app.core.config import settings


def _strip_duplicate_notice(text: str) -> str:
    for marker in ("\u3010Dify 报错\u3011", "\u3010系统提示\u3011", "当前未连接 Dify"):
        if text.count(marker) > 1:
            first = text.find(marker)
            second = text.find(marker, first + 1)
            if second > 0:
                text = text[:second].strip()
    return text.strip()


async def compose_node(state: RestaurantAgentState) -> dict[str, Any]:
    parts: list[str] = []
    map_mode = not settings.use_ordering_menu
    notices: list[str] = []

    dify_resp = state.get("dify_response") or {}
    meta = dify_resp.get("metadata") or {}
    if meta.get("bridge_mode") == "deepseek_kb":
        notices.append("问答已通过 DeepSeek+知识库桥接（Dify 文档同源）；在 Dify 云为 LLM 配模型后将自动走真 Dify。")
    elif meta.get("dify_fallback_reason"):
        notices.append(f"Dify：{meta.get('dify_fallback_reason')}（已降级本地知识库）")

    dify_text = _strip_duplicate_notice((state.get("rag_answer") or "").strip())
    if dify_text and "not sure what you mean" not in dify_text.lower():
        parts.append("\u3010问答\u3011\n" + dify_text)

    nearby = state.get("nearby_restaurants") or []
    if nearby:
        lines = ["\u3010附近餐厅 POI\u3011"]
        for i, r in enumerate(nearby[:3], start=1):
            dist = r.get("distance_m")
            d = f" \u00b7 \u7ea6{dist}m" if dist else ""
            lines.append(f"{i}. {r.get('name')}{d}")
        parts.append("\n".join(lines))

    food_pois = state.get("map_food_pois") or []
    recommended_foods: list[dict[str, Any]] = []
    if food_pois:
        lines = ["\u3010附近美食 POI\u3011"]
        for i, p in enumerate(food_pois[:3], start=1):
            name = p.get("name") or "未知"
            dist = p.get("distance_m")
            d = f" \u00b7 \u7ea6{dist}m" if dist else ""
            lines.append(f"{i}. {name}{d}")
            recommended_foods.append({
                "name": name, "address": p.get("address"),
                "distance_m": p.get("distance_m"), "type": p.get("type"),
                "tel": p.get("tel"), "reason": "高德地图 POI",
            })
        parts.append("\n".join(lines))

    recommended: list[dict[str, Any]] = []

    if map_mode and (nearby or food_pois):
        intro = "根据高德地图 POI 整理如下（未使用小程序菜单）：\n"
    else:
        intro = "您好，我是小味。\n"

    if not parts and state.get("intent") != "chitchat":
        parts.append("可问：附近有什么好吃的？吃辣要注意什么？（附近检索需定位或演示坐标）")

    final = (intro + "\n".join(parts)).strip()
    return {
        "final_answer": final,
        "recommended_dishes": recommended,
        "recommended_foods": recommended_foods,
        "integration_notices": notices,
        "tool_calls": [
            *state.get("tool_calls", []),
            {"tool_name": "response_composer", "reason": "汇总回答。", "success": True},
        ],
    }
