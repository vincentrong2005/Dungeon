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
    <video
      ref="backgroundVideo"
      class="absolute inset-0 z-0 size-full object-cover transition-opacity duration-700 ease-in-out"
      :class="isVideoReady ? 'opacity-100' : 'opacity-0'"
      :src="mainBackgroundVideoUrl"
      :poster="mainBackgroundUrl"
      autoplay
      loop
      muted
      playsinline
      preload="auto"
      aria-hidden="true"
      @canplay="handleVideoCanPlay"
      @error="handleVideoError"
    ></video>
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
        <img :src="titleSkin" alt="欲望地牢" width="1350" height="526" />
      </h1>

      <!-- 右侧：自右缘压下的暗影 + 刻字式菜单 -->
      <div class="splash-menu-shade" aria-hidden="true"></div>
      <nav class="splash-menu" aria-label="主菜单">
        <span class="splash-menu__ornament" aria-hidden="true"></span>
        <button
          type="button"
          class="splash-menu-button splash-menu-button--start"
          :disabled="environmentChecking"
          aria-label="开始冒险"
          style="--i: 0"
          @click="$emit('start')"
          data-ui-sound="confirm"
        >
          <span class="splash-menu-button__sigil" aria-hidden="true"></span>
          <span class="splash-menu-button__text">
            <span class="splash-menu-button__label">开始冒险</span>
            <span class="splash-menu-button__sub">{{ environmentChecking ? 'CHECKING' : 'BEGIN THE DESCENT' }}</span>
          </span>
        </button>
        <button
          type="button"
          class="splash-menu-button splash-menu-button--monitor"
          :disabled="environmentChecking"
          aria-label="环境监测"
          style="--i: 1"
          @click="$emit('checkEnvironment')"
        >
          <span class="splash-menu-button__sigil" aria-hidden="true"></span>
          <span class="splash-menu-button__text">
            <span class="splash-menu-button__label">环境监测</span>
            <span class="splash-menu-button__sub">MONITOR</span>
          </span>
        </button>
        <button
          type="button"
          class="splash-menu-button splash-menu-button--collection"
          aria-label="图鉴"
          style="--i: 2"
          @click="$emit('openCollection')"
        >
          <span class="splash-menu-button__sigil" aria-hidden="true"></span>
          <span class="splash-menu-button__text">
            <span class="splash-menu-button__label">图鉴</span>
            <span class="splash-menu-button__sub">GRIMOIRE</span>
          </span>
        </button>
        <button
          type="button"
          class="splash-menu-button splash-menu-button--tutorial"
          aria-label="教程"
          style="--i: 3"
          @click="$emit('openTutorial')"
          data-ui-sound="confirm"
        >
          <span class="splash-menu-button__sigil" aria-hidden="true"></span>
          <span class="splash-menu-button__text">
            <span class="splash-menu-button__label">教程</span>
            <span class="splash-menu-button__sub">TUTORIAL</span>
          </span>
        </button>
        <span class="splash-menu__ornament is-bottom" aria-hidden="true"></span>
      </nav>

      <button
        ref="updateCardButton"
        type="button"
        class="splash-update-card"
        aria-label="查看完整更新日志"
        @click="updateModalOpen = true"
      >
        <span class="splash-update-card__sigil" aria-hidden="true"></span>
        <span class="splash-update-card__copy">
          <span>新的区域已解锁 · NEW REGION</span>
          <strong>女神的产房·「盖亚」</strong>
        </span>
        <span class="splash-update-card__more" aria-hidden="true">更新日志</span>
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
// 简约版标题：书法字形 + 淡金配色（原版 欲望地牢.png 保留在素材库）
const titleSkin = `${TITLE_SCREEN_ASSET_ROOT}/${encodeURIComponent('欲望地牢-简约-v2.webp')}`;
const mainBackgroundUrl = `${TITLE_SCREEN_ASSET_ROOT}/%E4%B8%BB%E9%A1%B5%E8%83%8C%E6%99%AF.png`;
const mainBackgroundVideoUrl = `${TITLE_SCREEN_ASSET_ROOT}/%E4%B8%BB%E9%A1%B5%E8%83%8C%E6%99%AF.mp4`;
const splashBackgrounds: string[] = [mainBackgroundUrl];
const updateModalOpen = ref(false);
const backgroundVideo = ref<HTMLVideoElement | null>(null);
const isVideoReady = ref(false);
const updateCardButton = ref<HTMLButtonElement | null>(null);
const updateCloseButton = ref<HTMLButtonElement | null>(null);
const updateEntries: { date: string; content: string; milestone?: string }[] = [
  { date: '11.21', content: '全部UI重做；大量新卡组，新卡牌与圣遗物；陷阱移除并改为全新自由探索事件' },
  { date: '11.11', content: '更新女神的产房', milestone: '全角色战斗系统更新完毕' },
  { date: '10.24', content: '优化神像房UI，增加黑神像设定' },
  { date: '10.21', content: '更新神谕淫纹室' },
  { date: '10.20', content: '更新信息录入界面UI，商店UI' },
  { date: '10.17', content: '增加大量音效与特效' },
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

/** 依赖条目的状态色：语义类名，颜色统一在样式中定义 */
function statusCardClass(status: EnvironmentDependencyStatus) {
  return `is-${status}`;
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

function handleVideoCanPlay() {
  const video = backgroundVideo.value;
  if (!video) return;

  isVideoReady.value = false;
  void video
    .play()
    .then(() => {
      isVideoReady.value = true;
    })
    .catch(() => {
      isVideoReady.value = false;
    });
}

function handleVideoError() {
  isVideoReady.value = false;
}

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
  top: 14%;
  left: 4%;
  width: 38%;
  margin: 0;
  filter: drop-shadow(0 0.4cqw 1cqw rgba(0, 0, 0, 0.8));
  animation: splash-menu-in 1s ease 0.1s both;
}

.splash-title img {
  display: block;
  width: 100%;
  height: auto;
}

/* 右缘暗影：压暗彩色绸带，给菜单一块沉静的底 */
.splash-menu-shade {
  position: absolute;
  inset: 0 0 0 auto;
  width: 46%;
  background:
    radial-gradient(ellipse 70% 60% at 100% 62%, rgba(3, 1, 4, 0.78), transparent 72%),
    linear-gradient(270deg, rgba(4, 2, 6, 0.86), rgba(4, 2, 6, 0.55) 42%, transparent);
  pointer-events: none;
}

/* 刻字式菜单：右对齐，自下而上沉在画面右下 */
.splash-menu {
  position: absolute;
  right: 5%;
  bottom: 15%;
  display: flex;
  width: 24%;
  flex-direction: column;
  align-items: flex-end;
  gap: 1.35cqw;
}

.splash-menu__ornament {
  display: block;
  width: 100%;
  height: 1.5cqw;
  margin: 0.2cqw 0;
  background: var(--dg-img-divider) center / contain no-repeat;
  opacity: 0.75;
  animation: splash-menu-in 0.9s ease 0.2s both;
}

.splash-menu__ornament.is-bottom {
  transform: scaleY(-1);
  animation-delay: 0.75s;
}

.splash-menu-button {
  position: relative;
  display: flex;
  align-items: center;
  gap: 1.1cqw;
  padding: 0.35cqw 0 0.35cqw 4.5cqw;
  border: 0;
  background: none;
  color: #e6d6b4;
  text-align: right;
  cursor: pointer;
  transition:
    transform 0.28s ease,
    color 0.28s ease;
  animation: splash-menu-in 0.8s cubic-bezier(0.2, 0.8, 0.3, 1) calc(0.3s + var(--i, 0) * 0.11s) both;
}

/* 自左伸来的细金线，悬停时延长 */
.splash-menu-button::before {
  position: absolute;
  top: 50%;
  right: calc(100% - 4cqw);
  width: 2.6cqw;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(201, 161, 96, 0.7));
  transition:
    width 0.35s ease,
    background 0.35s ease;
  content: '';
}

