<template>
  <div
    ref="rootEl"
    class="shop-scene"
    :class="{ 'is-compact': compact, 'is-robbing': robbing, 'is-defeated': defeated }"
    :style="{ '--threat': String(threat) }"
  >
    <div ref="stageEl" class="shop-scene__stage">
      <img class="shop-scene__bg" :src="backgroundUrl" alt="" draggable="false" />
      <div class="shop-scene__shade" aria-hidden="true"></div>
      <div class="shop-scene__threat" aria-hidden="true"></div>

      <!-- 店名 -->
      <header class="shop-brand">
        <h2 class="shop-brand__plate">神秘商店</h2>
        <div class="shop-brand__owner">店主 · 沐芯兰</div>
      </header>

      <!-- 交易守则：羊皮纸告示 -->
      <section class="shop-notice" aria-label="交易守则">
        <h3>交易守则</h3>
        <ul>
          <li v-for="rule in SHOP_RULES" :key="rule">{{ rule }}</li>
        </ul>
      </section>

      <!-- 商人对白 -->
      <div ref="dialogueEl" class="shop-dialogue">
        <div class="shop-dialogue__name">沐芯兰</div>
        <Transition name="shop-line" mode="out-in">
          <p :key="dialogueText">{{ dialogueText }}</p>
        </Transition>
      </div>

      <!-- 金币 -->
      <div ref="goldEl" class="shop-gold" aria-label="当前金币">
        <img :src="goldIconUrl" alt="" draggable="false" />
        <span class="shop-gold__value">{{ displayedGold }}</span>
        <Transition name="shop-cost">
          <span v-if="costFloat" :key="costFloat.id" class="shop-gold__cost">-{{ costFloat.amount }}</span>
        </Transition>
      </div>

      <!-- 货架面板 -->
      <section class="shop-panel" aria-label="圣遗物商店">
        <header class="shop-panel__head">
          <h2 class="shop-panel__plate">圣遗物</h2>
          <span class="shop-panel__sub">ARTIFACTS</span>
        </header>

        <div class="shop-goods custom-scrollbar">
          <button
            v-for="item in products"
            :key="item.key"
            type="button"
            class="shop-good"
            :class="[
              RARITY_TONE_CLASS[item.relic.rarity] ?? 'is-common',
              {
                'is-selected': selectedKey === item.key,
                'is-sold': item.sold,
                'is-short': !item.sold && item.finalPrice > gold,
              },
            ]"
            :data-key="item.key"
            :aria-pressed="selectedKey === item.key"
            :aria-label="`${item.relic.name}，${item.relic.rarity}，${item.sold ? '已售出' : priceLabel(item)}`"
            @click="selectProduct(item)"
          >
            <span class="shop-good__orb">
              <img :src="getRelicOrbUrl(item.relic.rarity)" alt="" draggable="false" />
            </span>
            <span class="shop-good__name">{{ item.relic.name }}</span>
            <span class="shop-good__meta">{{ item.relic.rarity }} · {{ item.relic.category }}</span>
            <span class="shop-good__price">
              <img :src="goldIconUrl" alt="" draggable="false" />
              <s v-if="item.finalPrice < item.basePrice">{{ item.basePrice }}</s>
              <b>{{ item.finalPrice === 0 ? '免费' : item.finalPrice }}</b>
            </span>
            <span v-if="item.sold" class="shop-good__stamp" aria-hidden="true">已售</span>
          </button>

          <div v-if="products.length === 0" class="shop-goods__empty">货架空空如也</div>
        </div>

        <!-- 详情 + 购买 -->
        <div class="shop-detail" :class="selected ? RARITY_TONE_CLASS[selected.relic.rarity] : ''">
          <Transition name="shop-line" mode="out-in">
            <div v-if="selected" :key="selected.key" class="shop-detail__body">
              <img class="shop-detail__orb" :src="getRelicOrbUrl(selected.relic.rarity)" alt="" draggable="false" />
              <div class="shop-detail__copy">
                <div class="shop-detail__name">{{ selected.relic.name }}</div>
                <div class="shop-detail__meta">{{ selected.relic.rarity }} · {{ selected.relic.category }}</div>
                <p class="shop-detail__effect">{{ selected.relic.description || selected.relic.effect }}</p>
              </div>
              <div class="shop-detail__action">
                <span class="shop-detail__price" :class="{ 'is-short': selectedShort }">
                  <img :src="goldIconUrl" alt="" draggable="false" />
                  <s v-if="selected.finalPrice < selected.basePrice">{{ selected.basePrice }}</s>
                  <b>{{ selected.finalPrice === 0 ? '免费' : selected.finalPrice }}</b>
                </span>
                <button
                  ref="buyBtnEl"
                  type="button"
                  class="shop-buy"
                  :class="{ 'is-short': selectedShort }"
                  :disabled="selected.sold || busy || robbing"
                  @click="handleBuy"
                >
                  {{ selected.sold ? '已售出' : selectedShort ? '金币不足' : defeated ? '拿走' : '购买' }}
                </button>
              </div>
            </div>
            <p v-else key="empty" class="shop-detail__hint">选择一件圣遗物查看详情</p>
          </Transition>
        </div>

        <footer class="shop-panel__foot">
          <div v-if="!defeated" class="shop-rob">
            <button
              type="button"
              class="shop-rob__btn"
              :class="{ 'is-final': robClickCount >= ROB_STEPS }"
              :disabled="busy || robbing"
              @click="emit('rob')"
            >
              {{ robClickCount >= ROB_STEPS ? '动手' : '抢夺' }}
            </button>
            <span v-if="robClickCount > 0" class="shop-rob__pips" aria-hidden="true">
              <i v-for="n in ROB_STEPS" :key="n" :class="{ 'is-on': n <= robClickCount }"></i>
            </span>
          </div>
          <button type="button" class="shop-exit" :disabled="busy || robbing" @click="emit('exit')">离开</button>
        </footer>
      </section>

      <div v-if="robFlashKey > 0" :key="`flash-${robFlashKey}`" class="shop-scene__flash" aria-hidden="true"></div>
    </div>

    <!-- 购买后飞向金币栏的光球 -->
    <div v-for="flyer in flyers" :key="flyer.id" :ref="el => bindFlyer(el, flyer)" class="shop-flyer" :style="flyer.style">
      <img :src="flyer.src" alt="" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { RelicData } from '../battle/relicRegistry';
