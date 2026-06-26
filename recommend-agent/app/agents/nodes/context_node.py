from typing import Any

from app.agents.state import RestaurantAgentState
from app.core.config import settings
from app.services.ordering_client import OrderingApiClient


async def context_node(state: RestaurantAgentState) -> dict[str, Any]:
    if not settings.use_ordering_menu:
        return {
            "catalog": [],
            "recommendation_packs": {},
            "ranked_dishes": [],
            "restaurant_info": {
                "name": "地图推荐模式",
                "tagline": "仅根据高德地图现实 POI，不读取小程序菜单",
            },
            "tool_calls": [
                *state.get("tool_calls", []),
                {
                    "tool_name": "map_only_mode",
                    "reason": "已关闭点餐系统菜单 API，推荐数据仅来自地图。",
                    "success": True,
                },
            ],
        }

    client = OrderingApiClient()
    catalog = await client.get_dishes(status="on")
    packs = await client.get_recommend_packs()
    ranked: list[dict] = packs.get("hot") or []
    return {
        "catalog": catalog,
        "recommendation_packs": packs,
        "ranked_dishes": ranked[:12],
        "restaurant_info": {"name": settings.home_store_name, "tagline": "本店菜单模式"},
        "tool_calls": [
            *state.get("tool_calls", []),
            {
                "tool_name": "ordering_api_catalog",
                "reason": "可选：从 Express 拉取菜单（use_ordering_menu=true 时）。",
                "output_summary": f"catalog={len(catalog)}",
                "success": True,
            },
        ],
    }
