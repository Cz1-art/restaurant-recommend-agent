import httpx
from fastapi import HTTPException, status
from pydantic import BaseModel

from app.core.config import settings


class Citation(BaseModel):
    title: str
    source_name: str | None = None
    source_url: str | None = None
    document_id: str | None = None
    segment_id: str | None = None
    quote: str | None = None
    score: float | None = None


class AgentToolCall(BaseModel):
    tool_name: str
    reason: str
    input_summary: str | None = None
    output_summary: str | None = None
    success: bool = True


async def _dify_cloud_ok() -> bool:
    if not settings.dify_api_key:
        return False
    try:
        async with httpx.AsyncClient(
            base_url=settings.dify_base_url,
            timeout=20,
        ) as client:
            r = await client.post(
                "/chat-messages",
                json={
                    "inputs": {},
                    "query": "ping",
                    "response_mode": "blocking",
                    "conversation_id": "",
                    "user": "health",
                },
                headers={"Authorization": f"Bearer {settings.dify_api_key}"},
            )
        return r.status_code == 200
    except Exception:
        return False


class DifyService:
    async def chat_message(self, query: str, user: str, conversation_id: str | None = None) -> dict:
        if not settings.dify_api_key:
            if getattr(settings, "dify_required", True):
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="dify_api_key_not_configured",
                )
            from app.services.local_knowledge_service import LocalKnowledgeService

            return LocalKnowledgeService().build_dify_like_response(query, user, conversation_id)

        headers = {"Authorization": f"Bearer {settings.dify_api_key}"}
        payload = {
            "inputs": {},
            "query": query,
            "response_mode": "blocking",
            "conversation_id": conversation_id or "",
            "user": user,
        }

        if getattr(settings, "use_dify_llm_bridge", False):
            if not await _dify_cloud_ok():
                from app.services.dify_llm_bridge import DifyLlmBridge

                return await DifyLlmBridge().chat_message(query, user, conversation_id)

        try:
            async with httpx.AsyncClient(
                base_url=settings.dify_base_url,
                timeout=settings.dify_timeout_seconds,
            ) as client:
                response = await client.post("/chat-messages", json=payload, headers=headers)
                response.raise_for_status()
                data = response.json()
                meta = data.get("metadata") or {}
                meta["dify_cloud_ok"] = True
                data["metadata"] = meta
                return data
        except httpx.TimeoutException as exc:
            raise HTTPException(status_code=504, detail="dify_request_timeout") from exc
        except httpx.HTTPStatusError as exc:
            body = {}
            try:
                body = exc.response.json()
            except Exception:
                body = {"message": exc.response.text[:500]}
            msg = str(body.get("message") or body.get("msg") or "")
            if getattr(settings, "dify_fallback_on_error", False):
                from app.services.local_knowledge_service import LocalKnowledgeService

                resp = LocalKnowledgeService().build_dify_like_response(query, user, conversation_id)
                meta = resp.get("metadata") or {}
                meta["dify_fallback_reason"] = msg or body.get("code") or body
                meta["dify_cloud_ok"] = False
                resp["metadata"] = meta
                return resp
            raise HTTPException(
                status_code=502,
                detail={
                    "code": "dify_bad_response",
                    "status_code": exc.response.status_code,
                    "dify_code": body.get("code"),
                    "dify_message": msg,
                    "fix_hint": "Dify 云：编排 → LLM 节点 → 配置模型供应商 → 发布",
                },
            ) from exc

        except httpx.RequestError as exc:
            raise HTTPException(status_code=502, detail="dify_request_failed") from exc

    def extract_citations(self, dify_response: dict) -> list[Citation]:
        metadata = dify_response.get("metadata") or {}
        resources = metadata.get("retriever_resources") or []
        citations: list[Citation] = []
        for resource in resources:
            citations.append(
                Citation(
                    title=str(
                        resource.get("document_name")
                        or resource.get("dataset_name")
                        or resource.get("title")
                        or "Dify Knowledge Base"
                    ),
                    source_name=resource.get("dataset_name") or "Dify Knowledge Base",
                    source_url=resource.get("url"),
                    document_id=self._string_or_none(resource.get("document_id")),
                    segment_id=self._string_or_none(resource.get("segment_id")),
                    quote=resource.get("content") or resource.get("segment_content"),
                    score=self._float_or_none(resource.get("score")),
                )
            )
        return citations

    def extract_tool_calls(self, dify_response: dict, question: str) -> list[AgentToolCall]:
        metadata = dify_response.get("metadata") or {}
        agent_thoughts = metadata.get("agent_thoughts") or []
        tool_calls: list[AgentToolCall] = []
        for thought in agent_thoughts:
            tool_name = thought.get("tool") or thought.get("tool_name")
            if not tool_name:
                continue
            tool_calls.append(
                AgentToolCall(
                    tool_name=str(tool_name),
                    reason=str(
                        thought.get("thought")
                        or "Dify Agent selected this tool for the restaurant question."
                    ),
                    input_summary=self._truncate(thought.get("tool_input")),
                    output_summary=self._truncate(thought.get("observation")),
                    success=True,
                )
            )
        if not tool_calls and metadata.get("retriever_resources"):
            tool_calls.append(
                AgentToolCall(
                    tool_name="knowledge_base_retrieval",
                    reason=(
                        "The question requires evidence from the configured restaurant "
                        "knowledge base before generating an answer."
                    ),
                    input_summary=question,
                    output_summary=(
                        f"Retrieved {len(metadata.get('retriever_resources') or [])} "
                        "knowledge snippets from Dify."
                    ),
                    success=True,
                )
            )
        return tool_calls

    def _string_or_none(self, value: object) -> str | None:
        if value is None:
            return None
        return str(value)

    def _float_or_none(self, value: object) -> float | None:
        try:
            return None if value is None else float(value)
        except (TypeError, ValueError):
            return None

    def _truncate(self, value: object, limit: int = 500) -> str | None:
        if value is None:
            return None
        text = str(value)
        return text if len(text) <= limit else f"{text[:limit]}..."
