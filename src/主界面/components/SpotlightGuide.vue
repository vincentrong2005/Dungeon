<template>
  <Teleport to="body">
    <Transition name="spotlight-guide">
      <div v-if="open && step" class="spotlight-guide" role="dialog" aria-modal="true" :aria-label="step.title">
        <template v-if="rect">
          <div class="spotlight-guide__shade" :style="shadeStyles[0]"></div>
          <div class="spotlight-guide__shade" :style="shadeStyles[1]"></div>
          <div class="spotlight-guide__shade" :style="shadeStyles[2]"></div>
          <div class="spotlight-guide__shade" :style="shadeStyles[3]"></div>
          <div class="spotlight-guide__focus" :style="focusStyle" aria-hidden="true"></div>
        </template>
        <div v-else class="spotlight-guide__shade spotlight-guide__shade--full"></div>

        <section ref="cardEl" class="spotlight-guide__card" :style="cardStyle">
          <header class="spotlight-guide__head">
            <span class="spotlight-guide__kicker">{{ kicker }}</span>
            <span class="spotlight-guide__dots" aria-hidden="true">
              <i v-for="(_, i) in steps" :key="i" :class="{ 'is-on': i === index, 'is-done': i < index }"></i>
            </span>
          </header>
          <Transition name="spotlight-guide-step" mode="out-in">
            <div :key="index" class="spotlight-guide__content">
              <h2 class="spotlight-guide__title">{{ step.title }}</h2>
              <p v-for="line in step.body" :key="line">{{ line }}</p>
            </div>
          </Transition>
          <footer class="spotlight-guide__foot">
            <button v-if="!isLast" type="button" class="spotlight-guide__ghost" @click="emit('skip')">跳过指引</button>
            <button v-else-if="secondaryFinishLabel" type="button" class="spotlight-guide__ghost" @click="emit('skip')">
              {{ secondaryFinishLabel }}
            </button>
            <span class="spotlight-guide__spacer"></span>
            <button v-if="index > 0" type="button" class="spotlight-guide__ghost" @click="go(index - 1)">上一步</button>
            <button ref="primaryEl" type="button" class="spotlight-guide__primary" @click="next">
              {{ isLast ? finishLabel : '下一步' }}
            </button>
          </footer>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
export interface SpotlightGuideStep {
  /** 要高亮的元素（CSS 选择器，可用逗号列出多个，取并集）；不填则居中显示说明 */
  target?: string;
  title: string;
  body: string[];
}

const props = withDefaults(
  defineProps<{
    open: boolean;
    steps: SpotlightGuideStep[];
    kickerLabel?: string;
    finishLabel?: string;
    /** 最后一步左侧的次要按钮（触发 skip） */
    secondaryFinishLabel?: string;
  }>(),
  { kickerLabel: '新手指引', finishLabel: '完成', secondaryFinishLabel: '' },
);

const emit = defineEmits<{ finish: []; skip: [] }>();

const PADDING = 10;
const CARD_WIDTH = 420;
const GAP = 22;
const MARGIN = 16;

const index = ref(0);
const rect = ref<{ left: number; top: number; right: number; bottom: number } | null>(null);
const cardEl = ref<HTMLElement | null>(null);
const primaryEl = ref<HTMLElement | null>(null);
const cardSize = ref({ width: CARD_WIDTH, height: 240 });
const viewport = ref({ width: 1280, height: 720 });

const step = computed(() => props.steps[index.value] ?? null);
const isLast = computed(() => index.value >= props.steps.length - 1);
const kicker = computed(() => `${props.kickerLabel} · ${index.value + 1} / ${props.steps.length}`);

const measureTarget = () => {
  viewport.value = { width: window.innerWidth, height: window.innerHeight };
  if (cardEl.value) cardSize.value = { width: cardEl.value.offsetWidth, height: cardEl.value.offsetHeight };
  const selector = step.value?.target;
  if (!selector) {
    rect.value = null;
    return;
  }
  const elements = Array.from(document.querySelectorAll<HTMLElement>(selector)).filter(
    el => el.getClientRects().length > 0,
  );
  if (elements.length === 0) {
    rect.value = null;
    return;
  }
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const el of elements) {
    const b = el.getBoundingClientRect();
    left = Math.min(left, b.left);
    top = Math.min(top, b.top);
    right = Math.max(right, b.right);
    bottom = Math.max(bottom, b.bottom);
  }
  const next = {
    left: Math.max(0, left - PADDING),
    top: Math.max(0, top - PADDING),
    right: Math.min(viewport.value.width, right + PADDING),
    bottom: Math.min(viewport.value.height, bottom + PADDING),
  };
  const prev = rect.value;
  if (
    !prev ||
    Math.abs(prev.left - next.left) > 0.5 ||
    Math.abs(prev.top - next.top) > 0.5 ||
    Math.abs(prev.right - next.right) > 0.5 ||
    Math.abs(prev.bottom - next.bottom) > 0.5
  ) {
    rect.value = next;
  }
};