import { getRelicOrbUrl } from '../relicOrbs';

interface ShopSceneProduct {
  key: string;
  relic: RelicData;
  basePrice: number;
  finalPrice: number;
  sold: boolean;
}

const props = defineProps<{
  products: readonly ShopSceneProduct[];
  /** 扣除本次已花费后的可用金币 */
  gold: number;
  dialogue: string;
  defeated: boolean;
  robClickCount: number;
  robbing: boolean;
  /** 购买中 / 正在生成回复 */
  busy: boolean;
  compact: boolean;
  backgroundUrl: string;
  goldIconUrl: string;
}>();

const emit = defineEmits<{
  buy: [key: string];
  rob: [];
  exit: [];
}>();

const SHOP_RULES = ['这里沐芯兰最大', '仅出售圣遗物', '自由交易', '自由离开', '挑衅的话后果自负'];
/** 与 GameView.handleShopRobClick 一致：第 6 次点击发起抢夺 */
const ROB_STEPS = 5;
const RARITY_TONE_CLASS: Record<RelicData['rarity'], string> = {
  普通: 'is-common',
  稀有: 'is-rare',
  传奇: 'is-legendary',
};

const rootEl = ref<HTMLElement | null>(null);
const stageEl = ref<HTMLElement | null>(null);
const dialogueEl = ref<HTMLElement | null>(null);
const goldEl = ref<HTMLElement | null>(null);
const buyBtnEl = ref<HTMLElement | null>(null);

const reducedMotion =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

const play = (el: Element | null | undefined, frames: Keyframe[], options: KeyframeAnimationOptions) => {
  if (!el || reducedMotion || typeof (el as HTMLElement).animate !== 'function') return null;
  return (el as HTMLElement).animate(frames, options);
};

const shakeFrames = (amplitude: number): Keyframe[] => [
  { transform: 'translateX(0)' },
  { transform: `translateX(${-amplitude}px)` },
  { transform: `translateX(${amplitude}px)` },
  { transform: `translateX(${-amplitude * 0.6}px)` },
  { transform: `translateX(${amplitude * 0.4}px)` },
  { transform: 'translateX(0)' },
];

/* ---------- 对白 ---------- */
const dialogueText = computed(() => {
  if (props.defeated) return '「……这里的东西，你想拿就拿吧。」';
  const line = props.dialogue.trim();
  if (!line) return '「……」';
  // 括号内的神态描写不加引号
  if (/^（.*）$/.test(line)) return line;
  return `「${line}」`;
});

/* ---------- 选择 ---------- */
const selectedKey = ref<string | null>(null);
const selected = computed(() => props.products.find(item => item.key === selectedKey.value) ?? null);
const selectedShort = computed(() => Boolean(selected.value && !selected.value.sold && selected.value.finalPrice > props.gold));

const priceLabel = (item: ShopSceneProduct) => (item.finalPrice === 0 ? '免费' : `${item.finalPrice}金币`);

const selectProduct = (item: ShopSceneProduct) => {
  selectedKey.value = item.key;
};

watch(
  () => props.products.map(item => item.key).join('|'),
  () => {
    if (selectedKey.value && !props.products.some(item => item.key === selectedKey.value)) selectedKey.value = null;
  },
);

const handleBuy = () => {
  const item = selected.value;
  if (!item || item.sold || props.busy || props.robbing) return;
  // 金币不足：按钮抖一下，仍交给父组件（由沐芯兰说一句话）
  if (selectedShort.value) play(buyBtnEl.value, shakeFrames(6), { duration: 360, easing: 'ease-out' });
  emit('buy', item.key);
};