.splash-menu-button__sigil {
  order: 2;
  flex: none;
  width: 0.75cqw;
  height: 0.75cqw;
  border: 1px solid rgba(201, 161, 96, 0.8);
  background: rgba(10, 6, 8, 0.6);
  transform: rotate(45deg);
  transition:
    background 0.3s ease,
    box-shadow 0.3s ease,
    border-color 0.3s ease;
}

.splash-menu-button__text {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.splash-menu-button__label {
  margin-right: -0.32em;
  font-family: var(--dg-font-title);
  font-size: 2.15cqw;
  font-weight: 600;
  letter-spacing: 0.32em;
  line-height: 1.15;
  text-shadow:
    0 0.12cqw 0.3cqw #000,
    0 0 1.2cqw rgba(0, 0, 0, 0.85);
  transition: text-shadow 0.3s ease;
}

.splash-menu-button__sub {
  margin-top: 0.25cqw;
  margin-right: -0.5em;
  color: rgba(201, 161, 96, 0.72);
  font-family: 'Cinzel', var(--dg-font-title);
  font-size: 0.62cqw;
  letter-spacing: 0.5em;
  line-height: 1;
}

/* 主选项：更大、带一点余烬般的呼吸光 */
.splash-menu-button--start .splash-menu-button__label {
  font-size: 3cqw;
  color: #f3dcae;
}

.splash-menu-button--start .splash-menu-button__sub {
  font-size: 0.72cqw;
  color: rgba(214, 120, 96, 0.85);
}

.splash-menu-button--start .splash-menu-button__sigil {
  width: 0.95cqw;
  height: 0.95cqw;
  border-color: rgba(220, 90, 70, 0.9);
  background: rgba(120, 14, 18, 0.75);
  box-shadow: 0 0 0.8cqw rgba(220, 40, 30, 0.55);
}

.splash-menu-button--start::after {
  position: absolute;
  z-index: -1;
  inset: -0.6cqw -1.2cqw -0.6cqw 2cqw;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(150, 18, 20, 0.42), transparent);
  animation: splash-ember 4.2s ease-in-out infinite;
  pointer-events: none;
  content: '';
}

