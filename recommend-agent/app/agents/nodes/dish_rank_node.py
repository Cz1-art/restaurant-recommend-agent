from typing import Any

from app.agents.state import RestaurantAgentState
from app.agents.tools.place_search import search_nearby_food_pois
from app.core.config import settings


def _food_keywords(message: str, constraints: dict[str, Any]) -> str:
    tags = []
    if constraints.get("spicy"):
        tags.append("辣")
    tags.extend(t for t in ("火锅", "烧烤", "川菜", "小吃", "面馆", "咖啡", "甜品") if t in message)
    if constraints.get("budget"):
        tags.append("小吃")
    return " ".join(tags) if tags else "美食 餐厅"


async def dish_rank_node(state: RestaurantAgentState) -> dict[str, Any]:
    if settings.use_ordering_menu:
        constraints = state.get("constraints") or {}
        pool = list(state.get("ranked_dishes") or state.get("catalog") or [])[:12]
        if constraints.get("spicy"):
            spicy = [d for d in pool if "辣" in str(d.get("flavor") or "")]
            if spicy:
                pool = spicy
        top = pool[:5]
        return {
            "ranked_dishes": top,
            "tool_calls": [
                *state.get("tool_calls", []),
                {"tool_name": "dish_rank_filter", "reason": "菜单模式菜品排序。", "success": True},
            ],
        }

    result = await search_nearby_food_pois(
        location=state.get("location"),
        keywords=_food_keywords(state.get("message") or "", state.get("constraints") or {}),
    )
    items = result.get("items") or []
    return {
        "map_food_pois": items,
        "ranked_dishes": [],
        "tool_calls": [
            *state.get("tool_calls", []),
            {
                "tool_name": "amap_food_poi_search",
                "reason": "按现实地图检索附近美食类 POI（非小程序菜单）。",
                "output_summary": result.get("reason") or f"found={len(items)}",
                "success": bool(result.get("enabled")),
            },
        ],
    }
