<!-- eslint-disable better-tailwindcss/no-unknown-classes -->
<template>
  <div
    class="splash-screen relative w-full overflow-y-auto overflow-x-hidden bg-[#050505] text-dungeon-paper transition-opacity duration-1000"
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

    <div class="splash-vignette absolute inset-0 z-0"></div>

    <button
      type="button"
      class="splash-fullscreen-button absolute z-50 flex items-center justify-center rounded-sm border border-dungeon-brown/50 bg-dungeon-dark/60 text-dungeon-gold-dim transition-all duration-300 hover:border-dungeon-gold/50 hover:bg-dungeon-brown hover:text-dungeon-gold"
      aria-label="切换全屏"
      @click="$emit('toggleFullscreen')"
    >
      <Maximize class="size-4" />
    </button>

    <main class="splash-layout relative z-10" aria-label="欲望地牢主菜单">
      <h1 class="splash-title">
        <img :src="titleSkin" alt="欲望地牢" width="1983" height="793" />
      </h1>

      <div class="splash-menu" aria-label="主菜单">
        <button
          type="button"
          class="splash-menu-button splash-menu-button--start"
          :style="{ backgroundImage: `url('${menuSkin}')` }"
          :disabled="environmentChecking"
          aria-label="开始冒险"
          @click="$emit('start')"
        ></button>
        <button
          type="button"
          class="splash-menu-button splash-menu-button--monitor"
          :style="{ backgroundImage: `url('${menuSkin}')` }"
          :disabled="environmentChecking"
          aria-label="环境监测"
          @click="$emit('checkEnvironment')"
        ></button>
        <button
          type="button"
          class="splash-menu-button splash-menu-button--collection"
          :style="{ backgroundImage: `url('${menuSkin}')` }"
          aria-label="图鉴"
          @click="$emit('openCollection')"
        ></button>
        <button
          type="button"
          class="splash-menu-button splash-menu-button--tutorial"
          :style="{ backgroundImage: `url('${menuSkin}')` }"
          aria-label="教程"
          title="教程"
          @click="$emit('openTutorial')"
        ></button>
      </div>

      <button
        ref="updateCardButton"
        type="button"
        class="splash-update-card"
        aria-label="查看完整更新日志"
        @click="updateModalOpen = true"
      >
        <img
          class="splash-update-card__skin"
          :src="updateCardSkin"
          alt=""
          aria-hidden="true"
          width="2148"
          height="732"
        />
        <span class="splash-update-card__copy">
          <span>新的区域已解锁</span>
          <strong>苦修之路·「佩恩」</strong>
        </span>
        <span class="splash-update-card__arrow" aria-hidden="true">›</span>
      </button>
    </main>

    <Transition name="panel-fade">
      <section
        v-if="shouldShowPanel"
        class="splash-environment-panel"
        role="dialog"
        aria-modal="true"
        aria-label="环境监测"
      >
        <div class="splash-environment-panel__header">
          <div class="splash-environment-panel__heading">
            <div class="splash-environment-panel__title">
              <ShieldCheck class="size-4" />
              <span>环境监测</span>
            </div>
            <p>{{ environmentChecking ? '正在检查酒馆助手、提示词模板与 MVU 脚本...' : environmentSummary }}</p>
          </div>
          <div class="splash-environment-panel__actions">
            <span v-if="lastCheckedLabel">{{ lastCheckedLabel }}</span>
            <button
              v-if="canForceStart"
              type="button"
              class="splash-environment-panel__force"
              :disabled="environmentChecking"
              aria-label="无视风险直接开始游戏"
              @click="$emit('forceStart')"
            >
              <AlertTriangle class="size-3.5" />
              <span>无视风险直接开始游戏</span>
            </button>
            <button
              type="button"
              class="splash-environment-panel__close"
              :disabled="environmentChecking"
              aria-label="关闭环境监测弹窗"
              @click="dismissPanel"
            >
              <X class="size-4" />
            </button>
          </div>
        </div>
        <div class="splash-environment-panel__items">
          <article
            v-for="item in environmentItems"
            :key="item.key"
            class="splash-environment-item"
            :class="statusCardClass(item.status)"
          >
            <div class="splash-environment-item__heading">
              <div>
                <component :is="statusIcon(item.status)" class="size-4 shrink-0" />
                <h3>{{ item.label }}</h3>
              </div>
              <span>{{ statusLabel(item.status) }}</span>
            </div>
            <p>{{ item.detail }}</p>
            <p v-if="item.status !== 'ok'">{{ item.hint }}</p>
          </article>
        </div>
      </section>
    </Transition>

    <Transition name="update-fade">
      <div
        v-if="updateModalOpen"
        class="splash-update-overlay"
        role="presentation"
        @click.self="updateModalOpen = false"
        @keydown.esc.stop.prevent="updateModalOpen = false"
        @keydown.tab.stop.prevent="updateCloseButton?.focus()"
      >
        <section class="splash-update-dialog" role="dialog" aria-modal="true" aria-labelledby="splash-update-title">
          <div class="splash-update-dialog__header">
            <div>
              <span class="splash-update-dialog__eyebrow">DUNGEON OF DESIRE</span>
              <h2 id="splash-update-title">更新日志</h2>
            </div>
            <button
              ref="updateCloseButton"
              type="button"
              class="splash-update-dialog__close"
              aria-label="关闭更新日志"
              @click="updateModalOpen = false"
            >
              <X class="size-5" />
            </button>
          </div>
          <ol class="splash-update-dialog__body" aria-label="更新记录">
            <template v-for="(entry, index) in updateEntries" :key="entry.date">
              <li v-if="entry.milestone" class="splash-update-dialog__milestone">
                <span>{{ entry.milestone }}</span>
              </li>
              <li class="splash-update-dialog__entry" :class="{ 'splash-update-dialog__entry--latest': index === 0 }">
                <span class="splash-update-dialog__date">{{ entry.date }}</span>
                <div class="splash-update-dialog__content">
                  <span>{{ entry.content }}</span>
                  <span v-if="index === 0" class="splash-update-dialog__latest">最新</span>
                </div>
              </li>
            </template>
          </ol>
        </section>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { AlertTriangle, Maximize, ShieldCheck, X } from 'lucide-vue-next';
