from typing import Any

from app.agents.state import RestaurantAgentState
from app.core.config import settings


def _strip_duplicate_notice(text: str) -> str:
    """Remove repeated fallback footers already in rag_answer."""
    for marker in ("銆怐ify 鎶ラ敊銆?, "銆愮郴缁熸彁绀恒€?, "褰撳墠鏈繛鎺?Dify"):
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
        notices.append("闂瓟宸查€氳繃 DeepSeek+鐭ヨ瘑搴撴ˉ鎺ワ紙Dify 鏂囨。鍚屾簮锛夛紱鍦?Dify 浜戜负 LLM 閰嶆ā鍨嬪悗灏嗚嚜鍔ㄨ蛋鐪?Dify銆?)
    elif meta.get("fallback_mode") == "local_knowledge_base":
        notices.append(
            "Dify 浜戞殏鏈帴閫氾紙璇峰湪鎺у埗鍙颁负搴旂敤 LLM 鑺傜偣閰嶇疆妯″瀷骞跺彂甯冿級锛涘綋鍓嶄娇鐢ㄦ湰鍦?knowledge_base銆?
        )
    elif meta.get("dify_fallback_reason"):
        notices.append(f"Dify锛歿meta.get('dify_fallback_reason')}锛堝凡闄嶇骇鏈湴鐭ヨ瘑搴擄級")

    dify_text = _strip_duplicate_notice((state.get("rag_answer") or "").strip())
    if dify_text and "not sure what you mean" not in dify_text.lower():
        parts.append("銆愰棶绛斻€慭n" + dify_text)

    nearby = state.get("nearby_restaurants") or []
    if nearby:
        parts.append("銆愰檮杩戦鍘?路 楂樺痉 POI銆?)
        for i, r in enumerate(nearby[:3], start=1):
            dist = r.get("distance_m")
            dist_txt = f"绾?{dist} 绫? if dist else ""
            tel = f" 鐢佃瘽 {r.get('tel')}" if r.get("tel") else ""
            parts.append(
                f"{i}. {r.get('name')} {dist_txt}\n   {r.get('address') or '瑙佸湴鍥?}{tel}"
            )

    food_pois = state.get("map_food_pois") or []
    recommended_foods: list[dict[str, Any]] = []
    if food_pois:
        parts.append("銆愰檮杩戠編椋?路 楂樺痉 POI銆?)
        for i, p in enumerate(food_pois[:3], start=1):
            name = p.get("name") or "鏈煡"
            typ = (p.get("type") or "").split(";")[0]
            dist = p.get("distance_m")
            line = f"{i}. {name}"
            if dist:
                line += f"锛堢害{dist}绫筹級"
            if typ:
                line += f" 路 {typ}"
            parts.append(line)
            recommended_foods.append(
                {
                    "name": name,
                    "address": p.get("address"),
                    "distance_m": p.get("distance_m"),
                    "type": p.get("type"),
                    "tel": p.get("tel"),
                    "reason": "楂樺痉鍦板浘 POI",
                }
            )

    recommended = []
    if settings.use_ordering_menu:
        dishes = state.get("ranked_dishes") or []
        if dishes:
            parts.append(f"銆恵settings.home_store_name} 路 鑿滃崟銆?)
            for i, d in enumerate(dishes[:5], start=1):
                name = d.get("name", "鑿滃搧")
                price = d.get("price", 0)
                parts.append(f"{i}. {name} 楼{price}")
                recommended.append(
                    {
                        "id": int(d.get("id") or 0),
                        "name": name,
                        "price": float(price),
                        "flavor": d.get("flavor"),
                        "category_name": d.get("category_name"),
                        "reason": "鐐归鑿滃崟",
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
            "楂樺痉锛欿ey 绫诲瀷闇€涓恒€學eb 鏈嶅姟銆嶄笖寮€閫氬懆杈规悳绱紱鎺у埗鍙版柊寤?Web 鏈嶅姟 Key 鍚庢洿鏂?AMAP_API_KEY銆?
        )
    elif amap_fail and not nearby and not food_pois and state.get("enable_nearby_restaurant_search"):
        notices.append(f"楂樺痉锛歿amap_fail}")

    if map_mode and (nearby or food_pois):
        intro = "鏍规嵁楂樺痉鍦板浘 POI 鏁寸悊濡備笅锛堟湭浣跨敤灏忕▼搴忚彍鍗曪級锛歕n"
    elif map_mode:
        intro = "鎮ㄥソ锛屾垜鏄皬鍛炽€俓n"
    else:
        intro = "鎮ㄥソ锛乗n"

    if not parts and intent != "chitchat":
        parts.append("鍙棶锛氶檮杩戞湁浠€涔堝ソ鍚冪殑锛熷悆杈ｈ娉ㄦ剰浠€涔堬紵锛堥檮杩戞绱㈤渶瀹氫綅鎴栨紨绀哄潗鏍囷級")

    if notices:
        parts.append("銆愭帴鍏ョ姸鎬併€慭n" + "\n".join(f"鈥?{n}" for n in notices))

    final = (intro + "\n".join(parts)).strip()
    return {
        "final_answer": final,
        "recommended_dishes": recommended,
        "recommended_foods": recommended_foods,
        "integration_notices": notices,
        "tool_calls": [
            *state.get("tool_calls", []),
            {"tool_name": "response_composer", "reason": "姹囨€诲洖绛斻€?, "success": True},
        ],
    }
