import { apiRequest } from "./http";

export interface RecommendChatRequest {
  message: string;
  location?: { longitude: number; latitude: number } | null;
  enable_nearby_restaurant_search?: boolean;
}

export interface RecommendedDish {
  id: number;
  name: string;
  price: number;
  flavor?: string | null;
  category_name?: string | null;
  reason?: string | null;
  image?: string | null;
}

export interface NearbyRestaurant {
  name?: string | null;
  address?: string | null;
  distance_m?: number | null;
  tel?: string | null;
}

export interface ToolCallRecord {
  tool_name: string;
  reason: string;
  output_summary?: string | null;
}

export interface RecommendChatResponse {
  reply: string;
  recommended_dishes: RecommendedDish[];
  recommended_foods?: {
    name: string;
    address?: string;
    distance_m?: number;
    type?: string;
    tel?: string;
    reason?: string;
  }[];
  nearby_restaurants: NearbyRestaurant[];
  map_image_url?: string | null;
  intent?: string;
  tool_calls?: ToolCallRecord[];
  citations?: { title?: string; quote?: string; source_name?: string }[];
  data_source?: string;
}

export function sendRecommendChat(payload: RecommendChatRequest): Promise<RecommendChatResponse> {
  return apiRequest<RecommendChatResponse>("/api/v1/recommend/chat", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}
