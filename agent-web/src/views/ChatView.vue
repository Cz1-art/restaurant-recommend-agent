<script setup lang="ts">
import gsap from "gsap";
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { sendRecommendChat, type RecommendChatResponse } from "../api/chat";
import { ApiError, fetchHealth, fetchIntegrationStatus, type IntegrationStatus } from "../api/http";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  response?: RecommendChatResponse;
}

interface ClientLocation {
  longitude: number;
  latitude: number;
}

const messages = ref<ChatMessage[]>([]);
const question = ref("");
const isSending = ref(false);
const errorMessage = ref("");
const agentOnline = ref(false);
const integrationStatus = ref<IntegrationStatus | null>(null);
const locationMessage = ref("");
const enableNearby = ref(true);
const clientLocation = ref<ClientLocation | null>(null);
const useDemoLocation = ref(false);
const manualLng = ref("");
const manualLat = ref("");
const DEMO_LOCATIONS = [
  { label: "北京·天安门附近", longitude: 116.397428, latitude: 39.90923 },
  { label: "上海·人民广场附近", longitude: 121.475, latitude: 31.233 },
  { label: "广州·天河附近", longitude: 113.331, latitude: 23.137 },
];
const chatPaneRef = ref<HTMLElement | null>(null);
const rootRef = ref<HTMLElement | null>(null);

const workflowSteps = ['意图识别', '约束提取', '地图模式', 'Dify RAG', '美食 POI', '附近餐厅', '门店信息', '汇总回复'];

const canSend = computed(() => question.value.trim().length > 0 && !isSending.value);

const latestResponse = computed(() => {
  const m = [...messages.value].reverse().find((x) => x.response);
  return m?.response;
});

function createId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function normalizeImage(url: string | null | undefined) {
  if (!url) return null;
  return url
    .replace("http://localhost:3000", "/ordering")
    .replace("http://127.0.0.1:3000", "/ordering");
}

onMounted(async () => {
  try {
    const h = await fetchHealth();
    agentOnline.value = h.status === "ok";
    try { integrationStatus.value = await fetchIntegrationStatus(); } catch { integrationStatus.value = null; }
  } catch {
    agentOnline.value = false;
    errorMessage.value =
      "无法连接 recommend-agent（8001）。请先运行 recommend-agent 目录下的 start-agent.ps1 或 uvicorn。";
  }

  messages.value.push({
    id: "welcome",
    role: "assistant",
    content:
      "你好，我是餐饮推荐助手小味。根据现实地图推荐高德 POI与美食去处。请获取定位或点演示坐标；定位失败时 Dify 仍可回答。"
  });

  if (rootRef.value) {
    gsap.fromTo(
      rootRef.value.querySelectorAll(".stagger-in"),
      { y: 16, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.45, stagger: 0.06, ease: "power3.out" }
    );
  }
});

watch(enableNearby, async (on) => {
  if (on && !clientLocation.value) {
    await requestLocation();
  }
});

function applyDemoLocation(index: number) {
  const demo = DEMO_LOCATIONS[index];
  if (!demo) return;
  clientLocation.value = { longitude: demo.longitude, latitude: demo.latitude };
  useDemoLocation.value = true;
  locationMessage.value = `已使用演示坐标：${demo.label}`;
}

function applyManualLocation() {
  const lng = parseFloat(manualLng.value);
  const lat = parseFloat(manualLat.value);
  if (Number.isNaN(lng) || Number.isNaN(lat)) {
    locationMessage.value = "请填写有效经度、纬度（如 116.397 和 39.909）";
    return;
  }
  clientLocation.value = { longitude: lng, latitude: lat };
  useDemoLocation.value = false;
  locationMessage.value = `已用手动坐标（${lat.toFixed(4)}, ${lng.toFixed(4)}）`;
}

async function requestLocation() {
  if (!navigator.geolocation) {
    locationMessage.value = "浏览器不支持定位 → 请用演示坐标或手动填写经纬度。";
    return;
  }
  locationMessage.value = "正在定位…请在浏览器允许位置权限";
  return new Promise<void>((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        useDemoLocation.value = false;
        clientLocation.value = {
          longitude: pos.coords.longitude,
          latitude: pos.coords.latitude,
        };
        locationMessage.value = `定位成功（${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}）`;
        resolve();
      },
      (err) => {
        const c = err?.code;
        let hint = "定位被拒绝或失败。";
        if (c === 1) hint += " 请允许站点访问位置，或点「演示坐标」。";
        else if (c === 2) hint += " 无位置信号，请用演示坐标。";
        else if (c === 3) hint += " 超时，请用演示坐标。";
        hint += " 无坐标时无法检索高德 POI；Dify 知识库问答仍可用。";
        locationMessage.value = hint;
        resolve();
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
    );
  });
}

async function submitQuestion(preset?: string) {
  const content = (preset ?? question.value).trim();
  if (!content || isSending.value) return;

  errorMessage.value = "";
  question.value = "";
  isSending.value = true;

  messages.value.push({ id: createId(), role: "user", content });
  await animateLatest();

  if (enableNearby.value && !clientLocation.value) {
    errorMessage.value = "已开启附近检索但未设置坐标：请定位、演示坐标或手动填写经纬度。";
    isSending.value = false;
    return;
  }

  try {
    const response = await sendRecommendChat({
      message: content,
      location: enableNearby.value ? clientLocation.value : null,
      enable_nearby_restaurant_search: enableNearby.value
    });

    messages.value.push({
      id: createId(),
      role: "assistant",
      content: response.reply,
      response
    });
    await animateLatest();
  } catch (error) {
    const msg =
      error instanceof ApiError
        ? error.message
        : error instanceof Error
          ? error.message
          : "问答请求失败";
    errorMessage.value = msg;
  } finally {
    isSending.value = false;
  }
}

