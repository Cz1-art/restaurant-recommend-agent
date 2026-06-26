import json
import re
from typing import Any

from app.agents.state import RestaurantAgentState
from app.services.dify_service import DifyService


async def dify_rag_node(
    state: RestaurantAgentState,
    dify_service: DifyService,
) -> dict[str, Any]:
    """Call Dify Agent/RAG and normalize the answer for later graph nodes."""

    dify_response = await dify_service.chat_message(
        query=state["message"],
        user=state["user"],
        conversation_id=state.get("dify_conversation_id"),
    )
    answer_payload = _parse_answer_payload(dify_response)
    rag_answer = _extract_answer(dify_response, answer_payload)
    citations = [
        citation.model_dump()
        for citation in dify_service.extract_citations(dify_response)
    ]

    return {
        "dify_response": dify_response,
        "dify_conversation_id": dify_response.get("conversation_id")
        or state.get("dify_conversation_id"),
        "rag_answer": rag_answer,
        "citations": citations,
        "risk_level": answer_payload.get("risk_level") or state.get("risk_level", "unknown"),
        "tool_calls": [
            *state.get("tool_calls", []),
            {
                "tool_name": "dify_rag_tool",
                "reason": "调用 Dify Agent / 知识库获取餐饮科普与推荐依据（与 medical-main 相同接口）。",
                "input_summary": state["message"],
                "output_summary": _truncate(rag_answer),
                "success": True,
            },
        ],
    }


def _parse_answer_payload(dify_response: dict[str, Any]) -> dict[str, Any]:
    raw_answer = dify_response.get("answer")
    if not isinstance(raw_answer, str):
        return {}

    text = _strip_markdown_fence(_strip_think_blocks(raw_answer.strip()))
    try:
        parsed = json.loads(text)
    except json.JSONDecodeError:
        return {}

    return parsed if isinstance(parsed, dict) else {}


def _extract_answer(dify_response: dict[str, Any], payload: dict[str, Any]) -> str:
    for key in ("answer", "final_answer", "draft_answer"):
        if payload.get(key):
            return _clean_answer(str(payload[key]))
    return _clean_answer(str(dify_response.get("answer") or ""))


def _clean_answer(value: str) -> str:
    text = _strip_markdown_fence(_strip_think_blocks(value.strip()))
    for _ in range(2):
        try:
            parsed = json.loads(text)
        except json.JSONDecodeError:
            break
        if not isinstance(parsed, dict):
            break
        nested = parsed.get("answer") or parsed.get("final_answer") or parsed.get("draft_answer")
        if not nested:
            break
        next_text = _strip_markdown_fence(_strip_think_blocks(str(nested).strip()))
        if next_text == text:
            break
        text = next_text
    return text.strip()


def _strip_think_blocks(text: str) -> str:
    return re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL | re.IGNORECASE).strip()


def _strip_markdown_fence(text: str) -> str:
    fenced_match = re.fullmatch(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
    return fenced_match.group(1).strip() if fenced_match else text.strip()


def _truncate(value: str, limit: int = 240) -> str:
    return value if len(value) <= limit else f"{value[:limit]}..."
