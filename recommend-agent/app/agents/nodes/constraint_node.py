from typing import Any
from app.agents.state import RestaurantAgentState


async def constraint_node(state: RestaurantAgentState) -> dict[str, Any]:
    msg = state["message"]
    constraints: dict[str, Any] = {
        "spicy": any(x in msg for x in ("辣", "麻辣", "香辣")),
        "mild": any(x in msg for x in ("清淡", "不辣")),
        "budget": any(x in msg for x in ("便宜", "实惠", "性价比")),
        "avoid": [],
    }
    if "不要" in msg or "忌口" in msg:
        constraints["note"] = "用户提到忌口，推荐时将优先过滤描述匹配项。"
    return {
        "constraints": constraints,
        "tool_calls": [
            *state.get("tool_calls", []),
            {"tool_name": "constraint_extractor", "reason": "提取辣度、预算等点餐约束。", "success": True},
        ],
    }
