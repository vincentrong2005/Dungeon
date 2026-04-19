<template>
  <div
    class="splash-screen relative flex w-full flex-col items-center justify-center overflow-y-auto overflow-x-hidden bg-[#050505] text-dungeon-paper transition-opacity duration-1000"
    :class="isVisible ? 'opacity-100' : 'opacity-0'"
  >
    <div
      class="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
      :style="{ backgroundImage: `url('${currentBackgroundUrl}')` }"
    ></div>
    <div
      v-if="incomingBackgroundUrl"
      class="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700 ease-in-out"
      :class="isIncomingVisible ? 'opacity-100' : 'opacity-0'"
      :style="{ backgroundImage: `url('${incomingBackgroundUrl}')` }"
    ></div>
    <div
      v-if="outgoingBackgroundUrl"
      class="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat transition-opacity duration-700 ease-in-out"
      :class="isOutgoingVisible ? 'opacity-100' : 'opacity-0'"
      :style="{ backgroundImage: `url('${outgoingBackgroundUrl}')` }"
    ></div>

    <button
      type="button"
      class="absolute inset-0 z-[1] cursor-pointer bg-transparent focus:outline-none"
      aria-label="点击切换背景"
      @click="switchBackground"
    ></button>

    <div class="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_30%,_rgba(60,40,30,0.3),_#000000_90%)]"></div>
    <div
      class="absolute inset-0 z-0 animate-pulse-slow bg-[length:200px] bg-repeat opacity-30 mix-blend-overlay"
      style="background-image: url('https://www.transparenttextures.com/patterns/dark-matter.png')"
    ></div>

    <div class="absolute left-4 top-4 h-40 w-24 border-l-2 border-t-2 border-dungeon-brown opacity-50 sm:left-8 sm:top-8 sm:h-64 sm:w-64"></div>
    <div
      class="absolute bottom-4 right-4 h-40 w-24 border-b-2 border-r-2 border-dungeon-brown opacity-50 sm:bottom-8 sm:right-8 sm:h-64 sm:w-64"
    ></div>

    <button
      class="absolute right-4 top-4 z-50 flex h-8 w-8 items-center justify-center rounded border border-dungeon-brown/50 bg-dungeon-dark/60 text-dungeon-gold-dim transition-all duration-300 hover:border-dungeon-gold/50 hover:bg-dungeon-brown hover:text-dungeon-gold"
      @click="$emit('toggleFullscreen')"
    >
      <Maximize class="size-4" />
    </button>

    <div class="z-10 flex w-full max-w-5xl flex-col items-center space-y-6 px-4 py-6 sm:space-y-10 sm:px-6 sm:py-10">
      <div class="relative space-y-4 text-center">
        <div
          class="absolute -left-5 top-0 h-16 w-1 bg-gradient-to-b from-transparent via-dungeon-gold to-transparent opacity-50 sm:-left-12 sm:h-24"
        ></div>
        <div
          class="absolute -right-5 top-0 h-16 w-1 bg-gradient-to-b from-transparent via-dungeon-gold to-transparent opacity-50 sm:-right-12 sm:h-24"
        ></div>

        <h1
          class="bg-gradient-to-b from-[#f9e6a0] to-dungeon-gold-dim bg-clip-text font-heading text-5xl tracking-wide text-transparent drop-shadow-[0_4px_10px_rgba(0,0,0,0.8)] sm:text-6xl md:text-8xl"
        >
          欲望地牢
        </h1>
        <h2
          class="mt-2 border-t border-dungeon-brown pt-4 font-body text-base uppercase tracking-[0.24em] text-[#f9e6a0] sm:text-xl sm:tracking-[0.35em] md:text-2xl"
        >
          Created by Vin
        </h2>
      </div>

      <div class="flex w-full max-w-[22rem] flex-col space-y-4">
        <button
          class="group relative flex min-w-0 items-center justify-center space-x-3 overflow-hidden border border-dungeon-gold/30 bg-[#1a0f08] px-6 py-4 transition-all duration-300 hover:border-dungeon-gold hover:bg-dungeon-brown disabled:cursor-wait disabled:opacity-75 sm:px-8"
          :disabled="environmentChecking"
          @click="$emit('start')"
        >
          <div class="absolute inset-0 w-0 bg-dungeon-gold/10 transition-all duration-300 group-hover:w-full"></div>
          <LoaderCircle v-if="environmentChecking" class="size-5 animate-spin text-dungeon-gold" />
          <Play v-else class="size-5 text-dungeon-gold transition-transform group-hover:scale-110" />
          <span
            class="font-heading text-base tracking-[0.18em] text-dungeon-paper transition-colors group-hover:text-dungeon-gold sm:text-lg sm:tracking-widest"
          >
            {{ environmentChecking ? '检测环境中' : '进入地牢' }}
          </span>
        </button>

        <button
          class="group relative flex min-w-0 items-center justify-center space-x-2 border border-dungeon-gold/20 bg-[#120b08] px-6 py-3 font-heading tracking-[0.2em] text-dungeon-paper/90 transition-all duration-300 hover:border-dungeon-gold/60 hover:bg-[#26150d] disabled:cursor-wait disabled:opacity-75 sm:px-8 sm:tracking-[0.28em]"
          :disabled="environmentChecking"
          @click="$emit('checkEnvironment')"
        >
          <LoaderCircle v-if="environmentChecking" class="size-4 animate-spin text-dungeon-gold" />
          <ShieldCheck v-else class="size-4 text-dungeon-gold" />
          <span>{{ environmentChecking ? '检测中' : '环境检测' }}</span>
        </button>

        <button
          class="group relative flex min-w-0 items-center justify-center space-x-2 border border-dungeon-brown/80 bg-[#120b08] px-6 py-3 font-heading tracking-[0.18em] text-dungeon-paper/85 transition-all duration-300 hover:border-dungeon-gold/60 hover:bg-dungeon-brown/80 sm:px-8 sm:tracking-widest"
          @click="$emit('openCollection')"
        >
          <Star class="size-4" />
          <span>魔女的收藏</span>
        </button>
      </div>

      <Transition name="panel-fade">
        <section
          v-if="shouldShowPanel"
          class="w-full max-w-[42rem] overflow-hidden rounded-2xl border border-dungeon-gold/30 bg-[#120b08]/88 shadow-[0_18px_45px_rgba(0,0,0,0.38)] backdrop-blur-md"
        >
          <div class="flex items-start justify-between gap-4 border-b border-dungeon-gold/15 px-5 py-4">
            <div class="space-y-2">
              <div class="flex items-center gap-2 text-dungeon-gold">
                <ShieldCheck class="size-4" />
                <span class="font-heading text-sm tracking-[0.28em]">环境监测</span>
              </div>
              <p class="text-sm text-dungeon-paper/90">
                {{ environmentChecking ? '正在检查酒馆助手、提示词模板与 MVU 脚本...' : environmentSummary }}
              </p>
            </div>
            <div class="flex items-start gap-2">
              <span v-if="lastCheckedLabel" class="pt-1 text-[11px] tracking-[0.18em] text-dungeon-paper/45">
                {{ lastCheckedLabel }}
              </span>
              <button
                type="button"
                class="rounded-full border border-dungeon-gold/15 p-1 text-dungeon-paper/55 transition hover:border-dungeon-gold/40 hover:text-dungeon-paper disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="environmentChecking"
                aria-label="关闭环境监测弹窗"
                @click="dismissPanel"
              >
                <X class="size-4" />
              </button>
            </div>
          </div>

          <div class="space-y-3 px-5 py-4">
            <article
              v-for="item in environmentItems"
              :key="item.key"
              class="rounded-xl border px-4 py-3"
              :class="statusCardClass(item.status)"
            >
              <div class="flex items-center justify-between gap-3">
                <div class="flex items-center gap-2">
                  <component :is="statusIcon(item.status)" class="size-4 shrink-0" />
                  <h3 class="font-heading text-sm tracking-[0.18em]">{{ item.label }}</h3>
                </div>
                <span class="text-xs uppercase tracking-[0.22em]">{{ statusLabel(item.status) }}</span>
              </div>
              <p class="mt-2 text-sm leading-6 text-dungeon-paper/90">{{ item.detail }}</p>
              <p v-if="item.status !== 'ok'" class="mt-2 text-xs leading-5 text-dungeon-paper/65">
                {{ item.hint }}
              </p>
            </article>
          </div>
        </section>
      </Transition>
    </div>
  </div>