/* ---------- 金币：数字滚动 ---------- */
const displayedGold = ref(Math.max(0, Math.floor(props.gold)));
let goldFrame: number | null = null;

watch(
  () => props.gold,
  (next, prev) => {
    const target = Math.max(0, Math.floor(next));
    if (goldFrame !== null) cancelAnimationFrame(goldFrame);
    if (reducedMotion || prev === undefined) {
      displayedGold.value = target;
      return;
    }
    const from = displayedGold.value;
    const start = performance.now();
    const duration = 650;
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      displayedGold.value = Math.round(from + (target - from) * eased);
      goldFrame = t < 1 ? requestAnimationFrame(step) : null;
    };
    goldFrame = requestAnimationFrame(step);
  },
);

/* ---------- 购买反馈：光球飞入金币栏 ---------- */
interface Flyer {
  id: number;
  src: string;
  dx: number;
  dy: number;
  cost: number;
  style: Record<string, string>;
  started: boolean;
}

const flyers = ref<Flyer[]>([]);
const costFloat = ref<{ id: number; amount: number } | null>(null);
let flyerSeq = 0;
let costTimer: ReturnType<typeof setTimeout> | null = null;

/** 屏幕坐标 → 组件内布局坐标（整个界面可能被缩放） */
const toLocalRect = (el: Element) => {
  const root = rootEl.value;
  if (!root) return null;
  const rootRect = root.getBoundingClientRect();
  const scale = root.offsetWidth > 0 ? rootRect.width / root.offsetWidth : 1;
  const rect = el.getBoundingClientRect();
  return {
    x: (rect.left - rootRect.left) / scale,
    y: (rect.top - rootRect.top) / scale,
    w: rect.width / scale,
    h: rect.height / scale,
  };
};

const pulseGold = (amount: number) => {
  play(goldEl.value, [{ transform: 'scale(1)' }, { transform: 'scale(1.08)' }, { transform: 'scale(1)' }], {
    duration: 380,
    easing: 'ease-out',
  });
  if (amount <= 0) return;
  flyerSeq += 1;
  costFloat.value = { id: flyerSeq, amount };
  if (costTimer) clearTimeout(costTimer);
  costTimer = setTimeout(() => {
    costFloat.value = null;
    costTimer = null;
  }, 900);
};

const launchFlyer = (item: ShopSceneProduct) => {
  const orb = rootEl.value?.querySelector(`[data-key="${CSS.escape(item.key)}"] .shop-good__orb`);
  const target = goldEl.value?.querySelector('img');
  const from = orb ? toLocalRect(orb) : null;
  const to = target ? toLocalRect(target) : null;
  if (!from || !to || reducedMotion) {
    pulseGold(item.finalPrice);
    return;
  }
  flyerSeq += 1;
  flyers.value.push({
    id: flyerSeq,
    src: getRelicOrbUrl(item.relic.rarity),
    dx: to.x + to.w / 2 - (from.x + from.w / 2),
    dy: to.y + to.h / 2 - (from.y + from.h / 2),
    cost: item.finalPrice,
    style: { left: `${from.x}px`, top: `${from.y}px`, width: `${from.w}px`, height: `${from.h}px` },
    started: false,
  });
};

const bindFlyer = (el: unknown, flyer: Flyer) => {
  if (!(el instanceof HTMLElement) || flyer.started) return;
  flyer.started = true;
  const animation = el.animate(
    [
      { transform: 'translate(0, 0) scale(1)', opacity: 1 },
      { transform: `translate(${flyer.dx * 0.45}px, ${flyer.dy * 0.45 - 90}px) scale(0.75)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${flyer.dx}px, ${flyer.dy}px) scale(0.25)`, opacity: 0.15 },
    ],
    { duration: 760, easing: 'cubic-bezier(0.45, 0, 0.55, 1)', fill: 'forwards' },
  );
  animation.onfinish = () => {
    flyers.value = flyers.value.filter(f => f.id !== flyer.id);
    pulseGold(flyer.cost);
  };
};

const soldState = computed(() => props.products.map(item => `${item.key}:${item.sold ? 1 : 0}`).join('|'));
watch(soldState, (_next, prev) => {
  if (!prev) return;
  const before = new Map(prev.split('|').map(entry => [entry.slice(0, entry.lastIndexOf(':')), entry.endsWith(':1')]));
  for (const item of props.products) {
    if (item.sold && before.get(item.key) === false) {
      launchFlyer(item);
      // 盖章动画：仅在刚售出时播放
      void nextTick(() => {
        const stamp = rootEl.value?.querySelector(`[data-key="${CSS.escape(item.key)}"] .shop-good__stamp`);
        play(
          stamp,
          [
            { transform: 'rotate(-14deg) scale(1.8)', opacity: 0 },
            { transform: 'rotate(-14deg) scale(0.92)', opacity: 1, offset: 0.7 },
            { transform: 'rotate(-14deg) scale(1)', opacity: 1 },
          ],
          { duration: 360, delay: 380, easing: 'cubic-bezier(0.3, 0.7, 0.4, 1)', fill: 'backwards' },
        );
      });
    }
  }
});