import type { EnvironmentCheckReport, EnvironmentDependencyStatus } from '../environmentCheck';

const props = defineProps<{
  environmentReport: EnvironmentCheckReport | null;
  environmentChecking: boolean;
  suppressEnvironmentPanel?: boolean;
}>();

const emit = defineEmits<{
  start: [];
  forceStart: [];
  checkEnvironment: [];
  toggleFullscreen: [];
  openCollection: [];
  openTutorial: [];
  backgroundChange: [url: string];
}>();

const isVisible = ref(false);
const IMAGE_CDN_ROOT = 'https://img.vinsimage.org';
const TITLE_SCREEN_ASSET_ROOT = `${IMAGE_CDN_ROOT}/%E5%9C%B0%E7%89%A2/%E7%B4%A0%E6%9D%90%E5%BA%93/%E6%A0%87%E9%A2%98%E7%95%8C%E9%9D%A2`;
const titleSkin = `${TITLE_SCREEN_ASSET_ROOT}/%E6%AC%B2%E6%9C%9B%E5%9C%B0%E7%89%A2.png`;
const menuSkin = `${TITLE_SCREEN_ASSET_ROOT}/%E8%8F%9C%E5%8D%95%E6%8C%89%E9%92%AE.png`;
const updateCardSkin = `${TITLE_SCREEN_ASSET_ROOT}/%E6%9B%B4%E6%96%B0%E6%97%A5%E5%BF%97%E5%AE%B9%E5%99%A8.png`;
const mainBackgroundUrl = `${TITLE_SCREEN_ASSET_ROOT}/%E4%B8%BB%E9%A1%B5%E8%83%8C%E6%99%AF.png`;
const splashBackgrounds: string[] = [mainBackgroundUrl];
const updateModalOpen = ref(false);
const updateCardButton = ref<HTMLButtonElement | null>(null);
const updateCloseButton = ref<HTMLButtonElement | null>(null);
const updateEntries: { date: string; content: string; milestone?: string }[] = [
  { date: '10.10', content: '标题界面UI重做，教程功能更新' },
  { date: '10.07', content: '更新苦修之路' },
  { date: '10.05', content: '地图系统重做' },
  { date: '10.03', content: '更新卡牌、按钮美化' },
  { date: '7.07', content: '更新圣水之海' },
  { date: '6.21', content: '更新终极区域' },
  { date: '6.18', content: '更新交媾祭坛' },
  { date: '5.31', content: '更新极乐宴会厅', milestone: '第四层更新完毕' },
  { date: '5.21', content: '更新春梦回廊' },
  { date: '5.18', content: '更新自定义难度' },
];
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
  () =>
    !props.suppressEnvironmentPanel &&
    (props.environmentChecking || (!!props.environmentReport && !isPanelDismissed.value)),
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