</template>

<script setup lang="ts">
import { AlertTriangle, LoaderCircle, Maximize, Play, ShieldCheck, Star, X } from 'lucide-vue-next';
import type { EnvironmentCheckReport, EnvironmentDependencyStatus } from '../environmentCheck';

const props = defineProps<{
  environmentReport: EnvironmentCheckReport | null;
  environmentChecking: boolean;
}>();

const emit = defineEmits<{
  start: [];
  checkEnvironment: [];
  toggleFullscreen: [];
  openCollection: [];
  backgroundChange: [url: string];
}>();

const isVisible = ref(false);
const IMAGE_CDN_ROOT = 'https://img.vinsimage.org';
const SPLASH_BACKGROUND_COUNT = 14;
const splashBackgrounds: string[] = Array.from(
  { length: SPLASH_BACKGROUND_COUNT },
  (_, i) => `${IMAGE_CDN_ROOT}/%E5%9C%B0%E7%89%A2/%E4%B8%BB%E9%A1%B5%E8%83%8C%E6%99%AF/%E8%83%8C%E6%99%AF${i + 1}.png`,
);
const currentBackgroundUrl = ref<string>(splashBackgrounds[0]);
const incomingBackgroundUrl = ref<string | null>(null);
const outgoingBackgroundUrl = ref<string | null>(null);
const isIncomingVisible = ref(false);
const isOutgoingVisible = ref(true);
const isBackgroundTransitioning = ref(false);
const BACKGROUND_FADE_MS = 700;
let backgroundFadeTimer: ReturnType<typeof setTimeout> | null = null;
let backgroundTransitionToken = 0;
const isPanelDismissed = ref(false);