/* ---------- 抢夺：紧张度 ---------- */
const robFlashKey = ref(0);
const threat = computed(() => (props.robbing ? 1 : Math.min(ROB_STEPS, Math.max(0, props.robClickCount)) / ROB_STEPS));

watch(
  () => props.robClickCount,
  (next, prev) => {
    if (next <= (prev ?? 0)) return;
    play(dialogueEl.value, shakeFrames(3 + next * 1.4), { duration: 380, easing: 'ease-out' });
    if (next >= 3) play(stageEl.value, shakeFrames(next - 1), { duration: 320, easing: 'ease-out' });
  },
);

watch(
  () => props.robbing,
  robbing => {
    if (!robbing) return;
    robFlashKey.value += 1;
    play(stageEl.value, shakeFrames(10), { duration: 520, easing: 'ease-out' });
  },
);

onBeforeUnmount(() => {
  if (goldFrame !== null) cancelAnimationFrame(goldFrame);
  if (costTimer) clearTimeout(costTimer);
});
</script>

<style scoped>
/* 设计基准：1920×1080 舞台内的像素值（界面整体等比缩放）；紧凑竖屏另见文末 */
.shop-scene {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #05030a;
  color: var(--dg-text);
  user-select: none;
}

.shop-scene__stage {
  position: absolute;
  inset: 0;
}

.shop-scene__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}

.shop-scene__shade {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(90deg, rgba(4, 3, 6, 0.42), transparent 28%, transparent 48%, rgba(4, 3, 6, 0.38) 62%),
    linear-gradient(180deg, rgba(4, 3, 6, 0.3), transparent 18%, transparent 78%, rgba(4, 3, 6, 0.45));
  pointer-events: none;
}

/* 抢夺紧张度：红色暗角随点击加深 */
.shop-scene__threat {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 75% 70% at 38% 50%, transparent 35%, rgba(120, 0, 14, 0.55) 78%, rgba(40, 0, 4, 0.9));
  opacity: calc(var(--threat, 0) * 0.75);
  pointer-events: none;
  transition: opacity 0.6s ease;
}

.shop-scene.is-robbing .shop-scene__threat {
  animation: shop-threat-pulse 0.9s ease-in-out infinite;
}

.shop-scene__flash {
  position: absolute;
  inset: 0;
  z-index: 8;
  background: radial-gradient(ellipse at 40% 50%, rgba(255, 90, 80, 0.55), rgba(140, 0, 16, 0.45) 60%, rgba(30, 0, 4, 0.7));
  mix-blend-mode: screen;
  pointer-events: none;
  animation: shop-flash 0.9s ease-out both;
}

