from typing import Any

from app.agents.state import RestaurantAgentState
from app.core.config import settings


async def pairing_node(state: RestaurantAgentState) -> dict[str, Any]:
    if not settings.use_ordering_menu:
        return {
            "pairing_suggestion": None,
            "tool_calls": [
                *state.get("tool_calls", []),
                {"tool_name": "pairing_rules", "reason": "地图模式跳过小程序套餐搭配。", "success": True},
            ],
        }
    packs = state.get("recommendation_packs") or {}
    combo = (packs.get("combo") or [])[:1]
    return {
        "pairing_suggestion": combo[0] if combo else None,
        "tool_calls": [
            *state.get("tool_calls", []),
            {"tool_name": "pairing_rules", "reason": "菜单模式套餐搭配。", "success": True},
        ],
    }
