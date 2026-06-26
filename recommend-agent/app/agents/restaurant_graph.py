from collections.abc import Awaitable, Callable
from typing import Any

from app.agents.nodes.compose_node import compose_node
from app.agents.nodes.constraint_node import constraint_node
from app.agents.nodes.context_node import context_node
from app.agents.nodes.dish_rank_node import dish_rank_node
from app.agents.nodes.intent_node import intent_node
from app.agents.nodes.nearby_restaurant_node import nearby_restaurant_node
from app.agents.nodes.pairing_node import pairing_node
from app.agents.nodes.rag_node import dify_rag_node
from app.agents.nodes.restaurant_node import restaurant_node
from app.agents.state import RestaurantAgentState
from app.services.dify_service import DifyService


class RestaurantGraphRunner:
    """Same Dify pattern as medical-main: POST /v1/chat-messages in rag node."""

    def __init__(self, dify: DifyService | None = None) -> None:
        self.dify = dify or DifyService()
        self._graph = self._build_langgraph()

    async def ainvoke(self, initial: RestaurantAgentState) -> RestaurantAgentState:
        if self._graph is not None:
            return await self._graph.ainvoke(initial)
        return await self._sequential(initial)

    def _build_langgraph(self) -> Any | None:
        try:
            from langgraph.graph import END, START, StateGraph
        except ImportError:
            return None

        async def rag_wrapped(state: RestaurantAgentState) -> dict[str, Any]:
            return await dify_rag_node(state, self.dify)

        g = StateGraph(RestaurantAgentState)
        for name, fn in [
            ("intent", intent_node),
            ("constraint", constraint_node),
            ("context", context_node),
            ("rag", rag_wrapped),
            ("dish_rank", dish_rank_node),
            ("pairing", pairing_node),
            ("nearby_restaurant", nearby_restaurant_node),
            ("restaurant", restaurant_node),
            ("compose", compose_node),
        ]:
            g.add_node(name, fn)
        g.add_edge(START, "intent")
        g.add_edge("intent", "constraint")
        g.add_edge("constraint", "context")
        g.add_edge("context", "rag")
        g.add_edge("rag", "dish_rank")
        g.add_edge("dish_rank", "pairing")
        g.add_edge("pairing", "nearby_restaurant")
        g.add_edge("nearby_restaurant", "restaurant")
        g.add_edge("restaurant", "compose")
        g.add_edge("compose", END)
        return g.compile()

    async def _sequential(self, initial: RestaurantAgentState) -> RestaurantAgentState:
        state = dict(initial)

        async def rag_wrapped(s: RestaurantAgentState) -> dict[str, Any]:
            return await dify_rag_node(s, self.dify)

        for node in [
            intent_node,
            constraint_node,
            context_node,
            rag_wrapped,
            dish_rank_node,
            pairing_node,
            nearby_restaurant_node,
            restaurant_node,
            compose_node,
        ]:
            state.update(await node(state))
        return state