.splash-menu-button:hover:not(:disabled),
.splash-menu-button:focus-visible {
  outline: none;
  color: var(--dg-gold-bright, #f6d89a);
  transform: translateX(-0.5cqw);
}

.splash-menu-button:hover:not(:disabled) .splash-menu-button__label,
.splash-menu-button:focus-visible .splash-menu-button__label {
  text-shadow:
    0 0.12cqw 0.3cqw #000,
    0 0 1.4cqw rgba(200, 40, 30, 0.7),
    0 0 2.6cqw rgba(200, 40, 30, 0.35);
}

.splash-menu-button:hover:not(:disabled)::before,
.splash-menu-button:focus-visible::before {
  width: 4.2cqw;
  background: linear-gradient(90deg, transparent, rgba(232, 110, 80, 0.85));
}

.splash-menu-button:hover:not(:disabled) .splash-menu-button__sigil,
.splash-menu-button:focus-visible .splash-menu-button__sigil {
  border-color: #ffb08a;
  background: #b3191c;
  box-shadow: 0 0 1cqw rgba(255, 60, 40, 0.75);
}

.splash-menu-button:active:not(:disabled) {
  transform: translateX(-0.3cqw) scale(0.98);
}

.splash-menu-button:disabled {
  cursor: wait;
  opacity: 0.55;
}

@keyframes splash-menu-in {
  from {
    opacity: 0;
    translate: 1.5cqw 0;
  }
  to {
    opacity: 1;
    translate: 0 0;
  }
}

@keyframes splash-ember {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}

/* 更新告示：与右侧菜单同一刻字风格（细金线 + 菱形纹章），不再使用亮面图片框 */
.splash-update-card {
  position: absolute;
  bottom: 6%;
  left: 3%;
  display: flex;
  align-items: center;
  gap: 1.2cqw;
  padding: 0.8cqw 1.6cqw 0.8cqw 1.2cqw;
  border: 0;
  background: linear-gradient(90deg, rgba(4, 2, 6, 0.78), rgba(4, 2, 6, 0.45) 75%, transparent);
  color: #e6d6b4;
  text-align: left;
  cursor: pointer;
  transition:
    transform 0.28s ease,
    color 0.28s ease;
  animation: splash-menu-in 0.8s cubic-bezier(0.2, 0.8, 0.3, 1) 0.8s both;
}

/* 上下两道细金线，向右淡出 */
.splash-update-card::before,
.splash-update-card::after {
  position: absolute;
  left: 0;
  width: 100%;
  height: 1px;
  background: linear-gradient(90deg, rgba(201, 161, 96, 0.75), rgba(201, 161, 96, 0.3) 70%, transparent);
  content: '';
}

.splash-update-card::before {
  top: 0;
}

.splash-update-card::after {
  bottom: 0;
}

.splash-update-card__sigil {
  flex: none;
  width: 1cqw;
  height: 1cqw;
  border: 1px solid rgba(220, 90, 70, 0.9);
  background: rgba(120, 14, 18, 0.75);
  box-shadow: 0 0 0.8cqw rgba(220, 40, 30, 0.5);
  transform: rotate(45deg);
  transition:
    background 0.3s ease,
    box-shadow 0.3s ease;
}

.splash-update-card__copy {
  display: grid;
  justify-items: start;
  gap: 0.35cqw;
  white-space: nowrap;
}

.splash-update-card__copy span {
  color: rgba(201, 161, 96, 0.8);
  font-family: 'Cinzel', var(--dg-font-title);
  font-size: 0.78cqw;
  letter-spacing: 0.32em;
}

.splash-update-card__copy strong {
  font-family: var(--dg-font-title);
  font-size: 1.6cqw;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-shadow:
    0 0.12cqw 0.3cqw #000,
    0 0 1.2cqw rgba(0, 0, 0, 0.85);
}

.splash-update-card__more {
  align-self: flex-end;
  margin-left: 1.2cqw;
  padding-left: 1.2cqw;
  border-left: 1px solid rgba(201, 161, 96, 0.35);
  color: rgba(230, 214, 180, 0.6);
  font-family: var(--dg-font-title);
  font-size: 0.82cqw;
  letter-spacing: 0.24em;
  transition: color 0.28s ease;
}

.splash-update-card:hover,
.splash-update-card:focus-visible {
  outline: none;
  color: var(--dg-gold-bright, #f6d89a);
  transform: translateX(0.4cqw);
}

.splash-update-card:hover .splash-update-card__sigil,
.splash-update-card:focus-visible .splash-update-card__sigil {
  background: #b3191c;
  box-shadow: 0 0 1cqw rgba(255, 60, 40, 0.75);
}

.splash-update-card:hover .splash-update-card__more,
.splash-update-card:focus-visible .splash-update-card__more {
  color: var(--dg-gold-bright, #f6d89a);
}

/* ---------- 环境监测：典籍面板（与游戏内弹窗同一材质） ---------- */
.splash-environment-panel {
  position: fixed;
  top: 50%;
  left: 50%;
  z-index: 40;
  width: min(42rem, calc(100vw - 2rem));
  max-height: min(86vh, 48rem);
  overflow: auto;
  border: 1px solid rgba(201, 161, 96, 0.6);
  border-radius: 2px;
  background: var(--dg-bg-panel);
  box-shadow: inset 0 0 0 3px rgba(17, 12, 9, 0.9), inset 0 0 0 4px rgba(201, 161, 96, 0.28), var(--dg-shadow-deep);
  scrollbar-color: rgba(201, 161, 96, 0.4) transparent;
  scrollbar-width: thin;
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
  position: relative;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.15rem 1.3rem 1.1rem;
}

.splash-environment-panel__header::after {
  position: absolute;
  right: 1.3rem;
  bottom: 0;
  left: 1.3rem;
  height: 1px;
  background: linear-gradient(90deg, var(--dg-line-strong), var(--dg-line) 70%, transparent);
  content: '';
}

.splash-environment-panel__heading { min-width: 0; }

.splash-environment-panel__title {
  gap: 0.5rem;
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-title);
  font-size: 1rem;
  letter-spacing: 0.24em;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.85);
}

.splash-environment-panel__heading p {
  margin: 0.5rem 0 0;
  color: var(--dg-text);
  font-size: 0.875rem;
}

.splash-environment-panel__actions {
  align-items: flex-start;
  gap: 0.5rem;
  color: var(--dg-text-faint);
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
  white-space: nowrap;
}

/* 关闭：铁质宝石扣；强制进入：危险铭牌 */
.splash-environment-panel__force,
.splash-environment-panel__close,
.splash-update-dialog__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(201, 161, 96, 0.55);
  background: radial-gradient(circle at 35% 30%, #3a2c22, #16100c 70%);
  color: var(--dg-gold);
  cursor: pointer;
  transition: border-color 160ms ease, color 160ms ease, box-shadow 160ms ease;
}

.splash-environment-panel__force {
  gap: 0.25rem;
  padding: 0.35rem 0.6rem;
  border-color: rgba(192, 80, 63, 0.6);
  border-radius: 2px;
  background: linear-gradient(180deg, #3a1d17, #22100c);
  color: #ecb4a6;
  font-size: 0.6875rem;
  letter-spacing: 0.08em;
}

.splash-environment-panel__close {
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 50%;
}

.splash-environment-panel__force:hover,
.splash-environment-panel__close:hover,
.splash-update-dialog__close:hover {
  border-color: var(--dg-gold-bright);
  box-shadow: 0 0 8px rgba(232, 170, 70, 0.3);
  color: var(--dg-gold-bright);
}

.splash-environment-panel__force:hover {
  border-color: #e07a66;
  box-shadow: 0 0 8px rgba(192, 80, 63, 0.35);
  color: #f6cdc2;
}

.splash-environment-panel__items {
  display: grid;
  gap: 0.7rem;
  padding: 1rem 1.3rem 1.3rem;
}

/* 依赖条目：皮革卡 + 左侧状态色边（正常绿 / 缺失红 / 停用金 / 未就绪蓝 / 错误紫） */
.splash-environment-item {
  --env-accent: 127, 179, 106;
  padding: 0.8rem 1rem;
  border: 1px solid rgba(201, 161, 96, 0.2);
  border-left: 3px solid rgb(var(--env-accent));
  border-radius: 2px;
  background:
    radial-gradient(ellipse 50% 100% at 0% 50%, rgba(var(--env-accent), 0.12), transparent 70%),
    var(--dg-surface);
  color: rgb(var(--env-accent));
}

.splash-environment-item.is-ok { --env-accent: 127, 179, 106; }
.splash-environment-item.is-missing { --env-accent: 214, 98, 82; }
.splash-environment-item.is-disabled { --env-accent: 226, 176, 74; }
.splash-environment-item.is-not_ready { --env-accent: 110, 160, 230; }
.splash-environment-item.is-error { --env-accent: 176, 120, 240; }

.splash-environment-item__heading {
  justify-content: space-between;
  gap: 0.75rem;
}

.splash-environment-item__heading > div { gap: 0.5rem; }

.splash-environment-item h3 {
  margin: 0;
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-title);
  font-size: 0.9rem;
  letter-spacing: 0.12em;
}

.splash-environment-item__heading > span {
  font-size: 0.6875rem;
  letter-spacing: 0.14em;
}

.splash-environment-item p {
  margin: 0.5rem 0 0;
  color: var(--dg-text);
  font-size: 0.875rem;
  line-height: 1.5;
}

.splash-environment-item p + p {
  color: var(--dg-text-muted);
  font-size: 0.75rem;
}

/* ---------- 更新日志 ---------- */
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
  border: 1px solid rgba(201, 161, 96, 0.6);
  border-radius: 2px;
  background: var(--dg-bg-panel);
  box-shadow: inset 0 0 0 0.25cqw rgba(17, 12, 9, 0.9), inset 0 0 0 0.32cqw rgba(201, 161, 96, 0.28), 0 1.4cqw 4cqw rgba(0, 0, 0, 0.72);
}

