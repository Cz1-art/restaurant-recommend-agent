from app.agents.restaurant_graph import RestaurantGraphRunner
from app.core.config import settings
from app.schemas.recommend import (
    MapFoodItem,
    NearbyRestaurant,
    RecommendChatRequest,
    RecommendChatResponse,
    RecommendedDish,
    ToolCallRecord,
)
from app.services.dify_service import DifyService


class MultiAgentRecommendService:
    def __init__(self, dify: DifyService | None = None) -> None:
        self.graph = RestaurantGraphRunner(dify)

    async def answer(self, payload: RecommendChatRequest) -> RecommendChatResponse:
        loc = payload.location
        if hasattr(loc, "model_dump"):
            loc = loc.model_dump()
        user = f"user-{payload.user_id}" if payload.user_id else "guest"
        state = await self.graph.ainvoke(
            {
                "message": payload.message.strip(),
                "user": user,
                "user_id": payload.user_id,
                "auth_token": payload.auth_token,
                "location": loc,
                "enable_nearby_restaurant_search": payload.enable_nearby_restaurant_search,
                "tool_calls": [],
            }
        )
        dishes = [
            RecommendedDish(**item)
            for item in (state.get("recommended_dishes") or [])
            if item.get("name")
        ]
        foods = [MapFoodItem(**item) for item in (state.get("recommended_foods") or [])]
        nearby = [NearbyRestaurant(**r) for r in (state.get("nearby_restaurants") or [])]
        tool_calls = [
            ToolCallRecord(
                tool_name=t.get("tool_name", "unknown"),
                reason=t.get("reason", ""),
                input_summary=t.get("input_summary"),
                output_summary=t.get("output_summary"),
                success=bool(t.get("success", True)),
            )
            for t in state.get("tool_calls") or []
        ]
        source = "ordering_menu" if settings.use_ordering_menu else "amap_poi"
        return RecommendChatResponse(
            reply=state.get("final_answer") or "",
            recommended_dishes=dishes,
            recommended_foods=foods,
            nearby_restaurants=nearby,
            map_image_url=state.get("map_image_url"),
            intent=str(state.get("intent") or "unknown"),
            data_source=source,
            tool_calls=tool_calls,
            citations=state.get("citations") or [],
            raw_agent_state=state,
        )
