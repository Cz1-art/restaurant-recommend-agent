import asyncio
import httpx
from app.core.config import settings

async def main():
    print("DIFY", settings.dify_base_url, "key", bool(settings.dify_api_key))
    if settings.dify_api_key:
        async with httpx.AsyncClient(base_url=settings.dify_base_url, timeout=30) as c:
            r = await c.post("/chat-messages", json={"inputs":{},"query":"ping","response_mode":"blocking","conversation_id":"","user":"t"}, headers={"Authorization": f"Bearer {settings.dify_api_key}"})
            print("dify_status", r.status_code, r.text[:250])
    if settings.amap_api_key:
        async with httpx.AsyncClient(timeout=15) as c:
            r = await c.get("https://restapi.amap.com/v3/place/around", params={"key":settings.amap_api_key,"location":"116.397,39.90923","types":"050000","radius":3000,"offset":2})
            print("amap_status", r.status_code, r.text[:250])

if __name__ == "__main__":
    asyncio.run(main())