watch(updateModalOpen, async open => {
  await nextTick();
  (open ? updateCloseButton.value : updateCardButton.value)?.focus();
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
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  min-height: 0;
  overflow: hidden;
  container-type: inline-size;
  isolation: isolate;
}

.splash-vignette {
  background: radial-gradient(circle at 54% 42%, rgba(7, 4, 10, 0.04), rgba(0, 0, 0, 0.42) 100%);
  pointer-events: none;
}

.splash-fullscreen-button {
  top: 2%;
  right: 2%;
  width: 2.5%;
  aspect-ratio: 1;
}

.splash-fullscreen-button :deep(svg) {
  width: 52%;
  height: 52%;
}

.splash-layout {
  height: 100%;
  min-height: 0;
}

.splash-title {
  position: absolute;
  top: 11%;
  left: 1.5%;
  width: 46.8%;
  margin: 0;
  filter: drop-shadow(0 12px 20px rgba(0, 0, 0, 0.72));
}

.splash-title img {
  display: block;
  width: 100%;
  height: auto;
}

.splash-menu {
  position: absolute;
  top: 12%;
  right: 3.5%;
  display: grid;
  width: 23%;
  gap: 0.35cqw;
}

.splash-menu-button {
  display: block;
  width: 100%;
  aspect-ratio: 2.25;
  padding: 0;
  border: 0;
  background-repeat: no-repeat;
  background-size: 200% auto;
  cursor: pointer;
  transition:
    transform 180ms ease,
    filter 180ms ease;
}

.splash-menu-button--start {
  background-position: 0 25%;
}

.splash-menu-button--monitor {
  background-position: 100% 25%;
}

.splash-menu-button--collection {
  background-position: 0 75%;
}

.splash-menu-button--tutorial {
  background-position: 100% 75%;
}

.splash-menu-button:hover:not(:disabled) {
  transform: translateX(-0.35rem) scale(1.025);
  filter: brightness(1.18) drop-shadow(0 0 1rem rgba(255, 90, 24, 0.4));
}

.splash-menu-button:active:not(:disabled) {
  transform: translateX(-0.1rem) scale(0.985);
  filter: brightness(1.32);
}

.splash-menu-button:focus-visible {
  outline: 2px solid #ffc47e;
  outline-offset: -0.3rem;
  filter: brightness(1.18) drop-shadow(0 0 0.8rem rgba(255, 90, 24, 0.46));
}

.splash-menu-button:disabled {
  cursor: wait;
  filter: grayscale(0.45) brightness(0.72);
}

.splash-update-card {
  position: absolute;
  bottom: 4%;
  left: 2%;
  width: 32%;
  aspect-ratio: 2.934;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  filter: drop-shadow(0 0.6rem 1rem rgba(0, 0, 0, 0.52));
  transition:
    transform 180ms ease,
    filter 180ms ease;
}

.splash-update-card:hover {
  transform: translateY(-0.2rem) scale(1.02);
  filter: brightness(1.12) drop-shadow(0 0.8rem 1.2rem rgba(0, 0, 0, 0.62));
}

.splash-update-card:focus-visible {
  outline: 2px solid #ffc47e;
  outline-offset: 0.25rem;
}

.splash-update-card__skin {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
}

.splash-update-card__copy {
  position: absolute;
  top: 42%;
  left: 32%;
  right: 6%;
  z-index: 2;
  display: grid;
  width: auto;
  overflow: hidden;
  justify-items: start;
  color: #f9e5cc;
  font-family: 'MaShanZheng', 'Microsoft YaHei', sans-serif;
  line-height: 1.15;
  text-align: left;
  text-shadow: 0 0.18cqw 0.36cqw #050303;
  white-space: nowrap;
}

.splash-update-card__copy span {
  font-size: 1.18cqw;
}

.splash-update-card__copy strong {
  margin-top: 0.32cqw;
  margin-left: 0.8cqw;
  font-size: 1.58cqw;
  font-weight: 700;
}

.splash-update-card__arrow {
  position: absolute;
  top: 40%;
  right: 6%;
  z-index: 2;
  color: #f9e5cc;
  font-family: Georgia, serif;
  font-size: 2.7cqw;
  line-height: 1;
  text-shadow: 0 0.18cqw 0.36cqw #050303;
}

.tutorial-notice {
  position: absolute;
  top: 76%;
  left: 50%;
  z-index: 30;
  display: flex;
  align-items: center;
  gap: 0.7cqw;
  padding: 0.75cqw 1.4cqw;
  border: 1px solid rgba(242, 184, 86, 0.58);
  border-radius: 0.45cqw;
  color: #ffe9c7;
  background: rgba(24, 12, 12, 0.9);
  box-shadow:
    0 0.6cqw 1.8cqw rgba(0, 0, 0, 0.42),
    inset 0 0 1.2cqw rgba(219, 91, 40, 0.14);
  font-family: 'MaShanZheng', 'Microsoft YaHei', sans-serif;
  font-size: 1.15cqw;
  letter-spacing: 0.1cqw;
  white-space: nowrap;
  transform: translateX(-50%);
}

.tutorial-notice__mark {
  display: inline-grid;
  width: 1.5cqw;
  aspect-ratio: 1;
  place-items: center;
  border: 1px solid rgba(242, 184, 86, 0.68);
  border-radius: 50%;
  color: #f4c86b;
  font-family: Georgia, serif;
  font-size: 1.05cqw;
  line-height: 1;
}

.tutorial-notice-fade-enter-active,
.tutorial-notice-fade-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.tutorial-notice-fade-enter-from,
.tutorial-notice-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 0.5cqw);
}

