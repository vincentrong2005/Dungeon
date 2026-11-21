<template>
  <div class="dg-minigame divination-minigame">
    <div class="dg-skin-panel dg-minigame__panel">
      <header class="dg-minigame__header">
        <div class="dg-skin-title">占卜</div>
        <span class="dg-skin-divider" aria-hidden="true"></span>
        <div class="dg-skin-hint mt-1">凝视星象，探寻命运的指引</div>
      </header>

      <div class="dg-minigame__body">
        <div class="divination-layout">
          <!-- 左：嵌在魔法阵中的水晶格盘 -->
          <div class="divination-stage">
            <img class="divination-circle" :src="circleUrl" alt="" aria-hidden="true" />
            <div
              class="divination-grid"
              :class="{ 'is-finished': finished }"
              :style="gridStyle"
              @mouseleave="hoverCell = null"
            >
              <!-- 底层：格子底色 -->
              <span
                v-for="cell in CELLS"
                :key="`floor-${cell.key}`"
                class="divination-floor"
                :style="{ gridColumn: cell.x + 1, gridRow: cell.y + 1 }"
                aria-hidden="true"
              ></span>
              <!-- 中层：奖励图，藏在封印格下面，揭开哪格就露出哪一部分 -->
              <div
                v-for="item in state.items"
                :key="`item-${item.id}`"
                class="divination-item"
                :class="[
                  itemToneClass(item),
                  { 'is-complete': completedIds.has(item.id), 'is-static': initiallyCompletedIds.has(item.id) },
                ]"
                :style="{ gridColumn: `${item.x + 1} / span ${item.w}`, gridRow: `${item.y + 1} / span ${item.h}` }"
                aria-hidden="true"
              >
                <img :src="iconUrl(getDivinationItemIcon(item))" alt="" />
              </div>
              <!-- 顶层：封印格 -->
              <button
                v-for="cell in CELLS"
                :key="`cell-${cell.key}`"
                type="button"
                class="crystal-cell"
                :class="cellClass(cell)"
                :style="cellStyle(cell)"
                :disabled="finished || state.usesLeft <= 0 || revealedSet.has(cell.key)"
                :aria-label="`第 ${cell.y + 1} 行第 ${cell.x + 1} 列`"
                @mouseenter="hoverCell = [cell.x, cell.y]"
                @focus="hoverCell = [cell.x, cell.y]"
                @click="reveal(cell.x, cell.y)"
              ></button>
            </div>
          </div>

          <!-- 右：次数 / 方式 / 奖励说明 / 已揭开 -->
          <aside class="divination-side">
            <section class="dg-minigame__block">
              <div class="dg-minigame__block-title">剩余占卜次数</div>
              <div class="divination-uses">
                <span class="divination-uses__count">{{ state.usesLeft }}</span>
                <span class="divination-uses__pips" aria-hidden="true">
                  <img v-for="n in totalUses" :key="`pip-${n}`" :src="amethystUrl" alt="" :class="{ 'is-spent': n > state.usesLeft }" />
                </span>
              </div>
            </section>

            <section class="dg-minigame__block">
              <div class="dg-minigame__block-title">占卜方式</div>
              <div class="divination-modes">
                <button
                  v-for="option in SIZE_OPTIONS"
                  :key="option.size"
                  type="button"
                  class="divination-mode"
                  :class="{ 'is-active': revealSize === option.size }"
                  :disabled="finished"
                  @click="revealSize = option.size"
                >
                  <span class="divination-mode__glyph" :class="{ 'divination-mode__glyph--3': option.size === 3 }" aria-hidden="true"></span>
                  <span class="divination-mode__name">{{ option.label }}</span>
                  <span class="divination-mode__desc">{{ option.desc }}</span>
                </button>
              </div>
            </section>

            <section class="dg-minigame__block">
              <div class="dg-minigame__block-title">水晶球中藏着</div>
              <ul class="divination-legend">
                <li v-for="entry in LEGEND" :key="entry.label">
                  <img :src="iconUrl(entry.icon)" alt="" aria-hidden="true" />
                  <span class="divination-legend__label">{{ entry.label }}</span>
                  <span class="divination-legend__size">{{ entry.size }}</span>
                </li>
              </ul>
              <div class="divination-note">物品要被完全揭开，结束占卜时才归你所有；诅咒一旦完全揭开就必须拿。</div>
            </section>

            <section class="dg-minigame__block">
              <div class="dg-minigame__block-title">已完全揭开</div>
              <ul v-if="completedItems.length > 0" class="divination-found">
                <li v-for="item in completedItems" :key="`found-${item.id}`" :class="{ 'is-curse': item.cardRarity === '诅咒' }">
                  <img :src="iconUrl(getDivinationItemIcon(item))" alt="" aria-hidden="true" />
                  {{ describeDivinationItem(item) }}
                </li>
              </ul>
              <div v-else class="divination-found__empty">尚未完整揭开任何物品。</div>
            </section>
          </aside>
        </div>
      </div>

      <footer class="dg-minigame__footer">
        <button type="button" class="dg-skin-btn dg-minigame__cta" :disabled="finished || busy" @click="finish">
          {{ state.usesLeft > 0 ? '结束占卜并离开' : '结束占卜，领取所得' }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { minigameArtUrl, minigameIconUrl, type MinigameIconKey } from '../../events/minigameAssets';
import {
  DIVINATION_GRID_SIZE,
  cellKey,
  describeDivinationItem,
  getDivinationItemIcon,
  isDivinationCell,
  isDivinationItemRevealed,
  revealDivinationArea,
  type DivinationItem,
  type DivinationState,
} from '../../events/minigames';

const props = defineProps<{
  state: DivinationState;
  busy?: boolean;
}>();

const emit = defineEmits<{
  update: [state: DivinationState];
  finish: [items: DivinationItem[]];
}>();

type GridCell = { x: number; y: number; key: string };

/** 八角格盘上的全部有效格子（四角切掉的格子不渲染） */
const CELLS: GridCell[] = Array.from({ length: DIVINATION_GRID_SIZE * DIVINATION_GRID_SIZE }, (_, index) => ({
  x: index % DIVINATION_GRID_SIZE,
  y: Math.floor(index / DIVINATION_GRID_SIZE),
  key: cellKey(index % DIVINATION_GRID_SIZE, Math.floor(index / DIVINATION_GRID_SIZE)),
})).filter(cell => isDivinationCell(cell.x, cell.y));

const SIZE_OPTIONS = [
  { size: 3 as const, label: '星辉占卜', desc: '揭开 3×3' },
  { size: 1 as const, label: '精准占卜', desc: '揭开 1×1' },
];
const LEGEND: Array<{ icon: MinigameIconKey; label: string; size: string }> = [
  { icon: 'crown', label: '大奖 · 稀有圣遗物', size: '4×4' },
  { icon: 'cardBack', label: '卡牌奖励（2 普通 · 1 稀有）', size: '2×2' },
  { icon: 'curseCard', label: '诅咒牌', size: '2×2' },
  { icon: 'coins', label: '大金币 ×3', size: '1×2' },
  { icon: 'coin', label: '小金币 ×6', size: '1×1' },
];

const iconUrl = (key: MinigameIconKey) => minigameIconUrl(key);
const circleUrl = minigameArtUrl('magicCircle');
const tileUrl = minigameArtUrl('sealedTile');
/** 封印格贴图交给 CSS 变量，翻开动画的伪元素也要用到 */
const gridStyle = { '--tile': `url("${tileUrl}")` };
const amethystUrl = minigameIconUrl('amethyst');

const revealSize = ref<1 | 3>(3);
const hoverCell = ref<[number, number] | null>(null);
/** 本次揭开的格子各自的翻开延迟（由点击中心向外依次翻开） */
const flipDelays = ref(new Map<string, number>());
/** 进入界面时已揭开的格子 / 已完整的物品不再播放动画 */
const initiallyRevealed = new Set(props.state.revealed);
const initiallyCompletedIds = new Set(
  props.state.items.filter(item => isDivinationItemRevealed(item, initiallyRevealed)).map(item => item.id),
);
const totalUses = computed(() => Math.max(props.state.totalUses, props.state.usesLeft));

const finished = computed(() => props.state.finished);
const revealedSet = computed(() => new Set(props.state.revealed));
const completedItems = computed(() => props.state.items.filter(item => isDivinationItemRevealed(item, revealedSet.value)));
const completedIds = computed(() => new Set(completedItems.value.map(item => item.id)));

const ITEM_TONE_CLASS = {
  jackpot: 'divination-item--jackpot',
  card: 'divination-item--card',
  curse: 'divination-item--curse',
  gold: 'divination-item--gold',
} as const;
const itemTone = (item: DivinationItem): keyof typeof ITEM_TONE_CLASS =>
  item.kind === 'jackpot' ? 'jackpot' : item.kind === 'card' ? (item.cardRarity === '诅咒' ? 'curse' : 'card') : 'gold';
const itemToneClass = (item: DivinationItem) => ITEM_TONE_CLASS[itemTone(item)];

const inHoverArea = (x: number, y: number) => {
  const hover = hoverCell.value;
  if (!hover || finished.value || props.state.usesLeft <= 0) return false;
  const radius = revealSize.value === 3 ? 1 : 0;
  return Math.abs(x - hover[0]) <= radius && Math.abs(y - hover[1]) <= radius;
};

const cellClass = (cell: GridCell) => {
  const revealed = revealedSet.value.has(cell.key);
  return {
    'is-sealed': !revealed,
    'is-revealed': revealed,
    'is-fresh': revealed && !initiallyRevealed.has(cell.key),
    'is-hover': !revealed && inHoverArea(cell.x, cell.y),
  };
};

const cellStyle = (cell: GridCell) => ({
  // 显式定位：物品层也占用网格区域，格子若自动排布会被挤到错误的位置
  gridColumn: cell.x + 1,
  gridRow: cell.y + 1,
  '--flip-delay': `${flipDelays.value.get(cell.key) ?? 0}ms`,
});

const reveal = (x: number, y: number) => {
  if (finished.value || props.busy || props.state.usesLeft <= 0 || !isDivinationCell(x, y)) return;
  const revealed = revealDivinationArea(props.state.revealed, x, y, revealSize.value);
  if (revealed.length === props.state.revealed.length) return;
  const delays = new Map(flipDelays.value);
  for (const key of revealed) {
    if (revealedSet.value.has(key)) continue;
    const [cx, cy] = key.split(',').map(Number) as [number, number];
    delays.set(key, Math.max(Math.abs(cx - x), Math.abs(cy - y)) * 70);
  }
  flipDelays.value = delays;
  emit('update', { ...props.state, revealed, usesLeft: props.state.usesLeft - 1 });
};

const finish = () => {
  if (finished.value || props.busy) return;
  emit('finish', completedItems.value);
};
</script>

<style scoped>
.divination-minigame {
  --dg-minigame-glow: rgba(90, 40, 150, 0.45);
}

/* 魔法阵按主体高度铺满，右侧信息栏 */
.divination-layout {
  --side-width: clamp(17rem, 30cqw, 27rem);
  --stage-size: min(100cqh, calc(100cqw - var(--side-width) - 2.4rem));
  display: grid;
  height: 100%;
  align-items: center;
  justify-content: center;
  gap: 2.4rem;
  grid-template-columns: var(--stage-size) var(--side-width);
}

@media (max-width: 760px) {
  .divination-layout {
    --stage-size: min(92cqw, 30rem);
    height: auto;
    grid-template-columns: var(--stage-size);
  }
}

/* ── 魔法阵 + 格盘 ── */
.divination-stage {
  position: relative;
  width: var(--stage-size);
  height: var(--stage-size);
}

.divination-circle {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 24px rgba(150, 80, 240, 0.35));
  pointer-events: none;
}

