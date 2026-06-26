from typing import Any
from app.agents.state import RestaurantAgentState

KEYWORDS = {
    "nearby_restaurant": ("附近", "周边", "好吃", "餐厅", "饭店", "餐馆", "去哪吃", "哪儿吃"),
    "recommend": ("推荐", "吃什么", "有什么", "点菜", "套餐", "招牌"),
    "query_dish": ("多少钱", "价格", "怎么样", "介绍"),
    "pairing": ("搭配", "组合", "一桌", "几个人"),
}


async def intent_node(state: RestaurantAgentState) -> dict[str, Any]:
    msg = state["message"]
    intent = "chitchat" if any(x in msg for x in ("你好", "您好", "hello", "hi")) else "unknown"
    for name, words in KEYWORDS.items():
        if any(w in msg for w in words):
            intent = name
            break
    if intent == "unknown" and len(msg) > 2:
        intent = "recommend"
    return {
        "intent": intent,
        "tool_calls": [
            *state.get("tool_calls", []),
            {"tool_name": "intent_classifier", "reason": "识别附近餐厅、本店菜品推荐或搭配。", "success": True},
        ],
    }