.splash-environment-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 40;
  width: min(42rem, calc(100vw - 2rem));
  max-height: min(86vh, 48rem);
  overflow: auto;
  border: 1px solid rgba(242, 184, 86, 0.36);
  border-radius: 1rem;
  background: rgba(18, 11, 8, 0.94);
  box-shadow: 0 1.2rem 3rem rgba(0, 0, 0, 0.58);
  backdrop-filter: blur(0.8rem);
  transform: translate(-50%, -50%);
}

.splash-environment-panel__header,
.splash-environment-panel__actions,
.splash-environment-panel__title,
.splash-environment-item__heading,
.splash-environment-item__heading > div {
  display: flex;
  align-items: center;
}

.splash-environment-panel__header {
  justify-content: space-between;
  gap: 1rem;
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid rgba(242, 184, 86, 0.16);
}

.splash-environment-panel__heading {
  min-width: 0;
}

.splash-environment-panel__title {
  gap: 0.5rem;
  color: #f4c86b;
  font-family: 'MaShanZheng', 'Microsoft YaHei', sans-serif;
  font-size: 0.95rem;
  letter-spacing: 0.28em;
}

.splash-environment-panel__heading p {
  margin: 0.5rem 0 0;
  color: rgba(255, 244, 225, 0.88);
  font-size: 0.875rem;
}

.splash-environment-panel__actions {
  align-items: flex-start;
  gap: 0.5rem;
  color: rgba(255, 244, 225, 0.48);
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

.splash-environment-panel__force,
.splash-environment-panel__close,
.splash-update-dialog__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(242, 184, 86, 0.2);
  color: rgba(255, 244, 225, 0.78);
  background: rgba(65, 29, 15, 0.5);
  cursor: pointer;
  transition:
    background 160ms ease,
    color 160ms ease,
    border-color 160ms ease;
}

.splash-environment-panel__force {
  gap: 0.25rem;
  padding: 0.35rem 0.5rem;
  border-color: rgba(248, 113, 113, 0.35);
  color: #ffe4e4;
  font-size: 0.6875rem;
}

.splash-environment-panel__close {
  width: 1.8rem;
  height: 1.8rem;
  border-radius: 999px;
}

.splash-environment-panel__force:hover,
.splash-environment-panel__close:hover,
.splash-update-dialog__close:hover {
  border-color: rgba(242, 184, 86, 0.6);
  color: #fff4df;
  background: rgba(113, 49, 20, 0.72);
}

.splash-environment-panel__items {
  display: grid;
  gap: 0.75rem;
  padding: 1rem 1.25rem 1.25rem;
}

.splash-environment-item {
  padding: 0.8rem 1rem;
  border: 1px solid;
  border-radius: 0.75rem;
}

.splash-environment-item__heading {
  justify-content: space-between;
  gap: 0.75rem;
}

.splash-environment-item__heading > div {
  gap: 0.5rem;
}

.splash-environment-item h3 {
  margin: 0;
  font-family: 'MaShanZheng', 'Microsoft YaHei', sans-serif;
  font-size: 0.875rem;
  letter-spacing: 0.14em;
}