/* ---------- 店名 ---------- */
.shop-brand {
  position: absolute;
  z-index: 2;
  top: 4.2%;
  left: 2.2%;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.shop-brand__plate {
  margin: 0;
  height: 72px;
  display: inline-flex;
  align-items: center;
  padding: 0 22px;
  border-style: solid;
  border-width: 0 54px;
  border-image-source: var(--dg-img-plate);
  border-image-slice: 0 66 0 67 fill;
  border-image-repeat: stretch;
  color: var(--dg-gold-bright);
  font: 400 40px/1 var(--dg-font-title);
  letter-spacing: 0.2em;
  text-indent: 0.2em;
  text-shadow: 0 2px 0 rgba(0, 0, 0, 0.9), 0 0 16px rgba(232, 170, 70, 0.35);
}

.shop-brand__owner {
  margin-left: 58px;
  color: var(--dg-text-muted);
  font: 18px/1.2 var(--dg-font-title);
  letter-spacing: 0.24em;
  text-shadow: 0 1px 4px #000;
}

/* ---------- 交易守则：羊皮纸告示 ---------- */
.shop-notice {
  position: absolute;
  z-index: 2;
  top: 20%;
  left: 2.6%;
  width: 250px;
  padding: 18px 22px 20px;
  background: var(--dg-bg-parchment);
  color: #3b2414;
  box-shadow:
    inset 0 0 0 1px rgba(110, 70, 30, 0.45),
    inset 0 0 26px rgba(90, 50, 18, 0.35),
    0 10px 24px rgba(0, 0, 0, 0.55);
}

.shop-notice::before {
  position: absolute;
  inset: 6px;
  border: 1px solid rgba(110, 70, 30, 0.35);
  pointer-events: none;
  content: '';
}

.shop-notice h3 {
  margin: 0 0 10px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(110, 70, 30, 0.4);
  color: #5a2e12;
  font: 600 22px/1.2 var(--dg-font-title);
  letter-spacing: 0.24em;
  text-align: center;
}

.shop-notice ul {
  display: grid;
  gap: 7px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.shop-notice li {
  position: relative;
  padding-left: 18px;
  font: 17px/1.4 var(--dg-font-serif);
}

.shop-notice li::before {
  position: absolute;
  top: 0.55em;
  left: 2px;
  width: 6px;
  height: 6px;
  background: #8a3b1c;
  transform: rotate(45deg);
  content: '';
}

/* ---------- 对白 ---------- */
.shop-dialogue {
  position: absolute;
  z-index: 3;
  left: 13%;
  bottom: 8%;
  width: 34%;
  min-height: 118px;
  padding: 34px 34px 20px;
  border-style: solid;
  border-width: 26px;
  border-image-source: var(--dg-img-frame);
  border-image-slice: 120;
  border-image-repeat: stretch;
  background: rgba(10, 7, 10, 0.78);
  background-clip: padding-box;
  box-shadow: 0 14px 30px rgba(0, 0, 0, 0.5);
}

.shop-dialogue__name {
  position: absolute;
  top: -46px;
  left: -6px;
  height: 46px;
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  border-style: solid;
  border-width: 0 34px;
  border-image-source: var(--dg-img-plate);
  border-image-slice: 0 66 0 67 fill;
  color: var(--dg-gold-bright);
  font: 22px/1 var(--dg-font-title);
  letter-spacing: 0.2em;
  text-indent: 0.2em;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.9);
}

.shop-dialogue p {
  margin: 0;
  color: var(--dg-text);
  font: 21px/1.65 var(--dg-font-serif);
  text-shadow: 0 1px 3px #000;
}

/* ---------- 金币 ---------- */
.shop-gold {
  position: absolute;
  z-index: 4;
  top: 2.4%;
  right: 3.2%;
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 170px;
  height: 56px;
  padding: 0 22px 0 10px;
  border: 1px solid rgba(201, 161, 96, 0.6);
  border-radius: 28px;
  background: linear-gradient(180deg, rgba(30, 20, 14, 0.92), rgba(10, 7, 9, 0.92));
  box-shadow: inset 0 1px 0 rgba(255, 220, 160, 0.12), 0 6px 16px rgba(0, 0, 0, 0.45);
  transform-origin: 50% 50%;
}

.shop-gold img {
  width: 44px;
  height: 44px;
  object-fit: contain;
}

.shop-gold__value {
  min-width: 3ch;
  margin-left: auto;
  color: var(--dg-gold-bright);
  font: 600 26px/1 var(--dg-font-data);
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.shop-gold__cost {
  position: absolute;
  top: 100%;
  right: 18px;
  margin-top: 6px;
  color: #ff8a7a;
  font: 600 22px/1 var(--dg-font-data);
  text-shadow: 0 1px 3px #000;
}

/* ---------- 货架面板 ---------- */
.shop-panel {
  position: absolute;
  z-index: 3;
  top: 9.5%;
  right: 2.4%;
  bottom: 3%;
  width: 47%;
  display: flex;
  flex-direction: column;
  padding: 6px 14px 4px;
  border-style: solid;
  border-width: 40px;
  border-image-source: var(--dg-img-frame);
  border-image-slice: 120;
  border-image-repeat: stretch;
  background: rgba(10, 7, 10, 0.82);
  background-clip: padding-box;
  box-shadow: 0 24px 50px rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(3px);
}

.shop-panel__head {
  display: flex;
  flex: none;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding-bottom: 12px;
  background: var(--dg-img-divider) center bottom / min(26rem, 70%) auto no-repeat;
}

.shop-panel__plate {
  margin: 0;
  height: 56px;
  display: inline-flex;
  align-items: center;
  padding: 0 18px;
  border-style: solid;
  border-width: 0 42px;
  border-image-source: var(--dg-img-plate);
  border-image-slice: 0 66 0 67 fill;
  color: var(--dg-gold-bright);
  font: 400 30px/1 var(--dg-font-title);
  letter-spacing: 0.3em;
  text-indent: 0.3em;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.9), 0 0 12px rgba(232, 170, 70, 0.3);
}

.shop-panel__sub {
  color: var(--dg-text-faint, #7d6d58);
  font: 13px/1.4 var(--dg-font-title);
  letter-spacing: 0.5em;
  text-indent: 0.5em;
}

/* 商品格：4 列 × 2 行，最多 8 件不滚动 */
.shop-goods {
  display: grid;
  flex: 1;
  min-height: 0;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  grid-auto-rows: minmax(0, 1fr);
  gap: 16px;
  margin-top: 16px;
  overflow-y: auto;
  padding: 4px;
}

.shop-good {
  --tone: 255, 180, 100;
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
  min-height: 0;
  padding: 12px 8px 14px;
  border: 1px solid rgba(201, 161, 96, 0.28);
  background:
    radial-gradient(ellipse 70% 55% at 50% 34%, rgba(var(--tone), 0.16), transparent 70%),
    linear-gradient(180deg, rgba(6, 4, 8, 0.75), rgba(16, 11, 12, 0.9));
  box-shadow:
    inset 0 2px 10px rgba(0, 0, 0, 0.75),
    inset 0 0 0 1px rgba(0, 0, 0, 0.4);
  color: var(--dg-text);
  cursor: pointer;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease,
    transform 0.2s ease,
    filter 0.2s ease;
}

.shop-good.is-rare {
  --tone: 186, 120, 255;
}

.shop-good.is-legendary {
  --tone: 255, 210, 110;
}

.shop-good:hover,
.shop-good:focus-visible {
  outline: none;
  border-color: rgba(232, 190, 110, 0.6);
  transform: translateY(-2px);
}

.shop-good.is-selected {
  border-color: rgba(255, 214, 140, 0.9);
  box-shadow:
    inset 0 2px 10px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(255, 214, 140, 0.35),
    0 0 18px rgba(var(--tone), 0.35);
}

.shop-good__orb {
  position: relative;
  display: grid;
  flex: none;
  width: 96px;
  height: 96px;
  place-items: center;
}

.shop-good__orb::before {
  position: absolute;
  inset: -14px;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(var(--tone), 0.45), transparent);
  content: '';
}

.shop-good__orb img {
  position: relative;
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.65));
  transition: transform 0.25s ease;
}

