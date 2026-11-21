<template>
  <div class="dg-minigame wheel-minigame">
    <div class="dg-skin-panel dg-minigame__panel">
      <header class="dg-minigame__header">
        <div class="dg-skin-title">命运转盘</div>
        <span class="dg-skin-divider" aria-hidden="true"></span>
        <div class="dg-skin-hint mt-1">每次 {{ spinCost }} 金币 · 金色扇区是本层头奖，抽中后转盘打烊</div>
        <div class="dg-minigame__gold" :title="`当前金币 ${gold}`">
          <img :src="coinIcon" alt="" aria-hidden="true" />
          <span>{{ gold }}</span>
        </div>
      </header>

      <div class="dg-minigame__body">
        <div class="wheel-layout">
          <!-- 左：转盘 -->
          <div class="wheel-stage" :class="{ 'is-closed': closed }">
            <div class="wheel-disc" :style="discStyle">
              <span
                v-for="(line, index) in dividerAngles"
                :key="`divider-${index}`"
                class="wheel-divider"
                :style="{ transform: `rotate(${line}deg)` }"
                aria-hidden="true"
              ></span>
              <!-- 中奖扇区高亮（随转盘一起转，停下后正好位于顶部紫水晶下方） -->
              <div v-if="winnerGlowStyle" class="wheel-winner-glow" :style="winnerGlowStyle" aria-hidden="true"></div>
              <div
                v-for="entry in sectorLayout"
                :key="entry.sector.id"
                class="wheel-sector-icon"
                :class="{ 'is-jackpot': entry.sector.jackpot, 'is-winner': winnerId === entry.sector.id && !spinning }"
                :style="{ transform: `rotate(${entry.mid}deg) translateY(calc(var(--wheel-size) * -0.285))` }"
                :title="entry.sector.label"
              >
                <img :src="iconUrl(entry.sector.icon)" :alt="entry.sector.label" />
              </div>
            </div>
            <img class="wheel-ring" :src="ringUrl" alt="" aria-hidden="true" />
            <img class="wheel-hub" :src="hubUrl" alt="" aria-hidden="true" />
          </div>

          <!-- 右：结果 + 奖品一览 -->
          <aside class="wheel-side">
            <section class="dg-minigame__block wheel-result-block">
              <div class="dg-minigame__block-title">本次结果</div>
              <div class="wheel-result" :class="{ 'is-jackpot': lastResult?.jackpot }" aria-live="polite">
                <template v-if="spinning">
                  <span class="wheel-result__text">指针飞快地旋转着……</span>
                </template>
                <template v-else-if="lastResult">
                  <img :key="`result-${spinCount}`" :src="iconUrl(lastResult.icon)" alt="" aria-hidden="true" />
                  <span class="wheel-result__text">
                    <small>{{ lastResult.jackpot ? '头奖！' : '转到了' }}</small>
                    {{ lastResult.label }}
                  </span>
                </template>
                <template v-else-if="closed">
                  <span class="wheel-result__text">头奖已被抽走，荷官笑着收起了钱箱。</span>
                </template>
                <template v-else>
                  <span class="wheel-result__text">投币，转动命运之轮。</span>
                </template>
              </div>
            </section>

            <section class="dg-minigame__block wheel-prizes-block">
              <div class="dg-minigame__block-title">奖品一览</div>
              <ul class="wheel-prizes">
                <li
                  v-for="sector in sectors"
                  :key="`legend-${sector.id}`"
                  :class="{ 'is-jackpot': sector.jackpot, 'is-winner': winnerId === sector.id && !spinning }"
                >
                  <img :src="iconUrl(sector.icon)" alt="" aria-hidden="true" />
                  <span>{{ sector.label }}</span>
                </li>
              </ul>
            </section>
          </aside>
        </div>
      </div>

      <footer class="dg-minigame__footer">
        <button type="button" class="dg-skin-btn dg-minigame__cta" :disabled="!canSpin" @click="spin">
          <img :src="coinIcon" alt="" aria-hidden="true" />
          {{ closed ? '转盘已打烊' : spinning ? '转动中…' : `转动 1 次 · ${spinCost}` }}
        </button>
        <button type="button" class="dg-skin-btn-ghost" :disabled="spinning" @click="emit('exit')">离开</button>
        <span v-if="!closed && gold < spinCost && !spinning" class="dg-minigame__warning">金币不足</span>
      </footer>
    </div>
  </div>
</template>

<script setup lang="ts">
import { minigameArtUrl, minigameIconUrl, type MinigameIconKey } from '../../events/minigameAssets';
import { rollWeighted, type WheelSector } from '../../events/minigames';

