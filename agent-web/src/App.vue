<script setup lang="ts">
import { onMounted, ref } from "vue";
import { fetchHealth } from "./api/http";

const online = ref(false);

onMounted(async () => {
  try {
    const h = await fetchHealth();
    online.value = h.status === "ok";
  } catch {
    online.value = false;
  }
});
</script>

<template>
  <main class="app-shell">
    <header class="topbar">
      <RouterLink class="brand" to="/">
        <span class="brand-mark">R</span>
        <span>
          <span class="eyebrow">Restaurant Agent</span>
          <strong>餐饮推荐系统</strong>
        </span>
      </RouterLink>
      <span class="user-chip" :class="online ? 'ok' : 'bad'">{{ online ? "服务正常" : "请启动 8001" }}</span>
    </header>
    <RouterView v-slot="{ Component }">
      <Transition name="page-fade" mode="out-in">
        <component :is="Component" />
      </Transition>
    </RouterView>
  </main>
</template>