.shop-good:hover .shop-good__orb img,
.shop-good.is-selected .shop-good__orb img {
  transform: translateY(-3px) scale(1.05);
}

.shop-good__name {
  max-width: 100%;
  color: var(--dg-text-strong, #f3e6cc);
  font: 18px/1.25 var(--dg-font-title);
  text-align: center;
  overflow-wrap: anywhere;
}

.shop-good__meta {
  color: rgba(var(--tone), 0.85);
  font: 13px/1.2 var(--dg-font-ui);
  letter-spacing: 0.06em;
}

.shop-good__price,
.shop-detail__price {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  color: var(--dg-gold-bright);
  font: 600 19px/1 var(--dg-font-data);
}

.shop-good__price img,
.shop-detail__price img {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.shop-good__price s,
.shop-detail__price s {
  color: var(--dg-text-faint, #7d6d58);
  font-size: 0.78em;
  font-weight: 400;
}

/* 买不起：价格变红、整体压暗 */
.shop-good.is-short {
  filter: saturate(0.6) brightness(0.78);
}

.shop-good.is-short .shop-good__price b,
.shop-detail__price.is-short b {
  color: #ff7d6e;
}

/* 已售：光球熄灭 + 印章 */
.shop-good.is-sold {
  cursor: default;
}

.shop-good.is-sold .shop-good__orb img {
  filter: grayscale(1) brightness(0.45);
}

.shop-good.is-sold .shop-good__orb::before {
  opacity: 0;
}

.shop-good.is-sold .shop-good__name,
.shop-good.is-sold .shop-good__meta,
.shop-good.is-sold .shop-good__price {
  opacity: 0.45;
}

.shop-good__stamp {
  position: absolute;
  top: 26%;
  left: 50%;
  width: 92px;
  height: 92px;
  margin-left: -46px;
  display: grid;
  place-items: center;
  border: 3px double rgba(196, 52, 40, 0.85);
  border-radius: 50%;
  color: rgba(214, 62, 48, 0.92);
  font: 700 26px/1 var(--dg-font-title);
  letter-spacing: 0.1em;
  text-indent: 0.1em;
  transform: rotate(-14deg);
  box-shadow: inset 0 0 0 4px rgba(196, 52, 40, 0.2);
  pointer-events: none;
}

.shop-goods__empty {
  grid-column: 1 / -1;
  grid-row: 1 / -1;
  align-self: center;
  color: var(--dg-text-muted);
  font: 22px/1.5 var(--dg-font-serif);
  text-align: center;
}

/* ---------- 详情 ---------- */
.shop-detail {
  --tone: 255, 180, 100;
  position: relative;
  display: flex;
  flex: none;
  align-items: center;
  height: 150px;
  margin-top: 16px;
  padding: 14px 18px;
  border: 1px solid rgba(201, 161, 96, 0.3);
  background:
    radial-gradient(ellipse 30% 90% at 0% 50%, rgba(var(--tone), 0.14), transparent 70%),
    rgba(6, 4, 8, 0.7);
}

.shop-detail.is-rare {
  --tone: 186, 120, 255;
}

.shop-detail.is-legendary {
  --tone: 255, 210, 110;
}

.shop-detail__body {
  display: grid;
  grid-template-columns: 96px minmax(0, 1fr) auto;
  align-items: center;
  gap: 18px;
  width: 100%;
}

.shop-detail__orb {
  width: 96px;
  height: 96px;
  object-fit: contain;
  filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.6));
}

.shop-detail__copy {
  min-width: 0;
}

.shop-detail__name {
  color: var(--dg-gold-bright);
  font: 24px/1.2 var(--dg-font-title);
}

.shop-detail__meta {
  margin-top: 3px;
  color: rgba(var(--tone), 0.85);
  font: 14px/1.2 var(--dg-font-ui);
  letter-spacing: 0.06em;
}

.shop-detail__effect {
  display: -webkit-box;
  margin: 8px 0 0;
  overflow: hidden;
  color: var(--dg-text);
  font: 17px/1.5 var(--dg-font-serif);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
}

.shop-detail__action {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.shop-detail__hint {
  width: 100%;
  margin: 0;
  color: var(--dg-text-faint, #7d6d58);
  font: italic 18px/1.4 var(--dg-font-serif);
  letter-spacing: 0.12em;
  text-align: center;
}

.shop-buy,
.shop-exit {
  min-width: 170px;
  height: 58px;
  border-style: solid;
  border-width: 0 30px;
  border-image-source: var(--dg-img-button);
  border-image-slice: 0 80 fill;
  border-image-repeat: stretch;
  background: none;
  color: var(--dg-gold-bright);
  font: 22px/1 var(--dg-font-title);
  letter-spacing: 0.24em;
  text-indent: 0.24em;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.85);
  cursor: pointer;
  transition: filter 0.18s ease;
}

.shop-buy:hover:not(:disabled),
.shop-buy:focus-visible,
.shop-exit:hover:not(:disabled),
.shop-exit:focus-visible {
  outline: none;
  filter: brightness(1.15) drop-shadow(0 0 6px rgba(232, 170, 70, 0.35));
}

.shop-buy.is-short {
  color: #ffb0a4;
  filter: saturate(0.5) brightness(0.85);
}

.shop-buy:disabled,
.shop-exit:disabled {
  cursor: not-allowed;
  filter: grayscale(0.6) brightness(0.7);
}

/* ---------- 底栏 ---------- */
.shop-panel__foot {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  height: 92px;
  margin-top: 6px;
}

.shop-rob {
  display: flex;
  align-items: center;
  gap: 14px;
}

.shop-rob__btn {
  min-width: 132px;
  height: 52px;
  border: 1px solid rgba(160, 60, 50, calc(0.45 + var(--threat, 0) * 0.5));
  background:
    linear-gradient(180deg, rgba(90, 14, 14, calc(0.25 + var(--threat, 0) * 0.55)), rgba(30, 6, 8, 0.85));
  color: rgb(240, calc(200 - var(--threat, 0) * 110), calc(170 - var(--threat, 0) * 110));
  font: 22px/1 var(--dg-font-title);
  letter-spacing: 0.3em;
  text-indent: 0.3em;
  box-shadow: 0 0 calc(var(--threat, 0) * 18px) rgba(220, 30, 30, calc(var(--threat, 0) * 0.55));
  cursor: pointer;
  transition:
    filter 0.18s ease,
    box-shadow 0.4s ease,
    background 0.4s ease;
}

.shop-rob__btn:hover:not(:disabled),
.shop-rob__btn:focus-visible {
  outline: none;
  filter: brightness(1.2);
}

.shop-rob__btn.is-final {
  animation: shop-rob-pulse 1.1s ease-in-out infinite;
}

.shop-rob__btn:disabled {
  cursor: not-allowed;
  filter: grayscale(0.5) brightness(0.7);
}

.shop-rob__pips {
  display: flex;
  gap: 7px;
}

.shop-rob__pips i {
  width: 9px;
  height: 9px;
  border: 1px solid rgba(200, 70, 60, 0.7);
  transform: rotate(45deg);
  transition:
    background 0.3s ease,
    box-shadow 0.3s ease;
}

.shop-rob__pips i.is-on {
  background: #e0392c;
  box-shadow: 0 0 8px rgba(255, 60, 40, 0.8);
}

.shop-exit {
  margin-left: auto;
  min-width: 200px;
}

/* ---------- 飞行光球 ---------- */
.shop-flyer {
  position: absolute;
  z-index: 9;
  pointer-events: none;
}

.shop-flyer img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 0 10px rgba(255, 210, 120, 0.7));
}