async function animateLatest() {
  await nextTick();
  const nodes = chatPaneRef.value?.querySelectorAll(".message");
  const latest = nodes?.[nodes.length - 1];
  if (latest) {
    gsap.from(latest, { y: 14, opacity: 0, duration: 0.32, ease: "power3.out" });
    latest.scrollIntoView({ behavior: "smooth", block: "end" });
  }
}

function submitOnEnter(e: KeyboardEvent) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    void submitQuestion();
  }
}
</script>

<template>
  <section ref="rootRef" class="chat-page">
    <div class="hero stagger-in">
      <p class="eyebrow">Restaurant Agent</p>
      <h1>餐饮推荐 · 多智能体问答</h1>
      <p class="lede">数据来源：高德地图 POI（不调用小程序菜单）。</p>
      <p v-if="integrationStatus" class="integration-bar stagger-in">
        <span :class="integrationStatus.dify.cloud_ok ? 'ok' : 'warn'">Dify：{{ integrationStatus.dify.cloud_ok ? '已接通云知识库' : '未接通（见下方接入状态）' }}</span>
        <span class="warn" v-if="!integrationStatus.dify.cloud_ok">{{ integrationStatus.dify.message }}</span>
        <span :class="integrationStatus.amap.configured ? 'ok' : 'warn'">高德 Key 已写入配置</span>
      </p>
      <span class="status-pill" :class="agentOnline ? 'ok' : 'bad'">
        {{ agentOnline ? "Agent 已连接 (8001)" : "Agent 未连接" }}
      </span>
    </div>

    <div class="controls stagger-in">
      <label class="toggle">
        <input v-model="enableNearby" type="checkbox" />
        高德 POI检索（高德）
      </label>
      <button class="ghost-button" type="button" @click="requestLocation">获取定位</button>
      <button v-for="(d, i) in DEMO_LOCATIONS" :key="d.label" class="ghost-button" type="button" @click="applyDemoLocation(i)">演示：{{ d.label }}</button>
      <div class="manual-loc">
        <input v-model="manualLng" class="loc-input" placeholder="经度" />
        <input v-model="manualLat" class="loc-input" placeholder="纬度" />
        <button class="ghost-button" type="button" @click="applyManualLocation">手动坐标</button>
      </div>
      <span class="loc-hint">{{ locationMessage }}</span>
    </div>

    <p v-if="errorMessage" class="error-banner stagger-in">{{ errorMessage }}</p>

    <div class="layout stagger-in">
      <aside class="side-panel">
        <h2>Agent 流水线</h2>
        <ol class="workflow">
          <li v-for="step in workflowSteps" :key="step">{{ step }}</li>
        </ol>
        <div v-if="latestResponse?.citations?.length" class="tool-log">
          <h3>知识库引用 (Dify)</h3>
          <ul>
            <li v-for="(c, i) in latestResponse.citations" :key="i">
              <strong>{{ c.title }}</strong>
              <div class="muted">{{ c.quote }}</div>
            </li>
          </ul>
        </div>
        <div v-if="latestResponse?.tool_calls?.length" class="tool-log">
          <h3>本轮实际执行</h3>
          <ul>
            <li v-for="(t, i) in latestResponse.tool_calls" :key="i">
              <strong>{{ t.tool_name }}</strong>
              <span>{{ t.reason }}</span>
            </li>
          </ul>
        </div>
      </aside>

      <div ref="chatPaneRef" class="chat-panel card">
        <div class="quick-row">
          <button type="button" class="chip" @click="submitQuestion('附近有什么好吃的餐厅？')">高德 POI</button>
          <button type="button" class="chip" @click="submitQuestion('附近好吃的火锅')">附近美食</button>
          <button type="button" class="chip" @click="submitQuestion('有什么实惠的套餐')">实惠套餐</button>
        </div>

        <div class="messages">
          <article
            v-for="message in messages"
            :key="message.id"
            class="message"
            :class="message.role"
          >
            <div class="message-role">{{ message.role === "user" ? "你" : "小味" }}</div>
            <div class="message-body">{{ message.content }}</div>

            <div v-if="message.response?.nearby_restaurants?.length" class="insight-block">
              <h4>高德 POI</h4>
              <ul>
                <li v-for="(r, idx) in message.response.nearby_restaurants" :key="idx">
                  <strong>{{ r.name }}</strong>
                  <span v-if="r.distance_m"> · {{ r.distance_m }}m</span>
                  <div class="muted">{{ r.address }}</div>
                </li>
              </ul>
              <img
                v-if="message.response.map_image_url"
                class="map-shot"
                :src="message.response.map_image_url"
                alt="地图"
              />
            </div>

            <div v-if="message.response?.recommended_foods?.length" class="insight-block">
              <h4>附近美食 / 好吃的去处（地图）</h4>
              <ul>
                <li v-for="(f, idx) in message.response.recommended_foods" :key="idx">
                  <strong>{{ f.name }}</strong>
                  <span v-if="f.distance_m"> · {{ f.distance_m }}m</span>
                  <div class="muted">{{ f.address }}</div>
                </li>
              </ul>
            </div>
            <p v-if="message.response?.data_source === 'amap_poi'" class="muted">未使用小程序菜单</p>
          </article>

          <div v-if="isSending" class="message assistant typing">正在调用多智能体流水线…</div>
        </div>

        <footer class="composer">
          <textarea
            v-model="question"
            rows="2"
            placeholder="例如：附近有什么好吃的？再推荐本店辣的菜"
            @keydown="submitOnEnter"
          />
          <button class="primary-button" type="button" :disabled="!canSend" @click="submitQuestion()">
            发送
          </button>
        </footer>
      </div>
    </div>
  </section>
</template>