let rafId: number | null = null;
const loop = () => {
  measureTarget();
  rafId = requestAnimationFrame(loop);
};
const stopLoop = () => {
  if (rafId !== null) cancelAnimationFrame(rafId);
  rafId = null;
};

const shadeStyles = computed(() => {
  const r = rect.value;
  const { width, height } = viewport.value;
  if (!r) return [];
  return [
    { left: '0px', top: '0px', width: `${width}px`, height: `${r.top}px` },
    { left: '0px', top: `${r.top}px`, width: `${r.left}px`, height: `${r.bottom - r.top}px` },
    { left: `${r.right}px`, top: `${r.top}px`, width: `${width - r.right}px`, height: `${r.bottom - r.top}px` },
    { left: '0px', top: `${r.bottom}px`, width: `${width}px`, height: `${height - r.bottom}px` },
  ];
});

const focusStyle = computed(() => {
  const r = rect.value;
  return r ? { left: `${r.left}px`, top: `${r.top}px`, width: `${r.right - r.left}px`, height: `${r.bottom - r.top}px` } : {};
});

/** 卡片优先放在目标右侧，其次左侧、下方、上方；始终限制在视口内 */
const cardStyle = computed(() => {
  const { width: vw, height: vh } = viewport.value;
  const cw = Math.min(cardSize.value.width, vw - MARGIN * 2);
  const ch = cardSize.value.height;
  const r = rect.value;
  const clampX = (x: number) => Math.max(MARGIN, Math.min(vw - cw - MARGIN, x));
  const clampY = (y: number) => Math.max(MARGIN, Math.min(vh - ch - MARGIN, y));
  if (!r) return { left: `${clampX((vw - cw) / 2)}px`, top: `${clampY((vh - ch) / 2)}px` };
  const centerY = (r.top + r.bottom) / 2 - ch / 2;
  const centerX = (r.left + r.right) / 2 - cw / 2;
  if (r.right + GAP + cw <= vw - MARGIN) return { left: `${r.right + GAP}px`, top: `${clampY(centerY)}px` };
  if (r.left - GAP - cw >= MARGIN) return { left: `${r.left - GAP - cw}px`, top: `${clampY(centerY)}px` };
  if (r.bottom + GAP + ch <= vh - MARGIN) return { left: `${clampX(centerX)}px`, top: `${r.bottom + GAP}px` };
  return { left: `${clampX(centerX)}px`, top: `${clampY(r.top - GAP - ch)}px` };
});

const go = (next: number) => {
  index.value = Math.max(0, Math.min(props.steps.length - 1, next));
};

const next = () => {
  if (isLast.value) emit('finish');
  else go(index.value + 1);
};

const handleKeydown = (event: KeyboardEvent) => {
  if (!props.open) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    emit('skip');
  } else if (event.key === 'Enter' || event.key === 'ArrowRight') {
    event.preventDefault();
    next();
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault();
    go(index.value - 1);
  }
};