const props = defineProps<{
  sectors: WheelSector[];
  spinCost: number;
  gold: number;
  /** 本层头奖已被抽走 */
  jackpotTaken: boolean;
  /** 父组件结算中（防止连点） */
  busy?: boolean;
}>();

const emit = defineEmits<{
  spin: [sector: WheelSector];
  exit: [];
}>();

const iconUrl = (key: MinigameIconKey) => minigameIconUrl(key);
const coinIcon = minigameIconUrl('coin');
const ringUrl = minigameArtUrl('wheelRing');
const hubUrl = minigameArtUrl('wheelHub');

const rotation = ref(0);
const spinning = ref(false);
const spinCount = ref(0);
const lastResult = ref<WheelSector | null>(null);
const winnerId = computed(() => lastResult.value?.id ?? '');

/** 扇区一律均分（中奖概率由权重决定，与扇区大小无关） */
const sectorAngle = computed(() => 360 / Math.max(1, props.sectors.length));
const sectorLayout = computed(() =>
  props.sectors.map((sector, index) => ({
    sector,
    start: index * sectorAngle.value,
    mid: (index + 0.5) * sectorAngle.value,
  })),
);
const dividerAngles = computed(() => props.sectors.map((_, index) => index * sectorAngle.value));

/** 扇区底色：紫 / 靛 / 绯红 / 暗紫轮替，头奖为金色 */
const SECTOR_PALETTE = ['#4a2672', '#1d2b5c', '#5c1830', '#32204f', '#3b1c5a'];
const discStyle = computed(() => {
  const step = sectorAngle.value;
  const stops = props.sectors
    .map((sector, index) => {
      const color = sector.jackpot ? '#c8961f' : SECTOR_PALETTE[index % SECTOR_PALETTE.length]!;
      return `${color} ${index * step}deg ${(index + 1) * step}deg`;
    })
    .join(', ');
  return {
    background: `radial-gradient(circle, rgba(255, 235, 190, 0.18) 0%, transparent 22%, rgba(0, 0, 0, 0.35) 100%), conic-gradient(${stops})`,
    transform: `rotate(${rotation.value}deg)`,
    transition: spinning.value ? 'transform 3.6s cubic-bezier(0.15, 0.7, 0.15, 1)' : 'none',
  };
});

/** 停转后用一道光照亮中奖扇区（不再使用指针） */
const winnerGlowStyle = computed(() => {
  const entry = !spinning.value && sectorLayout.value.find(item => item.sector.id === winnerId.value);
  if (!entry) return null;
  const step = sectorAngle.value;
  return {
    background: `conic-gradient(from ${entry.start}deg, rgba(255, 236, 180, 0.34) 0deg ${step}deg, transparent ${step}deg 360deg)`,
  };
});

const closed = computed(() => props.jackpotTaken);
const canSpin = computed(() => !closed.value && !spinning.value && !props.busy && props.gold >= props.spinCost);

const spin = () => {
  if (!canSpin.value) return;
  const result = rollWeighted(props.sectors);
  const entry = sectorLayout.value.find(item => item.sector.id === result.id);
  if (!entry) return;
  // 指针在正上方：把结果扇区的中点转到 0°，并在扇区内留一点随机偏移
  const jitter = (Math.random() - 0.5) * sectorAngle.value * 0.6;
  const target = 360 - (entry.mid + jitter);
  const current = ((rotation.value % 360) + 360) % 360;
  rotation.value += 360 * 6 + ((target - current + 360) % 360);
  spinning.value = true;
  lastResult.value = null;
  window.setTimeout(() => {
    spinning.value = false;
    spinCount.value += 1;
    lastResult.value = result;
    emit('spin', result);
  }, 3700);
};
</script>

<style scoped>
.wheel-minigame {
  --dg-minigame-glow: rgba(80, 30, 110, 0.45);
}

/* 转盘尽量占满主体高度，右侧留出信息栏 */
.wheel-layout {
  --side-width: clamp(15rem, 26cqw, 20rem);
  --wheel-size: min(96cqh, calc(100cqw - var(--side-width) - 3rem));
  display: grid;
  height: 100%;
  align-items: center;
  justify-content: center;
  gap: 2.4rem;
  grid-template-columns: var(--wheel-size) var(--side-width);
}

@media (max-width: 760px) {
  .wheel-layout {
    --wheel-size: min(88cqw, 26rem);
    height: auto;
    grid-template-columns: var(--wheel-size);
    padding: 1rem 0;
  }
}

/* ── 转盘 ── */
.wheel-stage {
  position: relative;
  width: var(--wheel-size);
  height: var(--wheel-size);
}

