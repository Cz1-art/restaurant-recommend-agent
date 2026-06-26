from __future__ import annotations

import re
from functools import lru_cache
from pathlib import Path

_PROJECT_ROOT = Path(__file__).resolve().parents[2]
_KB = _PROJECT_ROOT / "knowledge_base"

_FALLBACK = (
    "我是小味点餐助手。当前未连接 Dify，已使用本地餐厅知识库简要回答。"
    "如需精准推荐，请说明口味（辣/清淡）、人数或预算。"
)


class LocalKnowledgeService:
    def build_dify_like_response(self, query: str, user: str, conversation_id: str | None) -> dict:
        answer, resources = self._search(query)
        return {
            "conversation_id": conversation_id or "",
            "message_id": f"local-{abs(hash((query, user))) % 10**10}",
            "task_id": "local-menu-kb",
            "answer": answer,
            "metadata": {"retriever_resources": resources, "fallback_mode": "local_knowledge_base"},
        }

    def _search(self, query: str) -> tuple[str, list[dict]]:
        if not _KB.exists():
            return _FALLBACK, []
        terms = _tokenize(query)
        hits: list[tuple[int, str, str]] = []
        for path in sorted(_KB.glob("*.md")):
            text = path.read_text(encoding="utf-8")
            for block in _blocks(text):
                score = sum(block.lower().count(t) for t in terms)
                if score > 0:
                    hits.append((score, path.stem, block))
        hits.sort(key=lambda x: x[0], reverse=True)
        if not hits:
            return _FALLBACK, []
        top = hits[:3]
        answer = "根据餐厅知识库：\n\n" + "\n\n".join(f"- {b[:300]}" for _, _, b in top)
        resources = [
            {"dataset_name": stem, "document_name": stem, "content": body[:400], "score": 0.5 + i * 0.1}
            for i, (_, stem, body) in enumerate(top)
        ]
        return answer, resources


@lru_cache(maxsize=32)
def _tokenize(q: str) -> tuple[str, ...]:
    parts = re.findall(r"[\u4e00-\u9fff]{2,}|[a-z0-9]{2,}", q.lower())
    return tuple(dict.fromkeys(parts))


def _blocks(text: str) -> list[str]:
    return [p.strip() for p in re.split(r"\n##+ ", text) if p.strip()]