/* ---------- 过渡 ---------- */
.shop-line-enter-active,
.shop-line-leave-active {
  transition:
    opacity 0.22s ease,
    transform 0.22s ease;
}

.shop-line-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.shop-line-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.shop-cost-enter-active {
  transition:
    opacity 0.2s ease,
    transform 0.2s ease;
}

.shop-cost-leave-active {
  transition:
    opacity 0.5s ease,
    transform 0.5s ease;
}

.shop-cost-enter-from {
  opacity: 0;
  transform: translateY(-6px);
}

.shop-cost-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

@keyframes shop-threat-pulse {
  0%,
  100% {
    opacity: 0.85;
  }
  50% {
    opacity: 1;
  }
}

@keyframes shop-flash {
  0% {
    opacity: 0;
  }
  20% {
    opacity: 1;
  }
  100% {
    opacity: 0.35;
  }
}

@keyframes shop-rob-pulse {
  0%,
  100% {
    box-shadow: 0 0 12px rgba(220, 30, 30, 0.45);
  }
  50% {
    box-shadow: 0 0 24px rgba(255, 50, 40, 0.85);
  }
}

/* ---------- 紧凑竖屏（真实像素，不缩放） ---------- */
.shop-scene.is-compact .shop-brand {
  top: 10px;
  left: 3%;
  gap: 2px;
}

.shop-scene.is-compact .shop-brand__plate {
  height: 36px;
  padding: 0 8px;
  border-width: 0 26px;
  font-size: 18px;
}

.shop-scene.is-compact .shop-brand__owner {
  margin-left: 28px;
  font-size: 11px;
}

