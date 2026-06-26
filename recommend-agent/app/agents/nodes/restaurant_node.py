from typing import Any

from app.core.config import settings
from app.agents.state import RestaurantAgentState


async def restaurant_node(state: RestaurantAgentState) -> dict[str, Any]:
    info = {
        "name": settings.home_store_name,
        "address": settings.home_store_address or "本店支持小程序点餐",
        "mode": "home_store",
        "tagline": "本店菜品由数据库推荐，可一键加购",
    }
    nearby = state.get("nearby_restaurants") or []
    if nearby:
        info["nearby_count"] = len(nearby)
        info["note"] = "附近其他餐厅见下方列表；本店菜品仍可点餐。"
    return {
        "restaurant_info": info,
        "tool_calls": [
            *state.get("tool_calls", []),
            {"tool_name": "restaurant_profile", "reason": "输出本店信息并关联附近 POI 结果。", "success": True},
        ],
    }