.splash-update-dialog__header {
  position: relative;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 1cqw;
  padding: 1.7cqw 2.3cqw 1.5cqw;
  background: linear-gradient(180deg, rgba(120, 76, 36, 0.16), transparent);
}

.splash-update-dialog__header::after {
  position: absolute;
  right: 2.3cqw;
  bottom: 0;
  left: 2.3cqw;
  height: 1.1cqw;
  background: var(--dg-img-divider) center / min(70%, 32cqw) auto no-repeat;
  transform: translateY(50%);
  content: '';
}

.splash-update-dialog__eyebrow {
  color: var(--dg-text-faint);
  font-family: var(--dg-font-data);
  font-size: 0.7cqw;
  letter-spacing: 0.3em;
}

.splash-update-dialog h2 {
  margin: 0.4cqw 0 0;
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-title);
  font-size: 2cqw;
  line-height: 1.2;
  letter-spacing: 0.16em;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.85);
}

.splash-update-dialog__close {
  flex-shrink: 0;
  width: 2.6cqw;
  height: 2.6cqw;
  border-radius: 50%;
}

.splash-update-dialog__close :deep(svg) {
  width: 1.3cqw;
  height: 1.3cqw;
}

.splash-update-dialog__close:focus-visible {
  outline: 2px solid var(--dg-gold);
  outline-offset: 2px;
}