.wheel-disc {
  position: absolute;
  inset: 6%;
  overflow: hidden;
  border-radius: 50%;
  box-shadow: inset 0 0 28px rgba(0, 0, 0, 0.7), 0 0 30px rgba(140, 70, 220, 0.35);
}

.wheel-divider {
  position: absolute;
  bottom: 50%;
  left: calc(50% - 1px);
  width: 2px;
  height: 50%;
  background: linear-gradient(0deg, rgba(240, 208, 138, 0.2), rgba(240, 208, 138, 0.85));
  transform-origin: 50% 100%;
}

.wheel-sector-icon {
  position: absolute;
  top: calc(50% - var(--wheel-size) * 0.068);
  left: calc(50% - var(--wheel-size) * 0.068);
  width: calc(var(--wheel-size) * 0.136);
  height: calc(var(--wheel-size) * 0.136);
  transform-origin: 50% 50%;
  transition: filter 0.3s ease;
}

.wheel-sector-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: drop-shadow(0 3px 4px rgba(0, 0, 0, 0.75));
}

.wheel-sector-icon.is-jackpot img {
  filter: drop-shadow(0 0 8px rgba(255, 220, 120, 0.85));
}

.wheel-sector-icon.is-winner img {
  animation: wheel-winner-pulse 1s ease-in-out infinite;
}

@keyframes wheel-winner-pulse {
  0%,
  100% {
    filter: drop-shadow(0 0 4px rgba(255, 230, 160, 0.6));
    transform: scale(1);
  }
  50% {
    filter: drop-shadow(0 0 14px rgba(255, 230, 160, 1));
    transform: scale(1.15);
  }
}

.wheel-ring {
  position: absolute;
  inset: -2%;
  width: 104%;
  height: 104%;
  pointer-events: none;
}

.wheel-hub {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 17%;
  height: 17%;
  filter: drop-shadow(0 3px 6px rgba(0, 0, 0, 0.7));
  pointer-events: none;
  transform: translate(-50%, -50%);
}

/* 中奖扇区高亮：缓慢呼吸 */
.wheel-winner-glow {
  position: absolute;
  inset: 0;
  animation: wheel-winner-glow 1.6s ease-in-out infinite;
  mix-blend-mode: screen;
  pointer-events: none;
}

@keyframes wheel-winner-glow {
  0%,
  100% {
    opacity: 0.65;
  }
  50% {
    opacity: 1;
  }
}

.wheel-stage.is-closed .wheel-disc {
  filter: grayscale(0.6) brightness(0.6);
}

/* ── 右侧信息栏 ── */
.wheel-side {
  display: flex;
  max-height: 100%;
  min-height: 0;
  flex-direction: column;
  gap: 0.7rem;
}

.wheel-result {
  display: flex;
  min-height: 3.6rem;
  align-items: center;
  gap: 0.7rem;
  color: var(--dg-text);
  font-size: 0.95rem;
}

.wheel-result img {
  width: 3.4rem;
  height: 3.4rem;
  flex: none;
  animation: dg-minigame-pop 0.4s ease-out both;
  filter: drop-shadow(0 0 8px rgba(255, 220, 150, 0.45));
}

.wheel-result__text {
  display: flex;
  flex-direction: column;
  line-height: 1.35;
}

.wheel-result__text small {
  color: var(--dg-text-muted);
  font-size: 0.75rem;
}

.wheel-result.is-jackpot .wheel-result__text {
  color: var(--dg-gold-bright);
  font-family: var(--dg-font-title);
  font-size: 1.15rem;
  text-shadow: 0 0 10px rgba(255, 210, 120, 0.6);
}

.wheel-prizes-block {
  min-height: 0;
}

.wheel-prizes {
  display: grid;
  gap: 0.15rem;
}

.wheel-prizes li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.12rem 0.4rem 0.12rem 0.15rem;
  border: 1px solid transparent;
  color: var(--dg-text-muted);
  font-size: 0.86rem;
  transition: border-color 0.25s ease, background 0.25s ease;
}

.wheel-prizes li.is-jackpot {
  color: var(--dg-gold-bright);
}

.wheel-prizes li.is-winner {
  border-color: rgba(240, 208, 138, 0.55);
  background: rgba(240, 190, 90, 0.12);
  color: var(--dg-text);
}

.wheel-prizes img {
  width: 1.75rem;
  height: 1.75rem;
  flex: none;
  object-fit: contain;
}

/* 主体较矮时奖品一览改为两列，保证一屏放下 */
@container (max-height: 34rem) {
  .wheel-prizes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .wheel-prizes li {
    font-size: 0.78rem;
  }

  .wheel-prizes img {
    width: 1.45rem;
    height: 1.45rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .wheel-winner-glow,
  .wheel-sector-icon.is-winner img {
    animation: none;
  }
}
</style>