.divination-grid {
  position: absolute;
  top: 50%;
  left: 50%;
  display: grid;
  /* 八角格盘最远的角距中心约 6.04 格，魔法阵内圈半径约为直径的 0.31，55% 刚好收进内圈 */
  width: 55%;
  height: 55%;
  grid-template-columns: repeat(11, minmax(0, 1fr));
  grid-template-rows: repeat(11, minmax(0, 1fr));
  transform: translate(-50%, -50%);
}

.divination-floor {
  z-index: 0;
  background: radial-gradient(circle, rgba(22, 12, 34, 0.92), rgba(5, 2, 9, 0.96));
}

/* 奖励图：只露出已揭开的部分；完整揭开后才亮起边框 */
.divination-item {
  --item-glow: rgba(255, 214, 130, 0.8);
  --item-scale: 0.94;
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 3px;
  pointer-events: none;
}

.divination-item img {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 4px rgba(0, 0, 0, 0.6));
  object-fit: contain;
  transform: scale(var(--item-scale));
}

.divination-item--jackpot {
  --item-glow: rgba(255, 200, 90, 0.9);
  --item-scale: 0.8;
}

.divination-item--card {
  --item-glow: rgba(140, 170, 255, 0.85);
}

.divination-item--curse {
  --item-glow: rgba(235, 120, 255, 0.85);
}

