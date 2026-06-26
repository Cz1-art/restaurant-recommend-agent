from typing import Any

from app.agents.state import RestaurantAgentState
from app.agents.tools.place_search import search_nearby_restaurants
from app.core.config import settings

NEARBY_WORDS = ("附近", "周边", "好吃", "餐厅", "饭店", "餐馆", "去哪吃", "哪儿吃", "推荐")


def _should_search(state: RestaurantAgentState) -> bool:
    if state.get("enable_nearby_restaurant_search"):
        return True
    if state.get("intent") in ("nearby_restaurant", "recommend"):
        return True
    if not settings.use_ordering_menu and state.get("location"):
        return True
    msg = state.get("message") or ""
    return any(w in msg for w in NEARBY_WORDS)


def _cuisine_keywords(message: str) -> str | None:
    tags = ("火锅", "烧烤", "川菜", "粤菜", "日料", "西餐", "小吃", "面馆", "咖啡", "美食")
    hit = [t for t in tags if t in message]
    return " ".join(hit) if hit else None


async def nearby_restaurant_node(state: RestaurantAgentState) -> dict[str, Any]:
    if not _should_search(state):
        return {
            "nearby_restaurants": [],
            "tool_calls": [
                *state.get("tool_calls", []),
                {
                    "tool_name": "amap_restaurant_search",
                    "reason": "无定位或未开启附近检索，跳过餐厅 POI。",
                    "success": True,
                },
            ],
        }

    result = await search_nearby_restaurants(
        location=state.get("location"),
        keywords=_cuisine_keywords(state.get("message") or ""),
    )
    return {
        "nearby_restaurants": result.get("restaurants") or [],
        "map_image_url": result.get("map_image_url"),
        "tool_calls": [
            *state.get("tool_calls", []),
            {
                "tool_name": "amap_restaurant_search",
                "reason": "高德地图周边餐饮 POI（现实地图数据）。",
                "output_summary": result.get("reason")
                or f"found={len(result.get('restaurants') or [])}",
                "success": bool(result.get("enabled")),
            },
        ],
    }