watch(
  () => props.open,
  open => {
    if (open) {
      index.value = 0;
      stopLoop();
      rafId = requestAnimationFrame(loop);
      window.addEventListener('keydown', handleKeydown);
      void nextTick(() => primaryEl.value?.focus());
    } else {
      stopLoop();
      window.removeEventListener('keydown', handleKeydown);
    }
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  stopLoop();
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.spotlight-guide {
  position: fixed;
  inset: 0;
  z-index: 2147482000;
  color: var(--dg-text, #e8dcc4);
}

.spotlight-guide__shade {
  position: absolute;
  background: rgba(4, 2, 6, 0.74);
  transition: all 0.35s cubic-bezier(0.2, 0.8, 0.3, 1);
}

.spotlight-guide__shade--full {
  inset: 0;
}

/* 高亮框：金色细框 + 外圈呼吸光 */
.spotlight-guide__focus {
  position: absolute;
  border: 1px solid rgba(255, 214, 140, 0.95);
  border-radius: 6px;
  box-shadow:
    0 0 0 3px rgba(20, 12, 8, 0.65),
    0 0 18px rgba(232, 170, 70, 0.55),
    inset 0 0 14px rgba(232, 170, 70, 0.25);
  pointer-events: none;
  transition: all 0.35s cubic-bezier(0.2, 0.8, 0.3, 1);
  animation: spotlight-guide-pulse 2.2s ease-in-out infinite;
}

.spotlight-guide__card {
  position: absolute;
  width: min(420px, calc(100vw - 32px));
  background: var(--dg-bg-panel, #120c0a);
  padding: 24px 26px 20px;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.6);
  transition:
    left 0.35s cubic-bezier(0.2, 0.8, 0.3, 1),
    top 0.35s cubic-bezier(0.2, 0.8, 0.3, 1);
}

/* 魔典框作为覆盖层外扩 8px，内缘正好压在底色边上（与状态栏同一做法），不再露出缝隙 */
.spotlight-guide__card::before {
  position: absolute;
  z-index: 1;
  inset: -8px;
  border-style: solid;
  border-width: 30px;
  border-image-source: var(--dg-img-frame);
  border-image-slice: 120;
  border-image-repeat: stretch;
  pointer-events: none;
  content: '';
}

.spotlight-guide__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(201, 161, 96, 0.3);
}

.spotlight-guide__kicker {
  color: rgba(201, 161, 96, 0.85);
  font: 12px/1 var(--dg-font-title, serif);
  letter-spacing: 0.2em;
}

.spotlight-guide__dots {
  display: flex;
  gap: 6px;
}

.spotlight-guide__dots i {
  width: 6px;
  height: 6px;
  border: 1px solid rgba(201, 161, 96, 0.7);
  transform: rotate(45deg);
  transition: background 0.25s ease;
}

.spotlight-guide__dots i.is-done {
  background: rgba(201, 161, 96, 0.55);
}

.spotlight-guide__dots i.is-on {
  border-color: #ffb08a;
  background: #b3191c;
  box-shadow: 0 0 6px rgba(255, 60, 40, 0.7);
}

.spotlight-guide__content {
  padding: 12px 0 4px;
}

.spotlight-guide__title {
  margin: 0 0 10px;
  color: var(--dg-gold-bright, #f6d89a);
  font: 600 22px/1.3 var(--dg-font-title, serif);
  letter-spacing: 0.08em;
}

.spotlight-guide__content p {
  margin: 0 0 8px;
  color: var(--dg-text, #e8dcc4);
  font: 15px/1.7 var(--dg-font-serif, serif);
}

.spotlight-guide__foot {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.spotlight-guide__foot button {
  flex: none;
  white-space: nowrap;
}

.spotlight-guide__spacer {
  flex: 1;
}

.spotlight-guide__ghost {
  border: 1px solid rgba(201, 161, 96, 0.35);
  background: rgba(10, 7, 9, 0.6);
  color: var(--dg-text-muted, #a8977c);
  font: 13px/1 var(--dg-font-title, serif);
  letter-spacing: 0.08em;
  padding: 8px 10px;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    color 0.18s ease;
}

.spotlight-guide__ghost:hover,
.spotlight-guide__ghost:focus-visible {
  outline: none;
  border-color: rgba(232, 190, 110, 0.75);
  color: var(--dg-text, #e8dcc4);
}

.spotlight-guide__primary {
  min-width: 104px;
  border-style: solid;
  border-width: 0 18px;
  border-image-source: var(--dg-img-button);
  border-image-slice: 0 80 fill;
  border-image-repeat: stretch;
  background: none;
  color: var(--dg-gold-bright, #f6d89a);
  font: 15px/1 var(--dg-font-title, serif);
  letter-spacing: 0.1em;
  padding: 11px 6px;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.85);
  cursor: pointer;
  transition: filter 0.18s ease;
}

.spotlight-guide__primary:hover,
.spotlight-guide__primary:focus-visible {
  outline: none;
  filter: brightness(1.15) drop-shadow(0 0 6px rgba(232, 170, 70, 0.35));
}

.spotlight-guide-enter-active,
.spotlight-guide-leave-active {
  transition: opacity 0.3s ease;
}

.spotlight-guide-enter-from,
.spotlight-guide-leave-to {
  opacity: 0;
}

.spotlight-guide-step-enter-active,
.spotlight-guide-step-leave-active {
  transition:
    opacity 0.18s ease,
    transform 0.18s ease;
}

.spotlight-guide-step-enter-from {
  opacity: 0;
  transform: translateX(8px);
}

.spotlight-guide-step-leave-to {
  opacity: 0;
  transform: translateX(-8px);
}

@keyframes spotlight-guide-pulse {
  0%,
  100% {
    box-shadow:
      0 0 0 3px rgba(20, 12, 8, 0.65),
      0 0 14px rgba(232, 170, 70, 0.45),
      inset 0 0 12px rgba(232, 170, 70, 0.2);
  }
  50% {
    box-shadow:
      0 0 0 3px rgba(20, 12, 8, 0.65),
      0 0 26px rgba(232, 170, 70, 0.75),
      inset 0 0 18px rgba(232, 170, 70, 0.35);
  }
}

@media (prefers-reduced-motion: reduce) {
  .spotlight-guide__focus {
    animation: none;
  }

  .spotlight-guide__shade,
  .spotlight-guide__focus,
  .spotlight-guide__card {
    transition: none;
  }
}
</style>