.splash-update-dialog__body {
  min-height: 0;
  margin: 0;
  padding: 1.2cqw 2.3cqw 1.2cqw;
  overflow-y: auto;
  color: var(--dg-text);
  font-size: 1.15cqw;
  line-height: 1.5;
  list-style: none;
  scrollbar-width: thin;
  scrollbar-color: rgba(201, 161, 96, 0.4) transparent;
}

.splash-update-dialog__entry {
  position: relative;
  display: grid;
  grid-template-columns: 5.3cqw minmax(0, 1fr);
  align-items: center;
  gap: 1.6cqw;
  padding: 1.05cqw 1.1cqw;
}

.splash-update-dialog__entry:not(:last-child)::after {
  position: absolute;
  right: 0;
  bottom: 0;
  left: 0;
  height: 1px;
  background: linear-gradient(90deg, var(--dg-line), transparent);
  content: '';
}

.splash-update-dialog__entry--latest {
  color: var(--dg-text-strong);
  background: linear-gradient(90deg, rgba(201, 161, 96, 0.12), transparent 70%);
  box-shadow: inset 0.2cqw 0 var(--dg-gold);
}

.splash-update-dialog__date {
  color: var(--dg-text-muted);
  font-family: var(--dg-font-data);
  font-size: 1.05cqw;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.splash-update-dialog__entry--latest .splash-update-dialog__date { color: var(--dg-gold-bright); }

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
  padding: 0.1cqw 0.5cqw;
  border: 1px solid rgba(201, 161, 96, 0.5);
  border-radius: 2px;
  color: var(--dg-gold-bright);
  font-size: 0.8cqw;
  letter-spacing: 0.1em;
}

