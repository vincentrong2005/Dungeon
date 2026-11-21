<template>
  <div class="scene-transition" :class="{ 'is-active': phase !== 'idle' }" aria-hidden="true">
    <canvas ref="canvasEl" class="scene-transition__canvas"></canvas>
    <Transition name="scene-transition-label">
      <div v-if="showLoadingLabel" class="scene-transition__label">
        <span>正在加载</span>
        <i></i><i></i><i></i>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import {
  notifySceneTransitionPhaseDone,
  registerSceneTransitionHost,
  sceneTransitionState,
} from '../sceneTransition';

const FRAME_DIR = '地牢/素材库/通用UI/转场';
const toFrameUrl = (name: string) =>
  `https://img.vinsimage.org/${encodeURIComponent(`${FRAME_DIR}/${name}.png`).replace(/%2F/g, '/')}`;

/** 覆盖：01→11（11 为全黑）；揭幕：21→33 */
const COVER_FRAMES = Array.from({ length: 11 }, (_, i) => toFrameUrl(String(i + 1).padStart(2, '0')));
const REVEAL_FRAMES = Array.from({ length: 13 }, (_, i) => toFrameUrl(String(i + 21)));
const FRAME_MS = 1000 / 24;
const FRAME_WIDTH = 960;
const FRAME_HEIGHT = 540;
/** 停留超过该时长才显示“正在加载”，避免一闪而过 */
const LABEL_DELAY_MS = 700;

const canvasEl = ref<HTMLCanvasElement | null>(null);
const phase = computed(() => sceneTransitionState.phase);
const showLoadingLabel = ref(false);

const coverImages: HTMLImageElement[] = [];
const revealImages: HTMLImageElement[] = [];
let rafId: number | null = null;
let labelTimer: ReturnType<typeof setTimeout> | null = null;
/** 当前画在画布上的内容，供尺寸变化时重绘 */
let current: { image: HTMLImageElement | null; fallbackAlpha: number } = { image: null, fallbackAlpha: 0 };

const loadFrames = (urls: string[], target: HTMLImageElement[]) => {
  for (const url of urls) {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    void img.decode?.().catch(() => undefined);
    target.push(img);
  }
};

const resizeCanvas = () => {
  const canvas = canvasEl.value;
  if (!canvas) return;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const width = Math.max(1, Math.round(window.innerWidth * dpr));
  const height = Math.max(1, Math.round(window.innerHeight * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
    draw(current.image, current.fallbackAlpha);
  }
};

/** cover 方式绘制一帧；图片尚未加载时退化为同进度的黑色淡入淡出 */
const draw = (image: HTMLImageElement | null, fallbackAlpha: number) => {
  current = { image, fallbackAlpha };
  const canvas = canvasEl.value;
  const ctx = canvas?.getContext('2d');
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (image && image.complete && image.naturalWidth > 0) {
    const scale = Math.max(canvas.width / FRAME_WIDTH, canvas.height / FRAME_HEIGHT);
    const w = FRAME_WIDTH * scale;
    const h = FRAME_HEIGHT * scale;
    ctx.drawImage(image, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    return;
  }
  if (fallbackAlpha > 0) {
    ctx.fillStyle = `rgba(0, 0, 0, ${fallbackAlpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
};

const stopLoop = () => {
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
};

const playFrames = (frames: HTMLImageElement[], fallback: (progress: number) => number, onDone: () => void) => {
  stopLoop();
  const start = performance.now();
  const total = frames.length;
  const step = (now: number) => {
    const index = Math.min(total - 1, Math.floor((now - start) / FRAME_MS));
    draw(frames[index] ?? null, fallback((index + 1) / total));
    if (index >= total - 1) {
      rafId = null;
      // 最后一帧至少停留一帧时长
      rafId = requestAnimationFrame(() => {
        rafId = null;
        onDone();
      });
      return;
    }
    rafId = requestAnimationFrame(step);
  };
  rafId = requestAnimationFrame(step);
};

const clearLabel = () => {
  if (labelTimer) clearTimeout(labelTimer);
  labelTimer = null;
  showLoadingLabel.value = false;
};

watch(
  () => [sceneTransitionState.phase, sceneTransitionState.run] as const,
  ([next]) => {
    resizeCanvas();
    if (next === 'cover') {
      clearLabel();
      playFrames(coverImages, progress => progress, notifySceneTransitionPhaseDone);
    } else if (next === 'hold') {
      draw(coverImages[coverImages.length - 1] ?? null, 1);
      labelTimer = setTimeout(() => {
        showLoadingLabel.value = sceneTransitionState.phase === 'hold';
      }, LABEL_DELAY_MS);
    } else if (next === 'reveal') {
      clearLabel();
      playFrames(revealImages, progress => 1 - progress, () => {
        draw(null, 0);
        notifySceneTransitionPhaseDone();
      });
    } else {
      stopLoop();
      clearLabel();
      draw(null, 0);
    }
  },
);

let unregister: (() => void) | null = null;

onMounted(() => {
  loadFrames(COVER_FRAMES, coverImages);
  loadFrames(REVEAL_FRAMES, revealImages);
  unregister = registerSceneTransitionHost();
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);
});

onBeforeUnmount(() => {
  unregister?.();
  stopLoop();
  clearLabel();
  window.removeEventListener('resize', resizeCanvas);
});
</script>

<style scoped>
.scene-transition {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  pointer-events: none;
}

/* 转场期间拦截点击，避免重复触发 */
.scene-transition.is-active {
  pointer-events: auto;
}

.scene-transition__canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.scene-transition__label {
  position: absolute;
  left: 50%;
  bottom: 12%;
  display: flex;
  align-items: center;
  gap: 7px;
  translate: -50% 0;
  color: var(--dg-text-muted, #a8977c);
  font: 15px/1 var(--dg-font-title, serif);
  letter-spacing: 0.32em;
}

.scene-transition__label i {
  width: 5px;
  height: 5px;
  background: var(--dg-gold, #c9a160);
  transform: rotate(45deg);
  animation: scene-transition-dot 1.2s ease-in-out infinite;
}

.scene-transition__label i:nth-of-type(2) {
  animation-delay: 0.2s;
}

.scene-transition__label i:nth-of-type(3) {
  animation-delay: 0.4s;
}

.scene-transition-label-enter-active,
.scene-transition-label-leave-active {
  transition: opacity 0.3s ease;
}

.scene-transition-label-enter-from,
.scene-transition-label-leave-to {
  opacity: 0;
}

@keyframes scene-transition-dot {
  0%,
  100% {
    opacity: 0.25;
  }
  50% {
    opacity: 1;
  }
}
</style>
