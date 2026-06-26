from fastapi import APIRouter

from app.api.routes_recommend import router as recommend_router

api_router = APIRouter()
api_router.include_router(recommend_router, tags=["recommend"])