.splash-update-dialog__milestone {
  display: flex;
  align-items: center;
  gap: 1.2cqw;
  padding: 1.25cqw 1.1cqw;
  color: var(--dg-gold);
  font-family: var(--dg-font-title);
  font-size: 0.9cqw;
  letter-spacing: 0.2em;
}

.splash-update-dialog__milestone::before,
.splash-update-dialog__milestone::after {
  content: '';
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--dg-line-strong));
}

.splash-update-dialog__milestone::after { background: linear-gradient(90deg, var(--dg-line-strong), transparent); }

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
    right: 3%;
    bottom: 10%;
    width: 34%;
    gap: max(1.35cqw, 3px);
  }

  .splash-menu__ornament {
    height: max(1.5cqw, 6px);
  }

  .splash-menu-button__label {
    font-size: max(2.15cqw, 12px);
  }

  .splash-menu-button--start .splash-menu-button__label {
    font-size: max(3cqw, 15px);
  }

  .splash-menu-button__sub {
    font-size: max(0.62cqw, 6px);
  }

  .splash-menu-button__sigil {
    width: max(0.75cqw, 5px);
    height: max(0.75cqw, 5px);
  }

  .splash-update-card {
    bottom: 4%;
    left: 2%;
    gap: max(1.2cqw, 5px);
    padding: max(0.8cqw, 4px) max(1.6cqw, 8px) max(0.8cqw, 4px) max(1.2cqw, 6px);
  }

  .splash-update-card__copy span {
    font-size: max(0.78cqw, 6px);
  }

  .splash-update-card__copy strong {
    font-size: max(1.6cqw, 11px);
  }

  .splash-update-card__more {
    display: none;
  }
}

@media (prefers-reduced-motion: reduce) {
  .splash-menu-button,
  .splash-update-card {
    transition: none;
  }

  .splash-menu-button,
  .splash-menu__ornament,
  .splash-menu-button--start::after,
  .splash-update-card,
  .splash-title {
    animation: none;
  }
}
</style>
