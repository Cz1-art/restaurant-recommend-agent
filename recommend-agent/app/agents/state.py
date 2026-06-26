from typing import Any, Literal, TypedDict

IntentType = Literal[
    "recommend",
    "nearby_restaurant",
    "query_dish",
    "pairing",
    "chitchat",
    "unknown",
]


class RestaurantAgentState(TypedDict, total=False):
    message: str
    user: str
    user_id: int | None
    auth_token: str | None
    dify_conversation_id: str | None
    location: dict[str, float | str] | None
    enable_nearby_restaurant_search: bool
    intent: IntentType
    constraints: dict[str, Any]
    restaurant_info: dict[str, Any]
    nearby_restaurants: list[dict[str, Any]]
    map_food_pois: list[dict[str, Any]]
    map_image_url: str | None
    catalog: list[dict[str, Any]]
    recommendation_packs: dict[str, Any]
    ranked_dishes: list[dict[str, Any]]
    pairing_suggestion: dict[str, Any] | None
    rag_answer: str
    citations: list[dict[str, Any]]
    dify_response: dict[str, Any]
    final_answer: str
    recommended_dishes: list[dict[str, Any]]
    recommended_foods: list[dict[str, Any]]
    tool_calls: list[dict[str, Any]]
