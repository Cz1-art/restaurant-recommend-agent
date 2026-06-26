from pydantic import BaseModel, Field, field_validator


class ChatMessage(BaseModel):
    role: str
    content: str


class ClientLocation(BaseModel):
    longitude: float
    latitude: float


class RecommendChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    user_id: int | None = None
    auth_token: str | None = None
    history: list[ChatMessage] = Field(default_factory=list)
    location: ClientLocation | dict | None = None
    enable_nearby_restaurant_search: bool = True


class RecommendedDish(BaseModel):
    id: int = 0
    name: str
    price: float = 0
    flavor: str | None = None
    category_name: str | None = None
    reason: str | None = None
    image: str | None = None


class MapFoodItem(BaseModel):
    name: str
    address: str | None = None
    distance_m: int | None = None
    type: str | None = None
    tel: str | None = None
    reason: str | None = None

    @field_validator("tel", mode="before")
    @classmethod
    def tel_to_str(cls, v):
        if v is None or v == "" or v == []:
            return None
        if isinstance(v, list):
            return ",".join(str(x) for x in v if x) or None
        return str(v)


class NearbyRestaurant(BaseModel):
    name: str | None = None
    address: str | None = None
    distance_m: int | None = None
    type: str | None = None
    tel: str | None = None
    location: str | None = None


class ToolCallRecord(BaseModel):
    tool_name: str
    reason: str
    input_summary: str | None = None
    output_summary: str | None = None
    success: bool = True


class RecommendChatResponse(BaseModel):
    reply: str
    recommended_dishes: list[RecommendedDish] = Field(default_factory=list)
    recommended_foods: list[MapFoodItem] = Field(default_factory=list)
    nearby_restaurants: list[NearbyRestaurant] = Field(default_factory=list)
    map_image_url: str | None = None
    intent: str = "unknown"
    data_source: str = "amap_poi"
    tool_calls: list[ToolCallRecord] = Field(default_factory=list)
    citations: list[dict] = Field(default_factory=list)
    raw_agent_state: dict | None = None
