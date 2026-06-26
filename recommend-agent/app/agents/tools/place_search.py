from typing import Any

import httpx

from app.core.config import settings

AMAP_AROUND = "https://restapi.amap.com/v3/place/around"
AMAP_TEXT = "https://restapi.amap.com/v3/place/text"
AMAP_STATIC = "https://restapi.amap.com/v3/staticmap"
RESTAURANT_TYPE = "050000"

def _norm_tel(value) -> str | None:
    if value is None or value == "" or value == []:
        return None
    if isinstance(value, list):
        value = ",".join(str(x) for x in value if x)
    s = str(value).strip()
    return s or None

# 美食相关 POI（小吃、饮品等，用于“好吃的菜品”线索）
FOOD_POI_TYPE = "050000|050100|050200|050300"


def _normalize_location(location: dict[str, float | str] | None) -> tuple[float, float] | None:
    if not location:
        return None
    try:
        lng = float(location.get("longitude") or location.get("lng"))
        lat = float(location.get("latitude") or location.get("lat"))
    except (TypeError, ValueError):
        return None
    if not (-180 <= lng <= 180 and -90 <= lat <= 90):
        return None
    return lng, lat


def _build_static_map(longitude: float, latitude: float, places: list[dict[str, Any]]) -> str | None:
    key = settings.amap_static_map_key or settings.amap_api_key
    if not key:
        return None
    markers = [f"mid,,A:{longitude},{latitude}"]
    for index, place in enumerate(places[:4], start=1):
        loc = place.get("location") or ""
        if loc:
            markers.append(f"mid,,{index}:{loc}")
    joined = "|".join(markers)
    return (
        f"{AMAP_STATIC}?key={key}"
        f"&location={longitude},{latitude}"
        "&zoom=13&size=720*360"
        f"&markers={joined}"
    )


def _parse_pois(pois: list[dict[str, Any]], *, kind: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for poi in pois:
        out.append(
            {
                "name": poi.get("name"),
                "address": poi.get("address") or "",
                "distance_m": int(poi.get("distance") or 0),
                "type": poi.get("type"),
                "tel": _norm_tel(poi.get("tel")),
                "location": poi.get("location"),
                "poi_kind": kind,
            }
        )
    return out


async def _amap_get(url: str, params: dict[str, Any]) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=12.0) as client:
        response = await client.get(url, params=params)
        response.raise_for_status()
        return response.json()


async def search_nearby_restaurants(
    *,
    location: dict[str, float | str] | None,
    keywords: str | None = None,
) -> dict[str, Any]:
    normalized = _normalize_location(location)
    if normalized is None:
        return {
            "enabled": False,
            "restaurants": [],
            "map_image_url": None,
            "reason": "未提供有效经纬度。请在网页点击「获取定位」后重试。",
        }

    if not settings.amap_api_key:
        return {
            "enabled": False,
            "restaurants": [],
            "map_image_url": None,
            "reason": "未配置 AMAP_API_KEY，无法使用现实地图检索。",
        }

    longitude, latitude = normalized
    params: dict[str, Any] = {
        "key": settings.amap_api_key,
        "location": f"{longitude},{latitude}",
        "types": RESTAURANT_TYPE,
        "radius": settings.amap_place_radius,
        "offset": 10,
        "page": 1,
        "extensions": "base",
        "sortrule": "distance",
    }
    if keywords:
        params["keywords"] = keywords

    try:
        payload = await _amap_get(AMAP_AROUND, params)
    except httpx.HTTPError as exc:
        return {
            "enabled": False,
            "restaurants": [],
            "map_image_url": None,
            "reason": f"地图服务请求失败：{exc.__class__.__name__}",
        }

    if str(payload.get("status")) != "1":
        return {
            "enabled": False,
            "restaurants": [],
            "map_image_url": None,
            "reason": str(payload.get("info") or "地图查询失败"),
        }

    restaurants = _parse_pois(payload.get("pois") or [], kind="restaurant")
    return {
        "enabled": True,
        "restaurants": restaurants,
        "map_image_url": _build_static_map(longitude, latitude, restaurants),
        "reason": None,
    }


async def search_nearby_food_pois(
    *,
    location: dict[str, float | str] | None,
    keywords: str | None = None,
) -> dict[str, Any]:
    """附近“好吃的”线索：餐饮类 POI 名称（非小程序菜单）。"""
    normalized = _normalize_location(location)
    if normalized is None or not settings.amap_api_key:
        return {"enabled": False, "items": [], "reason": "需要定位与 AMAP_API_KEY"}

    longitude, latitude = normalized
    kw = keywords or "美食"
    params = {
        "key": settings.amap_api_key,
        "location": f"{longitude},{latitude}",
        "keywords": kw,
        "types": FOOD_POI_TYPE,
        "radius": settings.amap_place_radius,
        "offset": 12,
        "page": 1,
        "extensions": "base",
        "sortrule": "distance",
    }
    try:
        payload = await _amap_get(AMAP_AROUND, params)
    except httpx.HTTPError:
        return {"enabled": False, "items": [], "reason": "美食 POI 请求失败"}

    if str(payload.get("status")) != "1":
        return {"enabled": False, "items": [], "reason": str(payload.get("info") or "查询失败")}

    items = _parse_pois(payload.get("pois") or [], kind="food_poi")
    return {"enabled": True, "items": items, "reason": None}