.divination-item.is-complete {
  z-index: 3;
  box-shadow:
    0 0 0 1px var(--item-glow),
    0 0 12px var(--item-glow),
    inset 0 0 12px rgba(0, 0, 0, 0.5);
  animation: item-complete 0.6s ease-out 0.35s both;
}

.divination-item.is-complete img {
  filter: drop-shadow(0 0 6px var(--item-glow));
}

.divination-item.is-static {
  animation: none;
}

@keyframes item-complete {
  0% {
    box-shadow: 0 0 0 1px transparent, 0 0 0 transparent, inset 0 0 12px rgba(0, 0, 0, 0.5);
  }
  45% {
    box-shadow: 0 0 0 2px var(--item-glow), 0 0 26px var(--item-glow), inset 0 0 12px rgba(0, 0, 0, 0.5);
  }
  100% {
    box-shadow: 0 0 0 1px var(--item-glow), 0 0 12px var(--item-glow), inset 0 0 12px rgba(0, 0, 0, 0.5);
  }
}

/* 封印格 */
.crystal-cell {
  position: relative;
  z-index: 2;
  background: transparent;
  transition: filter 0.15s ease;
}

.crystal-cell.is-sealed {
  background: var(--tile) center / cover;
  box-shadow:
    inset 0 0 0 1px rgba(196, 160, 255, 0.3),
    inset 0 1px 0 rgba(255, 240, 255, 0.08),
    inset 0 0 6px rgba(0, 0, 0, 0.5);
  cursor: pointer;
}

