"""When Dify cloud LLM is not configured, use DeepSeek + local knowledge_base."""
from __future__ import annotations

import httpx

from app.core.config import settings
from app.services.local_knowledge_service import LocalKnowledgeService


class DifyLlmBridge:
    async def chat_message(self, query: str, user: str, conversation_id: str | None = None) -> dict:
        kb = LocalKnowledgeService()
        base = kb.build_dify_like_response(query, user, conversation_id)
        resources = (base.get("metadata") or {}).get("retriever_resources") or []

        if not settings.deepseek_api_key:
            meta = base.get("metadata") or {}
            meta["bridge_mode"] = "local_kb_only"
            base["metadata"] = meta
            return base

        context = "\n\n".join(
            f"- {r.get('document_name', 'doc')}: {r.get('content', '')[:500]}"
            for r in resources
        ) or base.get("answer", "")

        system = (
            "你是餐饮推荐助手小味。根据知识库片段用中文回答。"
            "不要编造具体餐厅店名（地图由系统另提供）。过敏与急症须提示就医。"
        )
        payload = {
            "model": settings.deepseek_model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": f"问题：{query}\n\n知识库：\n{context}"},
            ],
            "temperature": 0.3,
            "max_tokens": 900,
        }
        async with httpx.AsyncClient(
            base_url=settings.deepseek_base_url.rstrip("/"),
            timeout=settings.deepseek_timeout_seconds,
        ) as client:
            r = await client.post(
                "/chat/completions",
                json=payload,
                headers={"Authorization": f"Bearer {settings.deepseek_api_key}"},
            )
            r.raise_for_status()
            text = r.json()["choices"][0]["message"]["content"].strip()

        return {
            "conversation_id": conversation_id or "",
            "message_id": f"bridge-{abs(hash((query, user))) % 10**10}",
            "task_id": "dify-llm-bridge",
            "answer": text,
            "metadata": {
                "retriever_resources": resources,
                "bridge_mode": "deepseek_kb",
                "dify_cloud_ok": False,
            },
        }
