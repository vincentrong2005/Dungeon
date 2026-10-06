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

    <div
      class="absolute left-4 top-4 h-40 w-24 border-l-2 border-t-2 border-dungeon-brown opacity-50 sm:left-8 sm:top-8 sm:h-64 sm:w-64"
    ></div>
    <div
      class="absolute bottom-4 right-4 h-40 w-24 border-b-2 border-r-2 border-dungeon-brown opacity-50 sm:bottom-8 sm:right-8 sm:h-64 sm:w-64"
    ></div>

    <button
      type="button"
      class="absolute right-4 top-4 z-50 flex h-8 w-8 items-center justify-center rounded border border-dungeon-brown/50 bg-dungeon-dark/60 text-dungeon-gold-dim transition-all duration-300 hover:border-dungeon-gold/50 hover:bg-dungeon-brown hover:text-dungeon-gold"
      aria-label="切换全屏"
      @click="$emit('toggleFullscreen')"
    >
      <Maximize class="size-4" />
    </button>

    <div class="splash-content z-10 flex w-full max-w-5xl flex-col items-center px-4 py-6 sm:px-6">
      <h1 class="splash-title">
        <img :src="titleSkin" alt="欲望地牢" width="2017" height="780" />
      </h1>

      <div class="splash-menu" aria-label="主菜单">
        <button type="button" class="splash-menu-button" :disabled="environmentChecking" @click="$emit('start')">
          <img class="splash-menu-button__skin" :src="buttonSkin" alt="" aria-hidden="true" width="2172" height="724" />
          <span class="splash-menu-button__content">
            {{ environmentChecking ? '检测环境中' : '进入地牢' }}
          </span>
        </button>

        <button
          type="button"
          class="splash-menu-button"
          :disabled="environmentChecking"
          @click="$emit('checkEnvironment')"
        >
          <img class="splash-menu-button__skin" :src="buttonSkin" alt="" aria-hidden="true" width="2172" height="724" />
          <span class="splash-menu-button__content">
            {{ environmentChecking ? '检测中' : '环境检测' }}
          </span>
        </button>

        <button type="button" class="splash-menu-button" @click="$emit('openCollection')">
          <img class="splash-menu-button__skin" :src="buttonSkin" alt="" aria-hidden="true" width="2172" height="724" />
          <span class="splash-menu-button__content"> 魔女的收藏 </span>
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
                v-if="canForceStart"
                type="button"
                class="flex items-center gap-1 rounded border border-rose-400/30 bg-rose-950/35 px-2 py-1 text-[11px] tracking-[0.12em] text-rose-100 transition hover:border-rose-300/60 hover:bg-rose-900/55 disabled:cursor-not-allowed disabled:opacity-40"
                :disabled="environmentChecking"
                aria-label="无视风险直接开始游戏"
                @click="$emit('forceStart')"
              >
                <AlertTriangle class="size-3.5" />
                <span>无视风险直接开始游戏</span>
              </button>
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
import { AlertTriangle, Maximize, ShieldCheck, X } from 'lucide-vue-next';
import type { EnvironmentCheckReport, EnvironmentDependencyStatus } from '../environmentCheck';

const props = defineProps<{
  environmentReport: EnvironmentCheckReport | null;
  environmentChecking: boolean;
}>();

const emit = defineEmits<{
  start: [];
  forceStart: [];
  checkEnvironment: [];
  toggleFullscreen: [];
  openCollection: [];
  backgroundChange: [url: string];
}>();

const isVisible = ref(false);
const IMAGE_CDN_ROOT = 'https://img.vinsimage.org';
const TITLE_SCREEN_ASSET_ROOT = `${IMAGE_CDN_ROOT}/%E5%9C%B0%E7%89%A2/%E7%B4%A0%E6%9D%90%E5%BA%93/%E6%A0%87%E9%A2%98%E7%95%8C%E9%9D%A2`;
const titleSkin = `${TITLE_SCREEN_ASSET_ROOT}/%E6%A0%87%E9%A2%98.png`;
const buttonSkin = `${TITLE_SCREEN_ASSET_ROOT}/%E6%A0%87%E9%A2%98%E6%8C%89%E9%92%AE.png`;
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

const shouldShowPanel = computed(
  () => props.environmentChecking || (!!props.environmentReport && !isPanelDismissed.value),
);
const environmentItems = computed(() => props.environmentReport?.items ?? []);
const environmentSummary = computed(() => props.environmentReport?.summary ?? '点击按钮后会显示检测结果。');
const canForceStart = computed(() => !!props.environmentReport && !props.environmentReport.ready);
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
.splash-content {
  gap: clamp(0.25rem, 1.3vw, 0.9rem);
}

.splash-title {
  width: min(78vw, 740px);
  margin: 0;
  filter: drop-shadow(0 10px 18px rgba(0, 0, 0, 0.7));
}

.splash-title img {
  display: block;
  width: 100%;
  height: auto;
}

.splash-menu {
  display: grid;
  justify-items: center;
  gap: clamp(0.1rem, 0.35vw, 0.3rem);
  width: 100%;
}

.splash-menu-button {
  position: relative;
  isolation: isolate;
  display: grid;
  place-items: center;
  width: min(80vw, 330px);
  aspect-ratio: 3 / 1;
  padding: 0;
  border: 0;
  color: #ffe5b4;
  background: transparent;
  cursor: pointer;
  transition:
    transform 180ms ease,
    filter 180ms ease;
}

.splash-menu-button__skin {
  position: absolute;
  inset: 0;
  z-index: -1;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
}

.splash-menu-button__content {
  display: block;
  max-width: 100%;
  font-family: 'MaShanZheng', 'Microsoft YaHei', sans-serif;
  font-size: clamp(1.1rem, 2vw, 1.5rem);
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
  text-align: center;
  text-shadow:
    0 2px 3px #090402,
    0 0 12px rgba(246, 85, 22, 0.68);
}

.splash-menu-button:hover:not(:disabled) {
  transform: translateY(-2px) scale(1.025);
  filter: brightness(1.18) drop-shadow(0 0 12px rgba(255, 80, 20, 0.45));
}

.splash-menu-button:active:not(:disabled) {
  transform: translateY(1px) scale(0.985);
  filter: brightness(1.35);
}

.splash-menu-button:focus-visible {
  outline: 2px solid #ffbf75;
  outline-offset: -8px;
  filter: brightness(1.18) drop-shadow(0 0 12px rgba(255, 80, 20, 0.45));
}

.splash-menu-button:disabled {
  cursor: wait;
  filter: grayscale(0.45) brightness(0.72);
}

.splash-screen {
  height: auto;
  min-height: 100vh;
  min-height: 100dvh;
  padding-top: max(1rem, env(safe-area-inset-top));
  padding-right: max(1rem, env(safe-area-inset-right));
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
  padding-left: max(1rem, env(safe-area-inset-left));
}

@media (max-width: 639px) {
  .splash-screen {
    justify-content: flex-start;
  }

  .splash-content {
    padding-top: clamp(4.5rem, 12vh, 7rem);
    padding-bottom: 2rem;
  }
}

@media (max-height: 720px) and (min-width: 600px) {
  .splash-title {
    width: min(65vw, 580px);
  }

  .splash-menu-button {
    width: min(70vw, 280px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .splash-menu-button {
    transition: none;
  }
}

@media (hover: hover) and (pointer: fine) {
  .splash-screen {
    min-height: max(100vh, 56.25vw);
    min-height: max(100dvh, 56.25vw);
  }
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