.crystal-cell.is-sealed:hover:not(:disabled),
.crystal-cell.is-hover {
  filter: brightness(1.7) saturate(1.2);
  box-shadow:
    inset 0 0 0 1px rgba(230, 210, 255, 0.75),
    0 0 6px rgba(190, 140, 255, 0.6);
}

.crystal-cell.is-revealed {
  box-shadow: inset 0 0 0 1px rgba(150, 120, 200, 0.1);
  cursor: default;
}

/* 翻开动画：封印格本体沿 Y 轴翻走，露出下面的奖励图 */
.crystal-cell.is-fresh::before {
  position: absolute;
  inset: 0;
  background: var(--tile) center / cover;
  animation: crystal-flip-away 0.45s ease-in var(--flip-delay, 0ms) both;
  content: '';
  pointer-events: none;
}

@keyframes crystal-flip-away {
  0% {
    filter: brightness(1);
    opacity: 1;
    transform: perspective(200px) rotateY(0deg);
  }
  45% {
    filter: brightness(2.3);
  }
  100% {
    filter: brightness(2.3);
    opacity: 0;
    transform: perspective(200px) rotateY(90deg);
  }
}

.divination-grid.is-finished .crystal-cell.is-sealed {
  filter: grayscale(0.5) brightness(0.6);
}

/* ── 右侧操作区 ── */
.divination-side {
  display: flex;
  max-height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 0.6rem;
}

