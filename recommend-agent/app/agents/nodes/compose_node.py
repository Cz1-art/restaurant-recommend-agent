from typing import Any

from app.agents.state import RestaurantAgentState
from app.core.config import settings


def _strip_duplicate_notice(text: str) -> str:
    """Remove repeated fallback footers already in rag_answer."""
    for marker in ("【Dify 报错】", "【系统提示】", "当前未连接 Dify"):
        if text.count(marker) > 1:
            first = text.find(marker)
            second = text.find(marker, first + 1)
            if second > 0:
                text = text[:second].strip()
    return text.strip()


async def compose_node(state: RestaurantAgentState) -> dict[str, Any]:
    parts: list[str] = []
    intent = state.get("intent") or "unknown"
    map_mode = not settings.use_ordering_menu
    notices: list[str] = []

    dify_resp = state.get("dify_response") or {}
    meta = dify_resp.get("metadata") or {}
    if meta.get("bridge_mode") == "deepseek_kb":
        notices.append("问答已通过 DeepSeek+知识库桥接（Dify 文档同源）；在 Dify 云为 LLM 配模型后将自动走真 Dify。")
    elif meta.get("fallback_mode") == "local_knowledge_base":
        notices.append(
            "Dify 云暂未接通（请在控制台为应用 LLM 节点配置模型并发布）；当前使用本地 knowledge_base。"
        )
    elif meta.get("dify_fallback_reason"):
        notices.append(f"Dify：{meta.get('dify_fallback_reason')}（已降级本地知识库）")

    dify_text = _strip_duplicate_notice((state.get("rag_answer") or "").strip())
    if dify_text and "not sure what you mean" not in dify_text.lower():
        parts.append("【问答】\n" + dify_text)

    nearby = state.get("nearby_restaurants") or []
    if nearby:
        parts.append("【附近餐厅 · 高德 POI】")
        for i, r in enumerate(nearby[:6], start=1):
            dist = r.get("distance_m")
            dist_txt = f"约 {dist} 米" if dist else ""
            tel = f" 电话 {r.get('tel')}" if r.get("tel") else ""
            parts.append(
                f"{i}. {r.get('name')} {dist_txt}\n   {r.get('address') or '见地图'}{tel}"
            )

    food_pois = state.get("map_food_pois") or []
    recommended_foods: list[dict[str, Any]] = []
    if food_pois:
        parts.append("【附近美食 · 高德 POI】")
        for i, p in enumerate(food_pois[:8], start=1):
            name = p.get("name") or "未知"
            typ = (p.get("type") or "").split(";")[0]
            dist = p.get("distance_m")
            line = f"{i}. {name}"
            if dist:
                line += f"（约{dist}米）"
            if typ:
                line += f" · {typ}"
            parts.append(line)
            recommended_foods.append(
                {
                    "name": name,
                    "address": p.get("address"),
                    "distance_m": p.get("distance_m"),
                    "type": p.get("type"),
                    "tel": p.get("tel"),
                    "reason": "高德地图 POI",
                }
            )

    recommended = []
    if settings.use_ordering_menu:
        dishes = state.get("ranked_dishes") or []
        if dishes:
            parts.append(f"【{settings.home_store_name} · 菜单】")
            for i, d in enumerate(dishes[:5], start=1):
                name = d.get("name", "菜品")
                price = d.get("price", 0)
                parts.append(f"{i}. {name} ¥{price}")
                recommended.append(
                    {
                        "id": int(d.get("id") or 0),
                        "name": name,
                        "price": float(price),
                        "flavor": d.get("flavor"),
                        "category_name": d.get("category_name"),
                        "reason": "点餐菜单",
                        "image": d.get("image"),
                    }
                )

    amap_fail = next(
        (
            str(t.get("output_summary"))
            for t in state.get("tool_calls") or []
            if t.get("tool_name", "").startswith("amap")
            and t.get("success") is False
            and t.get("output_summary")
        ),
        None,
    )
    if amap_fail and "USERKEY" in amap_fail:
        notices.append(
            "高德：Key 类型需为「Web 服务」且开通周边搜索；控制台新建 Web 服务 Key 后更新 AMAP_API_KEY。"
        )
    elif amap_fail and not nearby and not food_pois and state.get("enable_nearby_restaurant_search"):
        notices.append(f"高德：{amap_fail}")

    if map_mode and (nearby or food_pois):
        intro = "根据高德地图 POI 整理如下（未使用小程序菜单）：\n"
    elif map_mode:
        intro = "您好，我是小味。\n"
    else:
        intro = "您好！\n"

    if not parts and intent != "chitchat":
        parts.append("可问：附近有什么好吃的？吃辣要注意什么？（附近检索需定位或演示坐标）")

    if notices:
        parts.append("【接入状态】\n" + "\n".join(f"• {n}" for n in notices))

    final = (intro + "\n".join(parts)).strip()
    return {
        "final_answer": final,
        "recommended_dishes": recommended,
        "recommended_foods": recommended_foods,
        "integration_notices": notices,
        "tool_calls": [
            *state.get("tool_calls", []),
            {"tool_name": "response_composer", "reason": "汇总回答。", "success": True},
        ],
    }