const shouldShowPanel = computed(() => props.environmentChecking || (!!props.environmentReport && !isPanelDismissed.value));
const environmentItems = computed(() => props.environmentReport?.items ?? []);
const environmentSummary = computed(() => props.environmentReport?.summary ?? '点击按钮后会显示检测结果。');
const lastCheckedLabel = computed(() => {
  if (!props.environmentReport?.checkedAt) return '';
  return `上次检测 ${new Date(props.environmentReport.checkedAt).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })}`;
});

const statusLabelMap: Record<EnvironmentDependencyStatus, string> = {
  ok: '正常',
  missing: '缺失',
  disabled: '未启用',
  not_ready: '未就绪',
  error: '异常',
};

function statusLabel(status: EnvironmentDependencyStatus) {
  return statusLabelMap[status];
}

function statusCardClass(status: EnvironmentDependencyStatus) {
  switch (status) {
    case 'ok':
      return 'border-emerald-500/35 bg-emerald-900/20 text-emerald-100';
    case 'missing':
      return 'border-rose-500/35 bg-rose-950/25 text-rose-100';
    case 'disabled':
      return 'border-amber-500/35 bg-amber-950/20 text-amber-100';
    case 'not_ready':
      return 'border-sky-500/35 bg-sky-950/20 text-sky-100';
    case 'error':
      return 'border-fuchsia-500/35 bg-fuchsia-950/20 text-fuchsia-100';
  }
}

function statusIcon(status: EnvironmentDependencyStatus) {
  return status === 'ok' ? ShieldCheck : AlertTriangle;
}

function dismissPanel() {
  if (props.environmentChecking) return;
  isPanelDismissed.value = true;
}

const pickRandomBackground = (exclude?: string) => {
  const candidates = exclude ? splashBackgrounds.filter(url => url !== exclude) : splashBackgrounds;
  return candidates[Math.floor(Math.random() * candidates.length)] ?? splashBackgrounds[0];
};

const preloadImage = (url: string) =>
  new Promise<void>(resolve => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      resolve();
    };
    const img = new Image();
    img.onload = finish;
    img.onerror = finish;
    img.src = url;
    setTimeout(finish, 1200);
  });

const switchBackground = async () => {
  if (isBackgroundTransitioning.value) return;
  const nextUrl = pickRandomBackground(currentBackgroundUrl.value);
  if (nextUrl === currentBackgroundUrl.value) return;
  const token = ++backgroundTransitionToken;

  if (backgroundFadeTimer) {
    clearTimeout(backgroundFadeTimer);
    backgroundFadeTimer = null;
  }

  await preloadImage(nextUrl);
  if (token !== backgroundTransitionToken) return;

  isBackgroundTransitioning.value = true;
  outgoingBackgroundUrl.value = currentBackgroundUrl.value;
  incomingBackgroundUrl.value = nextUrl;
  isOutgoingVisible.value = true;
  isIncomingVisible.value = false;
  await nextTick();
  await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  if (token !== backgroundTransitionToken) return;
  isIncomingVisible.value = true;
  isOutgoingVisible.value = false;

  backgroundFadeTimer = setTimeout(() => {
    if (token !== backgroundTransitionToken) return;
    currentBackgroundUrl.value = nextUrl;
    emit('backgroundChange', nextUrl);
    incomingBackgroundUrl.value = null;
    outgoingBackgroundUrl.value = null;
    isBackgroundTransitioning.value = false;
    backgroundFadeTimer = null;
  }, BACKGROUND_FADE_MS);
};

onMounted(() => {
  currentBackgroundUrl.value = pickRandomBackground();
  emit('backgroundChange', currentBackgroundUrl.value);
  isVisible.value = true;
});

watch(
  () => props.environmentChecking,
  checking => {
    if (checking) {
      isPanelDismissed.value = false;
    }
  },
);

watch(
  () => props.environmentReport?.checkedAt,
  checkedAt => {
    if (checkedAt) {
      isPanelDismissed.value = false;
    }
  },
);

onBeforeUnmount(() => {
  backgroundTransitionToken += 1;
  if (backgroundFadeTimer) {
    clearTimeout(backgroundFadeTimer);
    backgroundFadeTimer = null;
  }
});
</script>

<style scoped>
.splash-screen {
  height: 100dvh;
  min-height: max(100dvh, 56.25vw);
  padding-top: max(1rem, env(safe-area-inset-top));
  padding-right: max(1rem, env(safe-area-inset-right));
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
  padding-left: max(1rem, env(safe-area-inset-left));
}

.panel-fade-enter-active,
.panel-fade-leave-active {
  transition:
    opacity 0.28s ease,
    transform 0.28s ease;
}

.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