.divination-uses {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.divination-uses__count {
  color: #e9d8ff;
  font-family: var(--dg-font-data);
  font-size: 2rem;
  line-height: 1;
  text-shadow: 0 0 10px rgba(180, 120, 255, 0.7);
}

.divination-uses__pips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.1rem;
}

.divination-uses__pips img {
  width: 1.5rem;
  height: 1.5rem;
  transition: opacity 0.3s ease, filter 0.3s ease;
}

.divination-uses__pips img.is-spent {
  opacity: 0.3;
  filter: grayscale(1);
}

.divination-modes {
  display: grid;
  gap: 0.5rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.divination-mode {
  display: grid;
  align-items: center;
  column-gap: 0.55rem;
  grid-template-columns: auto 1fr;
  grid-template-rows: auto auto;
  padding: 0.45rem 0.6rem;
  border: 1px solid rgba(160, 120, 220, 0.35);
  background: rgba(20, 12, 30, 0.7);
  text-align: left;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.divination-mode.is-active {
  border-color: rgba(220, 190, 255, 0.85);
  box-shadow: 0 0 14px rgba(170, 110, 255, 0.4);
}

.divination-mode__glyph {
  display: grid;
  width: 1.6rem;
  height: 1.6rem;
  grid-row: span 2;
  border: 1px solid rgba(200, 170, 255, 0.5);
  background: linear-gradient(rgba(200, 170, 255, 0.85), rgba(200, 170, 255, 0.85)) center / 30% 30% no-repeat;
}

.divination-mode__glyph--3 {
  background:
    repeating-linear-gradient(90deg, rgba(200, 170, 255, 0.75) 0 28%, transparent 28% 36%),
    rgba(0, 0, 0, 0.2);
  -webkit-mask: repeating-linear-gradient(0deg, #000 0 28%, transparent 28% 36%);
  mask: repeating-linear-gradient(0deg, #000 0 28%, transparent 28% 36%);
}

.divination-mode__name {
  color: #ecdcff;
  font-family: var(--dg-font-title);
  font-size: 0.92rem;
}

.divination-mode__desc {
  color: var(--dg-text-muted);
  font-size: 0.75rem;
}

.divination-legend {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.divination-legend li {
  display: grid;
  align-items: center;
  column-gap: 0.5rem;
  grid-template-columns: 1.7rem 1fr auto;
  color: var(--dg-text);
  font-size: 0.84rem;
}

.divination-legend img {
  width: 1.7rem;
  height: 1.7rem;
  object-fit: contain;
}

.divination-legend__size {
  color: var(--dg-text-faint);
  font-family: var(--dg-font-data);
  font-size: 0.78rem;
}

.divination-note {
  margin-top: 0.4rem;
  color: var(--dg-text-muted);
  font-size: 0.75rem;
  line-height: 1.5;
}

.divination-found {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.7rem;
}

.divination-found li {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  color: var(--dg-gold-bright);
  font-size: 0.82rem;
}

.divination-found li.is-curse {
  color: #f0b9f5;
}

.divination-found img {
  width: 1.5rem;
  height: 1.5rem;
  object-fit: contain;
}

.divination-found__empty {
  color: var(--dg-text-faint);
  font-size: 0.8rem;
}

/* 主体较矮时压缩右栏间距与字号，保证一屏放下 */
@container (max-height: 36rem) {
  .divination-side {
    gap: 0.4rem;
  }

  .divination-side .dg-minigame__block {
    padding: 0.4rem 0.7rem;
  }

  .divination-side .dg-minigame__block-title {
    margin-bottom: 0.25rem;
    font-size: 0.85rem;
  }

  .divination-uses__count {
    font-size: 1.6rem;
  }

  .divination-legend li {
    font-size: 0.78rem;
  }

  .divination-legend img {
    width: 1.4rem;
    height: 1.4rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .crystal-cell.is-fresh::before,
  .divination-item.is-complete {
    animation: none;
  }

  .crystal-cell.is-fresh::before {
    opacity: 0;
  }
}
</style>