.shop-scene.is-compact .shop-gold {
  top: 12px;
  right: 3%;
  min-width: 96px;
  height: 36px;
  gap: 6px;
  padding: 0 12px 0 4px;
}

.shop-scene.is-compact .shop-gold img {
  width: 28px;
  height: 28px;
}

.shop-scene.is-compact .shop-gold__value {
  font-size: 16px;
}

.shop-scene.is-compact .shop-gold__cost {
  font-size: 14px;
}

.shop-scene.is-compact .shop-notice {
  top: 72px;
  left: 3%;
  width: 94%;
  padding: 6px 10px 8px;
}

.shop-scene.is-compact .shop-notice::before {
  inset: 3px;
}

.shop-scene.is-compact .shop-notice h3 {
  display: none;
}

.shop-scene.is-compact .shop-notice ul {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 14px;
}

.shop-scene.is-compact .shop-notice li {
  padding-left: 11px;
  font-size: 11px;
}

.shop-scene.is-compact .shop-notice li::before {
  width: 4px;
  height: 4px;
}

.shop-scene.is-compact .shop-dialogue {
  top: 152px;
  bottom: auto;
  left: 3%;
  width: 94%;
  min-height: 0;
  padding: 14px 10px 6px;
  border-width: 14px;
}

.shop-scene.is-compact .shop-dialogue__name {
  top: -28px;
  height: 28px;
  padding: 0 4px;
  border-width: 0 20px;
  font-size: 13px;
}

.shop-scene.is-compact .shop-dialogue p {
  font-size: 12px;
  line-height: 1.45;
}

.shop-scene.is-compact .shop-panel {
  top: 236px;
  right: 3%;
  bottom: 10px;
  width: 94%;
  padding: 2px 4px 2px;
  border-width: 18px;
}

.shop-scene.is-compact .shop-panel__head {
  padding-bottom: 6px;
}

.shop-scene.is-compact .shop-panel__plate {
  height: 30px;
  padding: 0 6px;
  border-width: 0 22px;
  font-size: 15px;
}

.shop-scene.is-compact .shop-panel__sub {
  display: none;
}

.shop-scene.is-compact .shop-goods {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  grid-template-rows: none;
  grid-auto-rows: minmax(104px, auto);
  align-content: start;
  gap: 6px;
  margin-top: 6px;
  padding: 2px;
}

.shop-scene.is-compact .shop-good {
  gap: 2px;
  padding: 6px 3px 6px;
}

.shop-scene.is-compact .shop-good__orb {
  width: 44px;
  height: 44px;
}

.shop-scene.is-compact .shop-good__orb::before {
  inset: -8px;
}

.shop-scene.is-compact .shop-good__name {
  font-size: 11px;
}

.shop-scene.is-compact .shop-good__meta {
  display: none;
}

.shop-scene.is-compact .shop-good__price {
  margin-top: 0;
  gap: 3px;
  font-size: 12px;
}

.shop-scene.is-compact .shop-good__price img {
  width: 14px;
  height: 14px;
}

.shop-scene.is-compact .shop-good__stamp {
  top: 8%;
  width: 46px;
  height: 46px;
  margin-left: -23px;
  border-width: 2px;
  font-size: 13px;
}

.shop-scene.is-compact .shop-detail {
  height: 96px;
  margin-top: 6px;
  padding: 6px 8px;
}

.shop-scene.is-compact .shop-detail__body {
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
}

.shop-scene.is-compact .shop-detail__orb {
  display: none;
}

.shop-scene.is-compact .shop-detail__name {
  font-size: 14px;
}

.shop-scene.is-compact .shop-detail__meta {
  font-size: 10px;
}

.shop-scene.is-compact .shop-detail__effect {
  margin-top: 3px;
  font-size: 11px;
  line-height: 1.4;
}

.shop-scene.is-compact .shop-detail__action {
  gap: 4px;
}

.shop-scene.is-compact .shop-detail__price {
  margin-top: 0;
  font-size: 13px;
}

.shop-scene.is-compact .shop-detail__price img {
  width: 14px;
  height: 14px;
}

.shop-scene.is-compact .shop-detail__hint {
  font-size: 12px;
}

.shop-scene.is-compact .shop-buy,
.shop-scene.is-compact .shop-exit {
  min-width: 84px;
  height: 32px;
  border-width: 0 16px;
  font-size: 13px;
}

.shop-scene.is-compact .shop-panel__foot {
  height: 46px;
  margin-top: 4px;
  gap: 8px;
}

.shop-scene.is-compact .shop-rob {
  gap: 6px;
}

.shop-scene.is-compact .shop-rob__btn {
  min-width: 70px;
  height: 30px;
  font-size: 13px;
}

.shop-scene.is-compact .shop-rob__pips {
  gap: 4px;
}

.shop-scene.is-compact .shop-rob__pips i {
  width: 6px;
  height: 6px;
}

@media (prefers-reduced-motion: reduce) {
  .shop-scene *,
  .shop-scene *::before,
  .shop-scene *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
  }
}
</style>
