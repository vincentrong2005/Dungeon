<!-- eslint-disable better-tailwindcss/no-unknown-classes, better-tailwindcss/no-concatenated-classes -->
<template>
  <span
    class="card-frame-skin"
    :class="[{ 'card-frame-skin--rare': rare }, sinState ? `card-frame-skin--sin-${sinState}` : '']"
    :style="frameStyle"
    aria-hidden="true"
  >
    <!-- 原罪特效：以卡框图片本身作遮罩，只作用在卡框金属上，不会出现矩形分割线 -->
    <span v-if="sinState" class="card-frame-sin-fx" :style="maskStyle"></span>
  </span>
</template>

<script setup lang="ts">
import type { CSSProperties } from 'vue';
import { getCardFrameUrl, type CardFrameType } from '../cardFrames';

export type { CardFrameType } from '../cardFrames';

const props = defineProps<{
  type: CardFrameType;
  rare?: boolean;
  /** 七原罪：未共鸣（corrupted）/ 已共鸣（resonated） */
  sinState?: 'corrupted' | 'resonated' | null;
}>();

const frameUrl = computed(() => getCardFrameUrl(props.type));

const frameStyle = computed<CSSProperties>(() => ({
  backgroundImage: `url("${frameUrl.value}")`,
}));

const maskStyle = computed<CSSProperties>(() => ({
  maskImage: `url("${frameUrl.value}")`,
  WebkitMaskImage: `url("${frameUrl.value}")`,
}));
</script>

<style scoped>
.card-frame-skin {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: block;
  background-repeat: no-repeat;
  background-size: 100% 100%;
  pointer-events: none;
  user-select: none;
}

.card-frame-skin--rare {
  filter: drop-shadow(0 0 3px rgba(255, 214, 100, 0.72)) drop-shadow(0 0 8px rgba(255, 169, 34, 0.32));
}

/* ═════════ 七原罪 ═════════
 * 光晕用 drop-shadow，沿卡框的实际轮廓发光；纹理层用卡框做遮罩，只覆盖金属部分。
 */
.card-frame-sin-fx {
  position: absolute;
  inset: 0;
  mask-size: 100% 100%;
  mask-repeat: no-repeat;
  -webkit-mask-size: 100% 100%;
  -webkit-mask-repeat: no-repeat;
  mix-blend-mode: screen;
}

/* ── 共鸣前：血色侵蚀——不稳定的脉动、在金属里流动的血脉、偶发的信号错位 ── */
.card-frame-skin--sin-corrupted {
  animation: sin-corrupt-aura 2.4s ease-in-out infinite;
}

.card-frame-skin--sin-corrupted .card-frame-sin-fx {
  background:
    repeating-linear-gradient(118deg, transparent 0 7px, rgba(255, 40, 60, 0.75) 7px 9px, transparent 9px 19px),
    repeating-linear-gradient(-58deg, transparent 0 11px, rgba(200, 10, 40, 0.6) 11px 12px, transparent 12px 26px),
    linear-gradient(180deg, rgba(160, 0, 25, 0.55), rgba(60, 0, 10, 0.25) 50%, rgba(160, 0, 25, 0.55));
  background-size: 180% 180%, 200% 200%, 100% 100%;
  animation: sin-corrupt-veins 6s linear infinite, sin-corrupt-glitch 5.2s steps(1, end) infinite;
}

@keyframes sin-corrupt-aura {
  0%, 100% { filter: drop-shadow(0 0 3px rgba(150, 0, 25, 0.75)) drop-shadow(0 0 7px rgba(120, 0, 20, 0.45)); }
  45% { filter: drop-shadow(0 0 5px rgba(240, 30, 60, 0.95)) drop-shadow(0 0 14px rgba(200, 10, 40, 0.6)); }
  51% { filter: drop-shadow(0 0 2px rgba(90, 0, 15, 0.6)) brightness(0.85); }
  57% { filter: drop-shadow(0 0 5px rgba(230, 25, 55, 0.9)) drop-shadow(0 0 12px rgba(190, 10, 40, 0.55)); }
}

@keyframes sin-corrupt-veins {
  0% { background-position: 0% 0%, 100% 0%, 0 0; opacity: 0.7; }
  50% { opacity: 1; }
  100% { background-position: 100% 100%, 0% 100%, 0 0; opacity: 0.7; }
}

/* 大部分时间静止，少数几帧错位偏色，像信号不稳 */
@keyframes sin-corrupt-glitch {
  0%, 88%, 100% { transform: none; }
  89% { transform: translate(-2px, 1px); }
  91% { transform: translate(2px, -1px); }
  93% { transform: translate(-1px, 0); }
}

/* ── 共鸣后：原罪平息——稳定呼吸的金红辉光，一道流光沿卡框扫过 ── */
.card-frame-skin--sin-resonated {
  animation: sin-resonate-aura 4.2s ease-in-out infinite;
}

.card-frame-skin--sin-resonated .card-frame-sin-fx {
  background:
    linear-gradient(105deg, transparent 38%, rgba(255, 236, 170, 0.95) 47%, rgba(255, 140, 100, 0.7) 53%, transparent 62%),
    linear-gradient(180deg, rgba(250, 204, 21, 0.18), rgba(250, 204, 21, 0.18));
  background-size: 300% 100%, 100% 100%;
  background-repeat: no-repeat;
  animation: sin-resonate-sheen 3.8s ease-in-out infinite;
}

@keyframes sin-resonate-aura {
  0%, 100% { filter: drop-shadow(0 0 3px rgba(234, 179, 8, 0.6)) drop-shadow(0 0 8px rgba(220, 38, 38, 0.3)); }
  50% { filter: drop-shadow(0 0 5px rgba(250, 204, 21, 0.85)) drop-shadow(0 0 14px rgba(220, 38, 38, 0.45)); }
}

@keyframes sin-resonate-sheen {
  0%, 30% { background-position: 120% 0, 0 0; }
  75%, 100% { background-position: -20% 0, 0 0; }
}

@media (prefers-reduced-motion: reduce) {
  .card-frame-skin--sin-corrupted,
  .card-frame-skin--sin-resonated,
  .card-frame-sin-fx {
    animation: none !important;
  }

  .card-frame-skin--sin-corrupted { filter: drop-shadow(0 0 4px rgba(220, 20, 50, 0.85)) drop-shadow(0 0 10px rgba(180, 10, 40, 0.5)); }
  .card-frame-skin--sin-resonated { filter: drop-shadow(0 0 4px rgba(250, 204, 21, 0.75)) drop-shadow(0 0 10px rgba(220, 38, 38, 0.4)); }
}
</style>
