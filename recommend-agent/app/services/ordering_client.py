"""HTTP client for smart-ordering-system (Express + SQLite)."""

from __future__ import annotations

from typing import Any

import httpx

from app.core.config import settings


class OrderingApiClient:
    def __init__(self) -> None:
        self.base_url = settings.ordering_api_base_url.rstrip("/")
        self.timeout = settings.ordering_timeout_seconds

    def _headers(self, auth_token: str | None) -> dict[str, str]:
        headers: dict[str, str] = {}
        if auth_token:
            headers["Authorization"] = f"Bearer {auth_token}"
        if settings.ordering_internal_token:
            headers["X-Internal-Token"] = settings.ordering_internal_token
        return headers

    async def get_dishes(self, *, status: str = "on", keyword: str | None = None) -> list[dict[str, Any]]:
        params: dict[str, str] = {}
        if status:
            params["status"] = status
        if keyword:
            params["keyword"] = keyword
        data = await self._get("/dishes", params=params)
        return data if isinstance(data, list) else []

    async def get_recommend_packs(self) -> dict[str, Any]:
        data = await self._get("/dishes/recommend")
        return data if isinstance(data, dict) else {}

    async def get_guess_you_like(self, auth_token: str) -> list[dict[str, Any]]:
        data = await self._get("/dishes/recommend/guess", auth_token=auth_token)
        return data if isinstance(data, list) else []

    async def _get(
        self,
        path: str,
        *,
        params: dict[str, str] | None = None,
        auth_token: str | None = None,
    ) -> Any:
        url = f"{self.base_url}{path}"
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(url, params=params, headers=self._headers(auth_token))
            response.raise_for_status()
            payload = response.json()
        if isinstance(payload, dict) and payload.get("code") == 0:
            return payload.get("data")
        return payload