.splash-environment-item__heading > span {
  font-size: 0.6875rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.splash-environment-item p {
  margin: 0.5rem 0 0;
  color: rgba(255, 244, 225, 0.88);
  font-size: 0.875rem;
  line-height: 1.5;
}

.splash-environment-item p + p {
  color: rgba(255, 244, 225, 0.62);
  font-size: 0.75rem;
}

.splash-update-overlay {
  position: absolute;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 3cqw;
  background: rgba(3, 2, 4, 0.74);
  backdrop-filter: blur(0.4cqw);
}

.splash-update-dialog {
  display: flex;
  flex-direction: column;
  width: min(56cqw, 100%);
  max-height: 100%;
  overflow: hidden;
  border: 1px solid rgba(224, 190, 131, 0.45);
  border-radius: min(8px, 0.5cqw);
  background: #171419;
  box-shadow:
    0 1.4cqw 4cqw rgba(0, 0, 0, 0.72),
    inset 0 0 0 0.25cqw rgba(224, 190, 131, 0.05);
}

.splash-update-dialog__header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 1cqw;
  padding: 1.7cqw 2.3cqw;
  border-bottom: 1px solid rgba(224, 190, 131, 0.24);
  background: #211a20;
}

.splash-update-dialog__eyebrow {
  color: #b9a184;
  font-size: 0.7cqw;
  letter-spacing: 0;
}

.splash-update-dialog h2 {
  margin: 0.4cqw 0 0;
  color: #ffe9c7;
  font-family: 'MaShanZheng', 'Microsoft YaHei', sans-serif;
  font-size: 2cqw;
  line-height: 1.2;
  letter-spacing: 0;
}

.splash-update-dialog__close {
  flex-shrink: 0;
  width: 2.8cqw;
  height: 2.8cqw;
  border-radius: min(6px, 0.4cqw);
  background: transparent;
}

.splash-update-dialog__close :deep(svg) {
  width: 1.4cqw;
  height: 1.4cqw;
}

.splash-update-dialog__close:focus-visible {
  outline: 2px solid #ffc47e;
  outline-offset: 2px;
}

.splash-update-dialog__body {
  min-height: 0;
  margin: 0;
  padding: 0.6cqw 2.3cqw 1.2cqw;
  overflow-y: auto;
  color: #e5dee2;
  font-size: 1.15cqw;
  line-height: 1.5;
  list-style: none;
  scrollbar-width: thin;
  scrollbar-color: #64505b #171419;
}

.splash-update-dialog__entry {
  display: grid;
  grid-template-columns: 5.3cqw minmax(0, 1fr);
  align-items: center;
  gap: 1.6cqw;
  padding: 1.05cqw 1.1cqw;
  border-bottom: 1px solid rgba(213, 202, 217, 0.12);
}

.splash-update-dialog__entry:last-child {
  border-bottom: 0;
}

.splash-update-dialog__entry--latest {
  color: #fff0d8;
  background: rgba(224, 190, 131, 0.07);
  box-shadow: inset 0.2cqw 0 #d9ad6c;
}

.splash-update-dialog__date {
  color: #a99eaa;
  font-family: 'Consolas', monospace;
  font-size: 1.05cqw;
  font-variant-numeric: tabular-nums;
}

.splash-update-dialog__entry--latest .splash-update-dialog__date {
  color: #e7bc7a;
}

.splash-update-dialog__content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1cqw;
  min-width: 0;
  overflow-wrap: anywhere;
}

.splash-update-dialog__latest {
  flex-shrink: 0;
  color: #e7bc7a;
  font-size: 0.8cqw;
}

.splash-update-dialog__milestone {
  display: flex;
  align-items: center;
  gap: 1.2cqw;
  padding: 1.25cqw 1.1cqw;
  color: #bea384;
  font-size: 0.9cqw;
}

.splash-update-dialog__milestone::before,
.splash-update-dialog__milestone::after {
  content: '';
  flex: 1;
  height: 1px;
  background: rgba(224, 190, 131, 0.24);
}

.update-fade-enter-active,
.update-fade-leave-active,
.panel-fade-enter-active,
.panel-fade-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.update-fade-enter-from,
.update-fade-leave-to,
.panel-fade-enter-from,
.panel-fade-leave-to {
  opacity: 0;
}

.update-fade-enter-from .splash-update-dialog,
.update-fade-leave-to .splash-update-dialog {
  transform: translateY(0.75rem) scale(0.98);
}

.panel-fade-enter-from .splash-environment-panel,
.panel-fade-leave-to .splash-environment-panel {
  transform: translate(-50%, calc(-50% + 0.75rem));
}

@media (max-width: 639px) {
  .splash-screen {
    overflow: hidden;
  }

  .splash-title {
    top: 8%;
    left: 3.5%;
    width: 52%;
  }

  .splash-menu {
    top: 18%;
    right: 2%;
    width: 25%;
    gap: 0.2cqw;
  }

  .splash-update-card {
    bottom: 3%;
    left: 1%;
    width: 44%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .splash-menu-button,
  .splash-update-card {
    transition: none;
  }
}
</style>
